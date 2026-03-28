export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { Appointment } from '@/lib/api';
import { buildTargetUrlFromRequest, getTotemApiBaseUrl, proxyTo } from '../_proxy';
import { createAppointmentId, readAppointments, writeAppointments } from './appointmentStore';

export async function GET(request: Request) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
  }
  const appointments = await readAppointments();
  return NextResponse.json(appointments);
}

export async function POST(request: Request) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
  }
  try {
    const payload = (await request.json()) as Partial<Appointment>;
    const patient = String(payload.patient ?? '').trim();
    const patientId = String(payload.patientId ?? '').trim();
    const doctor = String(payload.doctor ?? '').trim();
    const specialty = String(payload.specialty ?? '').trim();
    const date = String(payload.date ?? '').trim();
    const time = String(payload.time ?? '').trim();
    const type = String(payload.type ?? '').trim();
    const status = String(payload.status ?? '').trim() || 'scheduled';
    const cpf = String(payload.cpf ?? '').trim();

    if (!patient || !patientId || !doctor || !specialty || !date || !time || !type) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const appointments = await readAppointments();
    const newAppointment: Appointment = {
      id: createAppointmentId(),
      patient,
      patientId,
      patientEmail: payload.patientEmail,
      doctor,
      specialty,
      date,
      time,
      status,
      type,
      paid: Boolean(payload.paid),
      amount: Number(payload.amount ?? 0),
      cpf,
      photoUrl: payload.photoUrl,
    };

    appointments.push(newAppointment);
    await writeAppointments(appointments);

    return NextResponse.json(newAppointment, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar consulta', error);
    return NextResponse.json({ error: 'Erro interno ao criar consulta.' }, { status: 500 });
  }
}
