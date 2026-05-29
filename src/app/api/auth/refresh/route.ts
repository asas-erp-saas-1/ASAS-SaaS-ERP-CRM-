import { NextResponse } from 'next/server';
import { SessionService } from '@/lib/auth/session';
import { CookieService } from '@/lib/auth/cookie';

export async function POST(req: Request) {
  try {
    const refreshToken = await CookieService.getRefreshToken();

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token provided' }, { status: 401 });
    }

    const tokens = await SessionService.refreshSession(refreshToken);

    if (!tokens) {
      await CookieService.clearTokens();
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    await CookieService.setAccessToken(tokens.accessToken);
    await CookieService.setRefreshToken(tokens.refreshToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
