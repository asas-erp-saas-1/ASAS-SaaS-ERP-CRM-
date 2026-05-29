import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { SessionService } from '@/lib/auth/session';
import { CookieService } from '@/lib/auth/cookie';
import { LoginSchema } from '@/lib/auth/validators';
import { compare } from 'bcryptjs';
import { ErrorTracker } from '@/lib/observability/errors';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { email, password, tenantId } = parsed.data;

    // We do not require tenantId explicitly on login if the email is unique, but the platform implies compound uniqueness (tenantId, email).
    // Let's assume users log in within a domain context, or we fetch the first active one.
    
    let whereClause: any = { email };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const users = await prisma.user.findMany({ where: whereClause, take: 2 });
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (users.length > 1 && !tenantId) {
       return NextResponse.json({ error: 'Multiple accounts found, please specify tenant' }, { status: 400 });
    }

    const user = users[0];

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account is not active' }, { status: 403 });
    }

    const validPassword = await compare(password, user.passwordHash);
    
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const deviceInfo = req.headers.get('user-agent') || 'unknown';

    const { accessToken, refreshToken, session } = await SessionService.createSession(
      user.id,
      user.tenantId,
      ipAddress as string,
      deviceInfo as string
    );

    await CookieService.setAccessToken(accessToken);
    await CookieService.setRefreshToken(refreshToken);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
      }
    });
  } catch (error: any) {
    ErrorTracker.captureError(error, { context: 'auth_login' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
