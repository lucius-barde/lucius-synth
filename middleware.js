import { NextResponse } from 'next/server';

export function middleware(request) {
  const hasSession = request.cookies.has('sb-access-token') || request.cookies.has('sb-refresh-token');
  const { pathname } = request.nextUrl;
  const isProtectedAdminSubroute = pathname.startsWith('/admin/') && pathname !== '/admin';

  if (isProtectedAdminSubroute && !hasSession) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
