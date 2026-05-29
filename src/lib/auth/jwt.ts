import { SignJWT, jwtVerify } from 'jose';
import { env } from '../env';
import { SessionPayload } from './validators';
import { Logger } from '../observability/logger';

// 32-byte secret required for HS256
const SECRET = new TextEncoder().encode(
  env.JWT_SECRET || 'fallback_secret_must_change_for_production_use_123'
);

const ALG = 'HS256';

export class JWTService {
  /**
   * Generates a short-lived access token.
   */
  static async signAccessToken(payload: SessionPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: ALG })
      .setIssuedAt()
      .setExpirationTime('15m') // 15 mins for access token
      .sign(SECRET);
  }

  /**
   * Verifies access token and returns payload safely.
   */
  static async verifyAccessToken(token: string): Promise<SessionPayload | null> {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      return payload as unknown as SessionPayload;
    } catch (err: any) {
      if (err.code !== 'ERR_JWT_EXPIRED') {
        Logger.warn('Invalid JWT token', { error: String(err) });
      }
      return null;
    }
  }
}
