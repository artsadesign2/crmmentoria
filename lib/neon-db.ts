const NEON_HOST = process.env.NEON_HOST || '';
const NEON_USER = process.env.NEON_USER || '';
const NEON_PASS = process.env.NEON_PASS || '';
const NEON_DB = process.env.NEON_DB || 'neondb';

const NEON_CONN_STRING = NEON_HOST && NEON_USER
  ? `postgresql://${NEON_USER}:${encodeURIComponent(NEON_PASS)}@${NEON_HOST}/${NEON_DB}?sslmode=require`
  : '';

// High-speed In-Memory Server-Side Caching
let cachedMembers: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 30000; // 30 seconds TTL

export function invalidateMembersCache() {
  cachedMembers = null;
}

export async function queryNeon<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (!NEON_HOST || !NEON_USER) {
    return [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s fast timeout

    const response = await fetch(`https://${NEON_HOST}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Neon-Connection-String': NEON_CONN_STRING,
      },
      body: JSON.stringify({
        query: sql,
        params: params.map((v) => (v === null ? null : typeof v === 'number' || typeof v === 'boolean' ? v : String(v))),
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error('Neon DB Query Error:', errText);
      return [];
    }

    const data = await response.json();
    if (data.error) {
      console.error('Neon DB Error Payload:', data.error);
      return [];
    }

    if (!data.rows) return [];
    return data.rows as T[];
  } catch (error) {
    console.error('Neon DB HTTP fetch failed or timed out:', error);
    return [];
  }
}

export async function fetchAllMembersFromDb() {
  if (cachedMembers && Date.now() - cachedMembers.timestamp < CACHE_TTL_MS) {
    return cachedMembers.data;
  }

  const rawMembers = await queryNeon<any>(
    `SELECT 
      id, 
      name, 
      specialty, 
      status, 
      cover_image as "coverImage",
      last_contact as "lastContact", 
      notes, 
      position, 
      email, 
      phone, 
      instagram,
      linkedin,
      website,
      age,
      birthdate,
      birthplace,
      residence,
      nationality,
      marital_status as "maritalStatus",
      cpf,
      rg,
      professional_register as "professionalRegister",
      company_name as "companyName", 
      trade_name as "tradeName",
      cnpj,
      register_pj as "registerPj",
      municipal_register as "municipalRegister",
      commercial_address as "commercialAddress",
      monthly_revenue as "monthlyRevenue", 
      professional_experience as "professionalExperience",
      work_locations as "workLocations",
      work_description_hours as "workDescriptionHours",
      main_goal as "mainGoal",
      biggest_challenge as "biggestChallenge",
      mentorship_interest as "mentorshipInterest",
      weekly_availability as "weeklyAvailability",
      how_did_you_find_us as "howDidYouFindUs",
      content_consumption as "contentConsumption",
      sports_info as "sportsInfo",
      hobbies,
      interests,
      spouse_info as "spouseInfo",
      children_info as "childrenInfo",
      pets_info as "petsInfo",
      emergency_contact as "emergencyContact",
      exclude_from_book as "excludeFromBook"
     FROM members 
     ORDER BY position ASC, name ASC`
  );

  if (!rawMembers || rawMembers.length === 0) return [];

  const mapped = rawMembers.map((m: any) => {
    let mappedStatus: 'cinza' | 'azul' | 'verde' | 'amarelo' | 'vermelha' = 'cinza';
    const s = (m.status || '').toLowerCase();
    if (s.includes('azul') || s.includes('iniciant')) mappedStatus = 'azul';
    else if (s.includes('verd') || s.includes('engajad') || s.includes('ouro') || s.includes('diamant')) mappedStatus = 'verde';
    else if (s.includes('amarel') || s.includes('morn')) mappedStatus = 'amarelo';
    else if (s.includes('vermelh') || s.includes('urgent')) mappedStatus = 'vermelha';
    else mappedStatus = 'cinza';

    return {
      id: m.id || `m-${Math.random()}`,
      name: m.name || 'Mentorado Sem Nome',
      specialty: m.specialty || 'Especialista / Empresário',
      status: mappedStatus,
      coverImage: m.coverImage || null,
      lastContact: m.lastContact ? String(m.lastContact).split('T')[0] : '2026-08-10',
      notes: m.notes || 'Tripulante cadastrado na comunidade Rocket Club.',
      email: m.email || 'contato@mentorados.com.br',
      phone: m.phone || '(11) 99999-0000',
      instagram: m.instagram || '',
      linkedin: m.linkedin || '',
      website: m.website || '',
      age: m.age || '',
      birthdate: m.birthdate ? String(m.birthdate).split('T')[0] : '',
      birthplace: m.birthplace || '',
      residence: m.residence || '',
      nationality: m.nationality || 'Brasileiro',
      maritalStatus: m.maritalStatus || '',
      cpf: m.cpf || '',
      rg: m.rg || '',
      professionalRegister: m.professionalRegister || '',
      companyName: m.companyName || 'Empresa Própria',
      tradeName: m.tradeName || '',
      cnpj: m.cnpj || '',
      registerPj: m.registerPj || '',
      municipalRegister: m.municipalRegister || '',
      commercialAddress: m.commercialAddress || '',
      monthlyRevenue: m.monthlyRevenue || 'Sob Consulta',
      professionalExperience: m.professionalExperience || '',
      workLocations: m.workLocations || '',
      workDescriptionHours: m.workDescriptionHours || '',
      mainGoal: m.mainGoal || 'Escalar faturamento e equipe',
      biggestChallenge: m.biggestChallenge || '',
      mentorshipInterest: m.mentorshipInterest || '',
      weeklyAvailability: m.weeklyAvailability || '',
      howDidYouFindUs: m.howDidYouFindUs || '',
      contentConsumption: m.contentConsumption || '',
      sportsInfo: m.sportsInfo || '',
      hobbies: m.hobbies || '',
      interests: m.interests || '',
      spouseInfo: m.spouseInfo || '',
      childrenInfo: m.childrenInfo || '',
      petsInfo: m.petsInfo || '',
      emergencyContact: m.emergencyContact || '',
      excludeFromBook: Boolean(m.excludeFromBook),
      position: m.position || 0,
    };
  });

  cachedMembers = {
    data: mapped,
    timestamp: Date.now(),
  };

  return mapped;
}

export async function fetchAllCoursesFromDb() {
  const courses = await queryNeon<any>(`SELECT * FROM academy_courses ORDER BY position ASC, created_at DESC`);
  if (!courses || courses.length === 0) return null;
  return courses.map((c: any) => ({
    id: c.id,
    title: c.title,
    description: c.description || 'Curso exclusivo da Rocket Academy',
    category: c.category || 'Geral',
    level: c.level || 'Geral',
    lessonsCount: 12,
    durationMinutes: 240,
    coverImage: c.cover_image || 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
    progressPercent: 50,
  }));
}

export async function fetchAllArticlesFromDb() {
  const articles = await queryNeon<any>(`SELECT * FROM wiki_articles ORDER BY created_at DESC`);
  if (!articles || articles.length === 0) return null;
  return articles.map((a: any) => ({
    id: a.id,
    title: a.title,
    summary: a.summary || 'Resumo do artigo...',
    content: a.content || 'Conteúdo do artigo...',
    category: a.category || 'Geral',
    department: 'Geral',
    viewsCount: a.views_count || 0,
    createdAt: a.created_at ? String(a.created_at).split('T')[0] : '2026-08-01',
    author: 'Comandante Master',
  }));
}
