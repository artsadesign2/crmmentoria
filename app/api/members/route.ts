import { NextResponse } from 'next/server';
import { fetchAllMembersFromDb, queryNeon, invalidateMembersCache } from '@/lib/neon-db';
import { INITIAL_MEMBERS } from '@/lib/mock-data';

function sanitizeStr(val: any, maxLength = 500): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str) return null;
  return str.slice(0, maxLength);
}

export async function GET() {
  try {
    const dbMembers = await fetchAllMembersFromDb();
    if (dbMembers && dbMembers.length > 0) {
      return NextResponse.json(
        {
          ok: true,
          source: 'neon_postgres',
          members: dbMembers,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45',
          },
        }
      );
    }
  } catch (error) {
    console.error('Failed to fetch members from Neon DB, falling back to mock data:', error);
  }

  return NextResponse.json({
    ok: true,
    source: 'mock',
    members: INITIAL_MEMBERS,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'Corpo da requisição inválido' }, { status: 400 });
    }

    const name = sanitizeStr(body.name, 150);
    if (!name) {
      return NextResponse.json({ ok: false, error: 'Nome do mentorado é obrigatório' }, { status: 400 });
    }

    const {
      specialty,
      status,
      email,
      phone,
      companyName,
      tradeName,
      cnpj,
      professionalRegister,
      commercialAddress,
      monthlyRevenue,
      mainGoal,
      biggestChallenge,
      mentorshipInterest,
      weeklyAvailability,
      notes,
      instagram,
      linkedin,
      website,
      age,
      birthdate,
      birthplace,
      residence,
      nationality,
      maritalStatus,
      cpf,
      rg,
      sportsInfo,
      hobbies,
      spouseInfo,
      childrenInfo,
      emergencyContact,
      coverImage,
    } = body;

    const query = `
      INSERT INTO members (
        name, specialty, status, email, phone, company_name, trade_name, cnpj,
        professional_register, commercial_address, monthly_revenue, main_goal,
        biggest_challenge, mentorship_interest, weekly_availability, notes,
        instagram, linkedin, website, age, birthdate, birthplace, residence,
        nationality, marital_status, cpf, rg, sports_info, hobbies, spouse_info,
        children_info, emergency_contact, cover_image, position
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, 0
      )
      RETURNING id, name, specialty, status, email, phone, company_name as "companyName", monthly_revenue as "monthlyRevenue"
    `;

    const inserted = await queryNeon(query, [
      name,
      specialty || 'Empresário / Mentorado',
      status || 'cinza',
      email || 'contato@cliente.com',
      phone || '(11) 99999-0000',
      companyName || 'Empresa Própria',
      tradeName || null,
      cnpj || null,
      professionalRegister || null,
      commercialAddress || null,
      monthlyRevenue || 'R$ 50.000,00',
      mainGoal || 'Escalar faturamento',
      biggestChallenge || null,
      mentorshipInterest || null,
      weeklyAvailability || null,
      notes || 'Adicionado via Next.js SaaS',
      instagram || null,
      linkedin || null,
      website || null,
      age || null,
      birthdate || null,
      birthplace || null,
      residence || null,
      nationality || 'Brasileiro',
      maritalStatus || null,
      cpf || null,
      rg || null,
      sportsInfo || null,
      hobbies || null,
      spouseInfo || null,
      childrenInfo || null,
      emergencyContact || null,
      coverImage || null,
    ]);

    invalidateMembersCache();

    return NextResponse.json({
      ok: true,
      member: inserted[0] || body,
      message: 'Mentorado salvo no banco com sucesso!',
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      specialty,
      status,
      email,
      phone,
      companyName,
      tradeName,
      cnpj,
      registerPj,
      municipalRegister,
      professionalRegister,
      commercialAddress,
      professionalExperience,
      workLocations,
      workDescriptionHours,
      monthlyRevenue,
      mainGoal,
      biggestChallenge,
      mentorshipInterest,
      weeklyAvailability,
      howDidYouFindUs,
      contentConsumption,
      notes,
      instagram,
      linkedin,
      website,
      age,
      birthdate,
      birthplace,
      residence,
      nationality,
      maritalStatus,
      cpf,
      rg,
      sportsInfo,
      hobbies,
      interests,
      spouseInfo,
      childrenInfo,
      petsInfo,
      emergencyContact,
      coverImage,
      position,
      excludeFromBook,
    } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID do membro é obrigatório' }, { status: 400 });
    }

    const query = `
      UPDATE members
      SET 
        name = COALESCE($2::TEXT, name),
        specialty = COALESCE($3::TEXT, specialty),
        status = COALESCE($4::TEXT, status),
        email = COALESCE($5::TEXT, email),
        phone = COALESCE($6::TEXT, phone),
        company_name = COALESCE($7::TEXT, company_name),
        trade_name = COALESCE($8::TEXT, trade_name),
        cnpj = COALESCE($9::TEXT, cnpj),
        register_pj = COALESCE($10::TEXT, register_pj),
        municipal_register = COALESCE($11::TEXT, municipal_register),
        professional_register = COALESCE($12::TEXT, professional_register),
        commercial_address = COALESCE($13::TEXT, commercial_address),
        professional_experience = COALESCE($14::TEXT, professional_experience),
        work_locations = COALESCE($15::TEXT, work_locations),
        work_description_hours = COALESCE($16::TEXT, work_description_hours),
        monthly_revenue = COALESCE($17::TEXT, monthly_revenue),
        main_goal = COALESCE($18::TEXT, main_goal),
        biggest_challenge = COALESCE($19::TEXT, biggest_challenge),
        mentorship_interest = COALESCE($20::TEXT, mentorship_interest),
        weekly_availability = COALESCE($21::TEXT, weekly_availability),
        how_did_you_find_us = COALESCE($22::TEXT, how_did_you_find_us),
        content_consumption = COALESCE($23::TEXT, content_consumption),
        notes = COALESCE($24::TEXT, notes),
        instagram = COALESCE($25::TEXT, instagram),
        linkedin = COALESCE($26::TEXT, linkedin),
        website = COALESCE($27::TEXT, website),
        age = COALESCE($28::TEXT, age),
        birthdate = CASE WHEN ($29::TEXT) IS NOT NULL AND ($29::TEXT) != '' THEN ($29::DATE) ELSE birthdate END,
        birthplace = COALESCE($30::TEXT, birthplace),
        residence = COALESCE($31::TEXT, residence),
        nationality = COALESCE($32::TEXT, nationality),
        marital_status = COALESCE($33::TEXT, marital_status),
        cpf = COALESCE($34::TEXT, cpf),
        rg = COALESCE($35::TEXT, rg),
        sports_info = COALESCE($36::TEXT, sports_info),
        hobbies = COALESCE($37::TEXT, hobbies),
        interests = COALESCE($38::TEXT, interests),
        spouse_info = COALESCE($39::TEXT, spouse_info),
        children_info = COALESCE($40::TEXT, children_info),
        pets_info = COALESCE($41::TEXT, pets_info),
        emergency_contact = COALESCE($42::TEXT, emergency_contact),
        cover_image = COALESCE($43::TEXT, cover_image),
        position = COALESCE($44::INTEGER, position),
        exclude_from_book = COALESCE($45::BOOLEAN, exclude_from_book),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const updated = await queryNeon(query, [
      id,
      name ?? null,
      specialty ?? null,
      status ?? null,
      email ?? null,
      phone ?? null,
      companyName ?? null,
      tradeName ?? null,
      cnpj ?? null,
      registerPj ?? null,
      municipalRegister ?? null,
      professionalRegister ?? null,
      commercialAddress ?? null,
      professionalExperience ?? null,
      workLocations ?? null,
      workDescriptionHours ?? null,
      monthlyRevenue ?? null,
      mainGoal ?? null,
      biggestChallenge ?? null,
      mentorshipInterest ?? null,
      weeklyAvailability ?? null,
      howDidYouFindUs ?? null,
      contentConsumption ?? null,
      notes ?? null,
      instagram ?? null,
      linkedin ?? null,
      website ?? null,
      age ?? null,
      birthdate && birthdate.trim() !== '' ? birthdate.split('T')[0] : null,
      birthplace ?? null,
      residence ?? null,
      nationality ?? null,
      maritalStatus ?? null,
      cpf ?? null,
      rg ?? null,
      sportsInfo ?? null,
      hobbies ?? null,
      interests ?? null,
      spouseInfo ?? null,
      childrenInfo ?? null,
      petsInfo ?? null,
      emergencyContact ?? null,
      coverImage ?? null,
      typeof position === 'number' ? position : null,
      typeof excludeFromBook === 'boolean' ? excludeFromBook : null,
    ]);

    invalidateMembersCache();

    return NextResponse.json({
      ok: true,
      member: updated[0] || body,
      message: 'Mentorado atualizado com sucesso!',
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID é obrigatório' }, { status: 400 });
    }

    await queryNeon('DELETE FROM members WHERE id = $1', [id]);
    invalidateMembersCache();

    return NextResponse.json({
      ok: true,
      message: 'Mentorado excluído do banco com sucesso!',
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}
