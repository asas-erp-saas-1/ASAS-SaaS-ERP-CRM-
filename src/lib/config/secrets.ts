/**
 * Core Secrets Management and Environment Access Utility.
 * Ensures strict typing and environment-specific secret isolation.
 */
import { ErrorTracker } from '../observability/errors';

export type Environment = 'development' | 'staging' | 'production';

export interface SystemSecrets {
  supabaseServiceRole: string;
  redisToken: string;
  qStashToken: string;
  jwtSecret: string;
}

export class ConfigProvider {
  static get environment(): Environment {
    const env = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development';
    return env as Environment;
  }

  static get isProduction(): boolean {
    return this.environment === 'production';
  }

  static getSecrets(): SystemSecrets {
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const qStashToken = process.env.QSTASH_TOKEN;
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

    if (this.isProduction) {
      if (!serviceRole || !redisToken || !qStashToken || !jwtSecret) {
        ErrorTracker.captureRejection('Missing Critical Production Secrets during Config Initialization');
        throw new Error('CRITICAL: Missing Production Secrets');
      }
    }

    return {
      supabaseServiceRole: serviceRole || 'dev_mock_key',
      redisToken: redisToken || 'dev_mock_redis',
      qStashToken: qStashToken || 'dev_mock_qstash',
      jwtSecret: jwtSecret || 'dev_mock_jwt_secret'
    };
  }

  static getPublicConfig() {
    return {
      apiUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      environment: this.environment
    };
  }
}
