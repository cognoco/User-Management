import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionTimeout } from '@/lib/security/security-policy.service';

// Define paths that require authentication
const protectedPaths = ['/account/profile', '/settings', '/account/complete-profile'];
// Define public paths that authenticated users maybe shouldn't see (optional)
const publicOnlyPaths = ['/auth/login', '/auth/register'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session if expired - important!
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Middleware getSession error:', error);
    // Allow request to proceed but session might be invalid
    return res; 
  }

  const { pathname } = req.nextUrl;

  // Check if the current path requires authentication
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtected && !session) {
    // Redirect unauthenticated users trying to access protected paths to login
    console.log(`Redirecting unauthenticated user from ${pathname} to /auth/login`);
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.searchParams.set('redirectedFrom', pathname); // Optional: add redirect origin
    return NextResponse.redirect(redirectUrl);
  }

  // If we have a session, check the session timeout policy
  if (session) {
    try {
      // Try to get organization ID from session metadata or user metadata
      const orgId = session.user?.user_metadata?.current_organization_id;
      
      if (orgId) {
        // Get session timeout from policy
        const timeoutMinutes = await getSessionTimeout(orgId);
        
        if (timeoutMinutes > 0) {
          // Check if session exceeds timeout based on last activity
          const lastActivity = session.user?.user_metadata?.last_activity;
          if (lastActivity) {
            const lastActivityTime = new Date(lastActivity).getTime();
            const currentTime = Date.now();
            const timeoutMs = timeoutMinutes * 60 * 1000;
            
            if (currentTime - lastActivityTime > timeoutMs) {
              // Session has timed out, sign out the user
              await supabase.auth.signOut();
              
              // Redirect to login
              const redirectUrl = req.nextUrl.clone();
              redirectUrl.pathname = '/auth/login';
              redirectUrl.searchParams.set('reason', 'session_timeout');
              return NextResponse.redirect(redirectUrl);
            }
          }
        }
      }
      
      // Update last activity timestamp
      await supabase.auth.updateUser({
        data: { last_activity: new Date().toISOString() }
      });
    } catch (err) {
      console.error('Error enforcing session policies:', err);
      // Continue with the request even if policy enforcement fails
    }
  }

  // Optional: Redirect authenticated users away from login/register pages
  if (session && publicOnlyPaths.some(path => pathname.startsWith(path))) {
    console.log(`Redirecting authenticated user from ${pathname} to /`);
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Allow the request to proceed
  return res;
}

// Configure the middleware matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     *
     * Apply middleware to root and other relevant paths.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)', // Run on most paths, including '/', handle public/auth redirects inside
    // Explicitly include paths needing protection (redundant if first line is broad enough, but safe to keep)
    '/account/profile/:path*',
    '/settings/:path*',
    '/account/complete-profile/:path*',
    // Add back explicit matches for auth pages if you want middleware to run there for redirects
    '/auth/login',
    '/auth/register',
    '/auth/reset-password',
    '/auth/update-password',
    '/auth/verify-email',
    '/auth/check-email',
  ],
}; 