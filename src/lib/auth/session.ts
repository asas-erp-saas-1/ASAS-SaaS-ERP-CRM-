import { prisma } from '../db/prisma';
import { JWTService } from './jwt';
import { SessionPayload } from './validators';
import { randomBytes, createHash } from 'crypto';
import { ErrorTracker } from '../observability/errors';

export class SessionService {
  /**
   * Hashes a token for secure storage.
   */
  private static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Creates a new session in DB and returns access & refresh tokens.
   */
  static async createSession(userId: string, tenantId: string, ipAddress?: string, deviceInfo?: string) {
    const session = await prisma.session.create({
      data: {
        userId,
        tenantId,
        ipAddress,
        deviceInfo,
      },
      include: {
        user: {
          include: {
            userRoles: { include: { role: true } },
          },
        },
      },
    });

    const roles = session.user.userRoles.map((ur) => ur.role.name);
    const payload: SessionPayload = {
      sessionId: session.id,
      userId,
      tenantId,
      roles,
    };

    const accessToken = await JWTService.signAccessToken(payload);
    
    // Generate secure opaque refresh token
    const rawRefreshToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.create({
        data: {
          sessionId: session.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: session.tenantId,
          userId: session.userId,
          action: 'LOGIN',
          resource: 'SESSION',
          resourceId: session.id,
          ipAddress,
          userAgent: deviceInfo,
        }
      });
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      session,
    };
  }

  /**
   * Refreshes an active session. Returns new access/refresh tokens.
   * Performs Refresh Token Rotation (RTR) and detects reuse.
   */
  static async refreshSession(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    
    // Find the refresh token in the DB
    const refreshTokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        session: {
          include: {
            user: { include: { userRoles: { include: { role: true } } } },
          },
        },
      },
    });

    if (!refreshTokenRecord) {
      return null;
    }

    const { session } = refreshTokenRecord;

    // Detect Replay Attack / Reuse
    // If the token was already revoked or replaced, it's a security breach.
    if (refreshTokenRecord.isRevoked || refreshTokenRecord.replacedBy) {
      await this.revokeAllSessions(session.userId);
      
      // Audit log the breach
      await prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          userId: session.userId,
          action: 'SECURITY_BREACH',
          resource: 'SESSION',
          resourceId: session.id,
          details: { reason: 'Refresh token reuse detected', tokenHash },
          ipAddress: session.ipAddress,
        }
      });

      ErrorTracker.captureError(new Error('Refresh token reuse detected'), {
        userId: session.userId,
        sessionId: session.id,
      });
      return null;
    }

    if (!session.isValid || refreshTokenRecord.expiresAt < new Date()) {
      return null;
    }

    // Revoke the current token and point it to the next
    const newRawRefreshToken = randomBytes(32).toString('hex');
    const newTokenHash = this.hashToken(newRawRefreshToken);

    await prisma.$transaction(async (tx) => {
      // Mark old as revoked and replaced
      await tx.refreshToken.update({
        where: { id: refreshTokenRecord.id },
        data: {
          isRevoked: true,
          replacedBy: newTokenHash,
        },
      });

      // Create new refresh token in family
      await tx.refreshToken.create({
        data: {
          sessionId: session.id,
          tokenHash: newTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Update session activity
      await tx.session.update({
        where: { id: session.id },
        data: { lastActiveAt: new Date() },
      });
      
      // Audit log note: We don't typically audit *every* token refresh to avoid log spam,
      // but we log explicit login boundaries and security events.
    });

    const roles = session.user.userRoles.map((ur) => ur.role.name);
    
    const payload: SessionPayload = {
      sessionId: session.id,
      userId: session.userId,
      tenantId: session.tenantId,
      roles,
    };

    return {
      accessToken: await JWTService.signAccessToken(payload),
      refreshToken: newRawRefreshToken,
    };
  }

  /**
   * Revokes a session directly.
   */
  static async revokeSession(sessionId: string) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { isValid: false },
    });
    // Optional: revoke all its refresh tokens immediately
    await prisma.refreshToken.updateMany({
      where: { sessionId },
      data: { isRevoked: true },
    });
  }

  /**
   * Revokes all active sessions for a user (e.g. security breach, password change).
   */
  static async revokeAllSessions(userId: string) {
    const sessions = await prisma.session.findMany({ where: { userId } });
    const sessionIds = sessions.map(s => s.id);
    
    await prisma.session.updateMany({
      where: { id: { in: sessionIds } },
      data: { isValid: false },
    });
    
    await prisma.refreshToken.updateMany({
      where: { sessionId: { in: sessionIds } },
      data: { isRevoked: true },
    });
  }
}
