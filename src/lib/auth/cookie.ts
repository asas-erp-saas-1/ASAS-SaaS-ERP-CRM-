import { cookies } from 'next/headers';
import { env } from '../env';

const IS_PROD = env.NODE_ENV === 'production';

export class CookieService {
  /**
   * Sets the access token cookie securely.
   */
  static async setAccessToken(token: string) {
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'asas_access_token',
      value: token,
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax', // Or strict for tougher restrictions
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });
  }

  /**
   * Sets the refresh token cookie securely.
   */
  static async setRefreshToken(token: string) {
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'asas_refresh_token',
      value: token,
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      path: '/api/auth/refresh', // Restrict to refresh endpoint
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }

  /**
   * Clears both auth cookies.
   */
  static async clearTokens() {
    const cookieStore = await cookies();
    cookieStore.delete({ name: 'asas_access_token', path: '/' });
    cookieStore.delete({ name: 'asas_refresh_token', path: '/api/auth/refresh' });
  }

  /**
   * Retrieves the access token from cookies.
   */
  static async getAccessToken(): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get('asas_access_token')?.value;
  }

  /**
   * Retrieves the refresh token from cookies.
   */
  static async getRefreshToken(): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get('asas_refresh_token')?.value;
  }
}
