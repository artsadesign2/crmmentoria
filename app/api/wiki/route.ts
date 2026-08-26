import { NextResponse } from 'next/server';
import { queryNeon, fetchAllArticlesFromDb } from '@/lib/neon-db';
import { MOCK_ARTICLES } from '@/lib/mock-data';

export async function GET() {
  try {
    const dbArticles = await fetchAllArticlesFromDb();
    if (dbArticles && dbArticles.length > 0) {
      return NextResponse.json({
        ok: true,
        articles: dbArticles,
      });
    }
  } catch (err) {
    console.error('Error fetching articles:', err);
  }

  return NextResponse.json({
    ok: true,
    articles: MOCK_ARTICLES,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, summary, content, category = 'Geral', department = 'Geral' } = body;

    if (!title || !content) {
      return NextResponse.json({ ok: false, error: 'Título e conteúdo são obrigatórios' }, { status: 400 });
    }

    const id = `art-${Date.now()}`;
    await queryNeon(
      `
      INSERT INTO wiki_articles (id, title, summary, content, category, views_count, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 0, NOW(), NOW())
    `,
      [id, title, summary || '', content, category]
    );

    return NextResponse.json({
      ok: true,
      article: {
        id,
        title,
        summary,
        content,
        category,
        department,
        viewsCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
        author: 'Comandante Master',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
