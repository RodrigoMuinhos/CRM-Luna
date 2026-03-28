export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { Doctor } from '@/lib/api';
import { buildTargetUrlFromRequest, getTotemApiBaseUrl, proxyTo } from '../../_proxy';
import { readDoctors, writeDoctors } from '../doctorStore';

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(_, buildTargetUrlFromRequest(_, baseUrl));
  }
  const doctors = await readDoctors();
  const doctor = doctors.find((doc) => doc.id === params.id);
  if (!doctor) {
    return NextResponse.json({ error: 'Médico não encontrado.' }, { status: 404 });
  }
  return NextResponse.json(doctor);
}

export async function PUT(request: Request, { params }: Params) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
  }
  try {
    const payload = (await request.json()) as Partial<Doctor>;
    const doctors = await readDoctors();
    const index = doctors.findIndex((doc) => doc.id === params.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Médico não encontrado.' }, { status: 404 });
    }

    const current = doctors[index];
    const nextName = payload.name ? String(payload.name).trim() : current.name;
    const nextSpecialty = payload.specialty ? String(payload.specialty).trim() : current.specialty;
    const nextEmail = payload.email ? String(payload.email).trim() : current.email;
    const nextPhone = payload.phone ? String(payload.phone).trim() : current.phone;
    const nextCrm = payload.crm ? String(payload.crm).trim() : current.crm;
    const nextAvailability =
      'availability' in payload ? String(payload.availability || '').trim() : current.availability;

    if (!nextName || !nextSpecialty || !nextEmail || !nextPhone || !nextCrm) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    if (
      doctors.some(
        (doc, idx) => idx !== index && doc.crm.toUpperCase() === nextCrm.toUpperCase(),
      )
    ) {
      return NextResponse.json({ error: 'CRM já cadastrado.' }, { status: 409 });
    }

    const updated: Doctor = {
      ...current,
      name: nextName,
      specialty: nextSpecialty,
      email: nextEmail,
      phone: nextPhone,
      crm: nextCrm,
      availability: nextAvailability,
    };

    doctors[index] = updated;
    await writeDoctors(doctors);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar médico', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar médico.' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(_, buildTargetUrlFromRequest(_, baseUrl));
  }
  const doctors = await readDoctors();
  const index = doctors.findIndex((doc) => doc.id === params.id);
  if (index === -1) {
    return NextResponse.json({ error: 'Médico não encontrado.' }, { status: 404 });
  }
  doctors.splice(index, 1);
  await writeDoctors(doctors);
  return NextResponse.json({ success: true });
}
