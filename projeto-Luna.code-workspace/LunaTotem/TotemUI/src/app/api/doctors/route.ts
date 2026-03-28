export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { Doctor } from '@/lib/api';
import { buildTargetUrlFromRequest, getTotemApiBaseUrl, proxyTo } from '../_proxy';
import { createDoctorId, readDoctors, writeDoctors } from './doctorStore';

export async function GET(request: Request) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
  }
  const doctors = await readDoctors();
  return NextResponse.json(doctors);
}

export async function POST(request: Request) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
  }
  try {
    const payload = (await request.json()) as Partial<Doctor>;
    const name = String(payload.name ?? '').trim();
    const specialty = String(payload.specialty ?? '').trim();
    const email = String(payload.email ?? '').trim();
    const phone = String(payload.phone ?? '').trim();
    const crm = String(payload.crm ?? '').trim();
    const availability = payload.availability ? String(payload.availability).trim() : undefined;

    if (!name || !specialty || !email || !phone || !crm) {
      return NextResponse.json({ error: 'Preencha nome, especialidade, e-mail, telefone e CRM.' }, { status: 400 });
    }

    const doctors = await readDoctors();
    if (doctors.some((doc) => doc.crm.toUpperCase() === crm.toUpperCase())) {
      return NextResponse.json({ error: 'CRM já cadastrado.' }, { status: 409 });
    }

    const newDoctor: Doctor = {
      id: createDoctorId(),
      name,
      specialty,
      email,
      phone,
      crm,
      availability,
    };

    doctors.push(newDoctor);
    await writeDoctors(doctors);

    return NextResponse.json(newDoctor, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar médico', error);
    return NextResponse.json({ error: 'Erro interno ao criar médico.' }, { status: 500 });
  }
}
