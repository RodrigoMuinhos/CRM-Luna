import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { buildTargetUrlFromRequest, getTotemApiBaseUrl, proxyTo } from '../../_proxy';

import {
  normalizeCpf,
  normalizePhone,
  PatientRecord,
  readPatients,
  writePatients,
} from '../../patients/patientStore';

type Params = {
  params: {
    id: string;
  };
};

function sanitize(patient: PatientRecord) {
  const { createdAt, updatedAt, ...rest } = patient;
  return rest;
}

export async function GET(_: Request, { params }: Params) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    // Use the incoming request URL for correct path + query.
    return proxyTo(_, buildTargetUrlFromRequest(_, baseUrl));
  }
  const patients = await readPatients();
  const patient = patients.find((item) => item.id === params.id);
  if (!patient) {
    return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 });
  }
  return NextResponse.json(sanitize(patient));
}

export async function PUT(request: Request, { params }: Params) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
  }
  try {
    const payload = await request.json();
    const patients = await readPatients();
    const index = patients.findIndex((item) => item.id === params.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 });
    }

    const current = patients[index];
    const nextName = 'name' in payload ? String(payload.name || '').trim() : current.name;
    const nextCpf = 'cpf' in payload ? normalizeCpf(String(payload.cpf || '')) : current.cpf;
    const nextPhone =
      'phone' in payload ? normalizePhone(String(payload.phone || '')) : current.phone;

    if (!nextName) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    }
    if (nextCpf.length !== 11) {
      return NextResponse.json({ error: 'CPF deve conter 11 dígitos.' }, { status: 400 });
    }
    if (nextPhone.length < 10) {
      return NextResponse.json({ error: 'Telefone inválido.' }, { status: 400 });
    }

    if (
      patients.some((patient, idx) => idx !== index && patient.cpf === nextCpf)
    ) {
      return NextResponse.json({ error: 'CPF já cadastrado.' }, { status: 409 });
    }

    const updated: PatientRecord = {
      ...current,
      name: nextName,
      cpf: nextCpf,
      phone: nextPhone,
      email: 'email' in payload ? String(payload.email || '').trim() || undefined : current.email,
      birthDate:
        'birthDate' in payload ? String(payload.birthDate || '').trim() || undefined : current.birthDate,
      address:
        'address' in payload ? String(payload.address || '').trim() || undefined : current.address,
      healthPlan:
        'healthPlan' in payload ? String(payload.healthPlan || '').trim() || undefined : current.healthPlan,
      notes: 'notes' in payload ? String(payload.notes || '').trim() || undefined : current.notes,
      lastVisit:
        'lastVisit' in payload ? String(payload.lastVisit || '').trim() || '-' : current.lastVisit,
      nextAppointment:
        'nextAppointment' in payload
          ? String(payload.nextAppointment || '').trim() || '-'
          : current.nextAppointment,
      updatedAt: new Date().toISOString(),
    };

    patients[index] = updated;
    await writePatients(patients);

    return NextResponse.json(sanitize(updated));
  } catch (error) {
    console.error('Erro ao atualizar paciente', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar paciente.' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(_, buildTargetUrlFromRequest(_, baseUrl));
  }
  const patients = await readPatients();
  const index = patients.findIndex((item) => item.id === params.id);
  if (index === -1) {
    return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 });
  }
  patients.splice(index, 1);
  await writePatients(patients);
  return NextResponse.json({ success: true });
}
