import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { buildTargetUrlFromRequest, getTotemApiBaseUrl, proxyTo } from '../../_proxy';
import {
  ALLOWED_ROLES,
  normalizeCpf,
  readUsers,
  sanitizeUser,
  StoredUser,
  writeUsers,
} from '../userStore';

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_: Request, { params }: Params) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(_, buildTargetUrlFromRequest(_, baseUrl));
  }
  const id = Number(params.id);
  const users = await readUsers();
  const user = users.find((item) => item.id === id);
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }
  return NextResponse.json(sanitizeUser(user));
}

export async function PUT(request: Request, { params }: Params) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
  }
  const id = Number(params.id);
  const payload = await request.json();
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === id);
  if (index === -1) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }

  const current = users[index];
  const nextEmail = 'email' in payload ? String(payload.email || '').trim() : current.email;
  const nextCpf = 'cpf' in payload ? normalizeCpf(String(payload.cpf || '')) : current.cpf;
  const nextRole = (payload.role ?? current.role) as StoredUser['role'];
  const passwordInput =
    'password' in payload ? String(payload.password || '').trim() : undefined;

  if (!nextEmail) {
    return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
  }
  if (nextCpf.length !== 11) {
    return NextResponse.json({ error: 'CPF deve conter 11 dígitos.' }, { status: 400 });
  }
  if (!ALLOWED_ROLES.includes(nextRole)) {
    return NextResponse.json({ error: 'Perfil inválido.' }, { status: 400 });
  }

  const normalizedEmail = nextEmail.toLowerCase();
  if (
    users.some(
      (user, idx) => idx !== index && user.email.toLowerCase() === normalizedEmail,
    )
  ) {
    return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });
  }
  if (users.some((user, idx) => idx !== index && user.cpf === nextCpf)) {
    return NextResponse.json({ error: 'CPF já cadastrado.' }, { status: 409 });
  }

  const updated: StoredUser = {
    ...current,
    email: nextEmail,
    cpf: nextCpf,
    role: nextRole,
    updatedAt: new Date().toISOString(),
    password: passwordInput !== undefined && passwordInput !== '' ? passwordInput : current.password,
  };

  users[index] = updated;
  await writeUsers(users);

  return NextResponse.json(sanitizeUser(updated));
}

export async function DELETE(_: Request, { params }: Params) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(_, buildTargetUrlFromRequest(_, baseUrl));
  }
  const id = Number(params.id);
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === id);
  if (index === -1) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }
  users.splice(index, 1);
  await writeUsers(users);
  return NextResponse.json({ success: true });
}
