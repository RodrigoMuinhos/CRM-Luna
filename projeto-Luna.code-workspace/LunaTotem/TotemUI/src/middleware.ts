import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const rawAppMode = String(
  process.env.NEXT_PUBLIC_APP_MODE || process.env.APP_MODE || 'kiosk'
)
  .trim()
  .toLowerCase();

const webOnlyMode = rawAppMode === 'web' || rawAppMode === 'web-only';

export function middleware(request: NextRequest) {
  if (!webOnlyMode) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/tef/')) {
    return NextResponse.json(
      {
        error: 'TEF indisponível no modo web-only.',
        code: 'web_only_tef_disabled',
      },
      { status: 404 }
    );
  }

  if (
    pathname === '/api/videos/cache' ||
    pathname.startsWith('/api/videos/local/')
  ) {
    return NextResponse.json(
      {
        error: 'API local de mídia indisponível no modo web-only.',
        code: 'web_only_local_media_disabled',
      },
      { status: 404 }
    );
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/mobile-login', request.url));
  }

  if (pathname === '/system/technician' || pathname.startsWith('/system/tef/')) {
    return NextResponse.redirect(new URL('/system', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/system/technician',
    '/system/tef/:path*',
    '/api/tef/:path*',
    '/api/videos/cache',
    '/api/videos/local/:path*',
  ],
};
