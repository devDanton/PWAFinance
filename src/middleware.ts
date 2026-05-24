import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // First run next-intl middleware
  const response = intlMiddleware(request);
  
  // Then run supabase middleware to update session
  return await updateSession(request, response);
}

export const config = {
  // Match only internationalized pathnames, skipping api, _next/static, _next/image, favicon.ico
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/(pt|en)/:path*']
};
