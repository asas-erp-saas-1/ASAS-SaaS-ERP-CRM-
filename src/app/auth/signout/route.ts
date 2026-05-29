import { NextResponse } from 'next/server';
import { SessionService } from '@/lib/auth/session';
import { CookieService } from '@/lib/auth/cookie';
import { kernel } from '@/lib/kernel/core';

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);

  try {
    // Try to get identity to revoke the exact session or all
    try {
      const identity = await kernel.identity();
      if (identity && identity.sessionId) {
        await SessionService.revokeSession(identity.sessionId);
      }
    } catch (e) {
      // If we can't get identity, that means token is expired/invalid anyway
    }

    // Always clear cookies
    await CookieService.clearTokens();

    return NextResponse.redirect(new URL('/login', requestUrl.origin), {
      status: 303, // Use 303 See Other to ensure redirection to GET on /login
    });
  } catch (error) {
     await CookieService.clearTokens();
     return NextResponse.redirect(new URL('/login', requestUrl.origin), {
      status: 303,
    });
  }
}

