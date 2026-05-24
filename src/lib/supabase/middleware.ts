import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest, response: NextResponse) {
  let supabaseResponse = response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect routes based on authentication status and paths
  const isAuthRoute = request.nextUrl.pathname.match(/\/(pt|en)\/login/) || request.nextUrl.pathname.endsWith('/login')

  if (!user && !isAuthRoute) {
    // no user, redirect to login page
    const url = request.nextUrl.clone()
    url.pathname = '/pt/login' // Or keep current locale
    
    // We replace the response to redirect
    supabaseResponse = NextResponse.redirect(url)
  } else if (user && isAuthRoute) {
    // user is logged in, redirect to dashboard
    const url = request.nextUrl.clone()
    url.pathname = '/pt/dashboard' // Or keep current locale
    
    supabaseResponse = NextResponse.redirect(url)
  }

  return supabaseResponse
}
