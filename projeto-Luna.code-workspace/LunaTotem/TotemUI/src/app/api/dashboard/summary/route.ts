export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { buildDashboardSummary } from '../summaryService';
import { buildTargetUrlFromRequest, getTotemApiBaseUrl, proxyTo } from '../../_proxy';

export async function GET(request: Request) {
  const baseUrl = getTotemApiBaseUrl();
  if (baseUrl) {
    return proxyTo(request, buildTargetUrlFromRequest(request, baseUrl));
  }
  const summary = await buildDashboardSummary(false);
  return NextResponse.json(summary);
}
