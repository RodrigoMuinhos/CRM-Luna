import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { buildTargetUrlFromRequest, getLunaCoreBaseUrl, proxyTo } from '../../_proxy';

type Params = {
  params: {
    id: string;
  };
};

function getConfiguredLunaCoreBaseUrl() {
  const baseUrl = getLunaCoreBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'LunaCore não configurado para o proxy de usuários.' },
      { status: 503 },
    );
  }
  return baseUrl;
}

export async function GET(_: Request, { params }: Params) {
  const baseUrl = getConfiguredLunaCoreBaseUrl();
  if (baseUrl instanceof NextResponse) {
    return baseUrl;
  }
  return proxyTo(_, buildTargetUrlFromRequest(_, baseUrl));
}

export async function PUT(request: Request, { params }: Params) {
  const baseUrl = getConfiguredLunaCoreBaseUrl();
  if (baseUrl instanceof NextResponse) {
    return baseUrl;
  }
  return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
}

export async function DELETE(_: Request, { params }: Params) {
  const baseUrl = getConfiguredLunaCoreBaseUrl();
  if (baseUrl instanceof NextResponse) {
    return baseUrl;
  }
  return proxyTo(_, buildTargetUrlFromRequest(_, baseUrl));
}
