import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { buildTargetUrlFromRequest, getTotemApiBaseUrl, proxyTo } from '../_proxy';

import {
  createPatientId,
  normalizeCpf,
  normalizePhone,
  PatientRecord,
  readPatients,
  writePatients,
} from './patientStore';

function sanitizePatient(patient: PatientRecord) {
  const { createdAt, updatedAt, ...rest } = patient;
  return rest;
}

function sanitizePatients(list: PatientRecord[]) {
  return list.map(sanitizePatient);
}

export async function GET(request: Request) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
  }
  const patients = await readPatients();
  return NextResponse.json(sanitizePatients(patients));
}

export async function POST(request: Request) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
  }
  try {
    const body = await request.json();
    const name = String(body?.name ?? '').trim();
    const cpfDigits = normalizeCpf(String(body?.cpf ?? ''));
    const phoneDigits = normalizePhone(String(body?.phone ?? ''));
    const email = body?.email ? String(body.email).trim() : undefined;
    const birthDate = body?.birthDate ? String(body.birthDate).trim() : undefined;
    const address = body?.address ? String(body.address).trim() : undefined;
    const healthPlan = body?.healthPlan ? String(body.healthPlan).trim() : undefined;
    const notes = body?.notes ? String(body.notes).trim() : undefined;
    const lastVisit = body?.lastVisit ? String(body.lastVisit).trim() : undefined;
    const nextAppointment = body?.nextAppointment ? String(body.nextAppointment).trim() : undefined;

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    }
    if (cpfDigits.length !== 11) {
      return NextResponse.json({ error: 'CPF deve conter 11 dígitos.' }, { status: 400 });
    }
    if (phoneDigits.length < 10) {
      return NextResponse.json({ error: 'Telefone inválido.' }, { status: 400 });
    }

    const patients = await readPatients();
    if (patients.some((patient) => patient.cpf === cpfDigits)) {
      return NextResponse.json({ error: 'CPF já cadastrado.' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const newPatient: PatientRecord = {
      id: createPatientId(),
      name,
      cpf: cpfDigits,
      phone: phoneDigits,
      email,
      birthDate,
      address,
      healthPlan,
      notes,
      lastVisit: lastVisit || '-',
      nextAppointment: nextAppointment || '-',
      createdAt: now,
      updatedAt: now,
    };

    patients.push(newPatient);
    await writePatients(patients);

    return NextResponse.json(sanitizePatient(newPatient), { status: 201 });
  } catch (error) {
    console.error('Erro ao criar paciente', error);
    return NextResponse.json({ error: 'Erro interno ao criar paciente.' }, { status: 500 });
  }
}
