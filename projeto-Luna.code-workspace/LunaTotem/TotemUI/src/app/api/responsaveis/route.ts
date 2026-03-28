import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import {
  ALLOWED_PAPEIS,
  nextResponsavelId,
  readResponsaveis,
  StoredResponsavel,
  writeResponsaveis,
} from './responsavelStore';

export async function GET() {
  const data = await readResponsaveis();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nome = String(body?.nome || '').trim();
    const cargo = String(body?.cargo || '').trim();
    const papel = body?.papel as StoredResponsavel['papel'];
    const email = String(body?.email || '').trim();
    const telefone = String(body?.telefone || '').trim();
    const observacoes = String(body?.observacoes || '').trim();

    if (!nome) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    if (!cargo) return NextResponse.json({ error: 'Cargo é obrigatório.' }, { status: 400 });
    if (!ALLOWED_PAPEIS.includes(papel)) return NextResponse.json({ error: 'Papel inválido.' }, { status: 400 });
    if (!email) return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });

    const items = await readResponsaveis();
    const exists = items.some((x) => x.email.toLowerCase() === email.toLowerCase());
    if (exists) return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });

    const now = new Date().toISOString();
    const newItem: StoredResponsavel = {
      id: nextResponsavelId(items),
      nome,
      cargo,
      papel,
      email,
      telefone,
      observacoes,
      ativo: true,
      createdAt: now,
      updatedAt: now,
    };

    items.push(newItem);
    await writeResponsaveis(items);

    return NextResponse.json(newItem, { status: 201 });
  } catch (e) {
    console.error('Erro ao criar responsável', e);
    return NextResponse.json({ error: 'Erro interno ao criar responsável.' }, { status: 500 });
  }
}
