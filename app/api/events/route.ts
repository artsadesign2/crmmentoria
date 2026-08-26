import { NextResponse } from 'next/server';
import {
  fetchAllEventsFromDb,
  createEventInDb,
  toggleEventConfirmation,
  deleteEventFromDb,
} from '@/lib/events-db';

export async function GET() {
  try {
    const events = await fetchAllEventsFromDb();
    return NextResponse.json({
      ok: true,
      events,
    });
  } catch (error: any) {
    console.error('Error in GET /api/events:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'Dados inválidos' }, { status: 400 });
    }

    const { action, eventId, memberId } = body;

    // Toggle RSVP / Presença
    if (action === 'toggle_rsvp' && eventId && memberId) {
      const updatedList = await toggleEventConfirmation(eventId, memberId);
      return NextResponse.json({
        ok: true,
        confirmedMembers: updatedList,
      });
    }

    const {
      title,
      description,
      location,
      date,
      time,
      maxAttendees,
      ticketPrice,
      status,
      bannerImage,
    } = body;

    if (!title || !date) {
      return NextResponse.json({ ok: false, error: 'Título e data são obrigatórios' }, { status: 400 });
    }

    const event = await createEventInDb({
      title,
      description,
      location,
      date,
      time,
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : 100,
      ticketPrice: ticketPrice ? parseFloat(ticketPrice) : 0,
      status: status || 'UPCOMING',
      bannerImage,
    });

    return NextResponse.json({
      ok: true,
      event,
      message: 'Evento cadastrado com sucesso!',
    });
  } catch (error: any) {
    console.error('Error in POST /api/events:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID do evento é obrigatório' }, { status: 400 });
    }

    await deleteEventFromDb(id);

    return NextResponse.json({
      ok: true,
      message: 'Evento excluído com sucesso!',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/events:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
