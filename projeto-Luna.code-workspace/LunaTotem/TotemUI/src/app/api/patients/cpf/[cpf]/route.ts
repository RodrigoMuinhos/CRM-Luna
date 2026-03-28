export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { normalizeCpf, readPatients } from '../../patientStore';

import { buildTargetUrlFromRequest, getTotemApiBaseUrl, proxyTo } from '../../../_proxy';

type Params = {
  params: {
    cpf: string;
  };
};

export async function GET(request: Request, { params }: Params) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
  }
  const cpfDigits = normalizeCpf(params.cpf);
  const patients = await readPatients();
  const patient = patients.find((item) => item.cpf === cpfDigits);
  if (!patient) {
    return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 });
  }
  const { createdAt, updatedAt, ...rest } = patient;
  return NextResponse.json(rest);
}
