import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

import { ALLOWED_PAPEIS, readResponsaveis, writeResponsaveis } from '../responsavelStore';

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

    const body = await request.json();
    const items = await readResponsaveis();
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0) return NextResponse.json({ error: 'Responsável não encontrado.' }, { status: 404 });

    const current = items[idx];
    const next = {
      ...current,
      nome: body?.nome !== undefined ? String(body.nome).trim() : current.nome,
      cargo: body?.cargo !== undefined ? String(body.cargo).trim() : current.cargo,
      papel: body?.papel !== undefined ? body.papel : current.papel,
      email: body?.email !== undefined ? String(body.email).trim() : current.email,
      telefone: body?.telefone !== undefined ? String(body.telefone).trim() : current.telefone,
      observacoes: body?.observacoes !== undefined ? String(body.observacoes).trim() : current.observacoes,
      ativo: body?.ativo !== undefined ? !!body.ativo : current.ativo,
      updatedAt: new Date().toISOString(),
    };

    if (!next.nome) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    if (!next.cargo) return NextResponse.json({ error: 'Cargo é obrigatório.' }, { status: 400 });
    if (!ALLOWED_PAPEIS.includes(next.papel)) return NextResponse.json({ error: 'Papel inválido.' }, { status: 400 });
    if (!next.email) return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });

    const duplicatedEmail = items.some((x) => x.id !== id && x.email.toLowerCase() === next.email.toLowerCase());
    if (duplicatedEmail) return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });

    items[idx] = next;
    await writeResponsaveis(items);

    return NextResponse.json(next);
  } catch (e) {
    console.error('Erro ao atualizar responsável', e);
    return NextResponse.json({ error: 'Erro interno ao atualizar responsável.' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

    const items = await readResponsaveis();
    const filtered = items.filter((x) => x.id !== id);
    if (filtered.length === items.length) {
      return NextResponse.json({ error: 'Responsável não encontrado.' }, { status: 404 });
    }

    await writeResponsaveis(filtered);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Erro ao excluir responsável', e);
    return NextResponse.json({ error: 'Erro interno ao excluir responsável.' }, { status: 500 });
  }
}
