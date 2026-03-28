import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { buildTargetUrlFromRequest, getTotemApiBaseUrl, proxyTo } from '../_proxy';
import {
  ALLOWED_ROLES,
  normalizeCpf,
  readUsers,
  sanitizeUser,
  sanitizeUsers,
  StoredUser,
  writeUsers,
  nextUserId,
} from './userStore';

export async function GET(request: Request) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
  }
  const users = await readUsers();
  return NextResponse.json(sanitizeUsers(users));
}

export async function POST(request: Request) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
  }
  try {
    const body = await request.json();
    const email = (body?.email ?? '').trim();
    const cpfDigits = normalizeCpf(body?.cpf ?? '');
    const role = body?.role as StoredUser['role'];
    const password = (body?.password ?? '').trim();

    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
    }
    if (cpfDigits.length !== 11) {
      return NextResponse.json({ error: 'CPF deve conter 11 dígitos.' }, { status: 400 });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Perfil inválido.' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Senha inicial é obrigatória.' }, { status: 400 });
    }

    const users = await readUsers();
    const normalizedEmail = email.toLowerCase();
    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });
    }
    if (users.some((user) => user.cpf === cpfDigits)) {
      return NextResponse.json({ error: 'CPF já cadastrado.' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const newUser: StoredUser = {
      id: nextUserId(users),
      email,
      cpf: cpfDigits,
      role,
      password,
      createdAt: now,
      updatedAt: now,
    };

    users.push(newUser);
    await writeUsers(users);

    return NextResponse.json(sanitizeUser(newUser), { status: 201 });
  } catch (error) {
    console.error('Erro ao criar usuário', error);
    return NextResponse.json({ error: 'Erro interno ao criar usuário.' }, { status: 500 });
  }
}
