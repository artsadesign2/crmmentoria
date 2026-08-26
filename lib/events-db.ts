import { queryNeon } from './neon-db';
import { EventItem, MOCK_EVENTS } from './mock-data';

export interface DbEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  endDate?: string;
  time?: string;
  attendeesCount: number;
  maxAttendees: number;
  ticketPrice: number;
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
  bannerImage?: string;
  confirmedMembers?: string[]; // Array of member IDs
  createdAt?: string;
}

let cachedEventsData: { data: DbEvent[]; timestamp: number } | null = null;
const EVENTS_CACHE_TTL_MS = 25000;

export function invalidateEventsCache() {
  cachedEventsData = null;
}

let tableInitChecked = false;

export async function ensureEventsTable() {
  if (tableInitChecked) return;
  try {
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(100) PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        event_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ,
        time_info VARCHAR(50),
        attendees_count INTEGER DEFAULT 0,
        max_attendees INTEGER DEFAULT 100,
        ticket_price NUMERIC(12,2) DEFAULT 0,
        status VARCHAR(30) DEFAULT 'UPCOMING',
        banner_image TEXT,
        confirmed_members TEXT DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    tableInitChecked = true;
  } catch (err) {
    console.error('Error ensuring events table:', err);
  }
}

export async function fetchAllEventsFromDb(): Promise<DbEvent[]> {
  if (cachedEventsData && Date.now() - cachedEventsData.timestamp < EVENTS_CACHE_TTL_MS) {
    return cachedEventsData.data;
  }

  await ensureEventsTable();

  try {
    const rows = await queryNeon<any>(`
      SELECT 
        id,
        title,
        description,
        location,
        event_date as "date",
        end_date as "endDate",
        time_info as "time",
        attendees_count as "attendeesCount",
        max_attendees as "maxAttendees",
        ticket_price::FLOAT as "ticketPrice",
        status,
        banner_image as "bannerImage",
        confirmed_members as "confirmedMembers",
        created_at as "createdAt"
      FROM events
      ORDER BY event_date ASC
    `);

    if (rows && rows.length > 0) {
      const mapped: DbEvent[] = rows.map((r: any) => {
        let confMembers: string[] = [];
        try {
          if (r.confirmedMembers) {
            confMembers = typeof r.confirmedMembers === 'string' ? JSON.parse(r.confirmedMembers) : r.confirmedMembers;
          }
        } catch (e) {}

        return {
          id: r.id,
          title: r.title,
          description: r.description || '',
          location: r.location || 'Online / Ao Vivo',
          date: r.date ? new Date(r.date).toISOString().split('T')[0] : '2026-09-01',
          endDate: r.endDate ? new Date(r.endDate).toISOString().split('T')[0] : undefined,
          time: r.time || '19:00',
          attendeesCount: confMembers.length || r.attendeesCount || 0,
          maxAttendees: r.maxAttendees || 100,
          ticketPrice: typeof r.ticketPrice === 'number' ? r.ticketPrice : 0,
          status: (['UPCOMING', 'LIVE', 'FINISHED'].includes(r.status) ? r.status : 'UPCOMING') as any,
          bannerImage: r.bannerImage || undefined,
          confirmedMembers: confMembers,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        };
      });

      cachedEventsData = {
        data: mapped,
        timestamp: Date.now(),
      };
      return mapped;
    }
  } catch (err) {
    console.error('Failed to fetch events from DB:', err);
  }

  const fallback: DbEvent[] = MOCK_EVENTS.map((e: any) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    date: e.date,
    time: e.time || '19:00',
    attendeesCount: e.attendeesCount || 0,
    maxAttendees: e.maxAttendees || 100,
    ticketPrice: typeof e.ticketPrice === 'number' ? e.ticketPrice : e.price || 0,
    status: e.status || 'UPCOMING',
    bannerImage: e.bannerImage || e.coverImage,
    confirmedMembers: [],
  }));

  return fallback;
}

export async function createEventInDb(data: Partial<DbEvent>): Promise<DbEvent> {
  await ensureEventsTable();
  const id = data.id || `event-${Date.now()}`;
  const title = data.title || 'Novo Encontro Rocket Club';
  const description = data.description || '';
  const location = data.location || 'São Paulo / SP';
  const eventDate = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
  const endDate = data.endDate ? new Date(data.endDate).toISOString() : null;
  const timeInfo = data.time || '19:00';
  const maxAttendees = data.maxAttendees || 100;
  const ticketPrice = data.ticketPrice || 0;
  const status = data.status || 'UPCOMING';
  const bannerImage = data.bannerImage || null;
  const confirmedMembers = JSON.stringify(data.confirmedMembers || []);

  await queryNeon(
    `
    INSERT INTO events (
      id, title, description, location, event_date, end_date, time_info,
      attendees_count, max_attendees, ticket_price, status, banner_image, confirmed_members
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10, $11, $12)
  `,
    [
      id,
      title,
      description,
      location,
      eventDate,
      endDate,
      timeInfo,
      maxAttendees,
      ticketPrice,
      status,
      bannerImage,
      confirmedMembers,
    ]
  );

  invalidateEventsCache();

  return {
    id,
    title,
    description,
    location,
    date: eventDate.split('T')[0],
    time: timeInfo,
    attendeesCount: 0,
    maxAttendees,
    ticketPrice,
    status,
    bannerImage: bannerImage || undefined,
    confirmedMembers: [],
  };
}

export async function toggleEventConfirmation(eventId: string, memberId: string): Promise<string[]> {
  await ensureEventsTable();
  const rows = await queryNeon<any>(`SELECT confirmed_members FROM events WHERE id = $1`, [eventId]);
  let list: string[] = [];
  if (rows && rows.length > 0 && rows[0].confirmed_members) {
    try {
      list = JSON.parse(rows[0].confirmed_members);
    } catch (e) {}
  }

  if (list.includes(memberId)) {
    list = list.filter((id) => id !== memberId);
  } else {
    list.push(memberId);
  }

  await queryNeon(
    `UPDATE events 
     SET confirmed_members = $2, attendees_count = $3 
     WHERE id = $1`,
    [eventId, JSON.stringify(list), list.length]
  );

  invalidateEventsCache();
  return list;
}

export async function deleteEventFromDb(id: string) {
  await ensureEventsTable();
  await queryNeon(`DELETE FROM events WHERE id = $1`, [id]);
  invalidateEventsCache();
}
