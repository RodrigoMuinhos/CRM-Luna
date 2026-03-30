import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { buildTargetUrlFromRequest, getLunaCoreBaseUrl, proxyTo } from '../_proxy';

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

export async function GET(request: Request) {
  const baseUrl = getConfiguredLunaCoreBaseUrl();
  if (baseUrl instanceof NextResponse) {
    return baseUrl;
  }
  return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
}

export async function POST(request: Request) {
  const baseUrl = getConfiguredLunaCoreBaseUrl();
  if (baseUrl instanceof NextResponse) {
    return baseUrl;
  }
  return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
}
