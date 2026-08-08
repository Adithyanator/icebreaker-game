import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_ADMIN_SESSION } from '@/lib/constants';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect Admin Dashboard
  if (pathname.startsWith('/admin/dashboard')) {
    const adminToken = request.cookies.get(COOKIE_ADMIN_SESSION)?.value;
    if (!adminToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/dashboard/:path*'],
};
