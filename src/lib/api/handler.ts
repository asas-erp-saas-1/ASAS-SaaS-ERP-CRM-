import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '../observability/logger';
import { ErrorTracker } from '../observability/errors';
import { z } from 'zod';
import { JWTService } from '../auth/jwt';
import { SessionPayload } from '../auth/validators';

export interface ApiContext {
  req: NextRequest;
  params: Record<string, string>;
  session?: SessionPayload;
}

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  requiredPermissions?: { resource: string; action: string }[];
}

/**
 * Standard API Response envelope.
 */
export function success(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, code = 'INTERNAL_ERROR', status = 500, details?: any) {
  return NextResponse.json({ success: false, error: { code, message, details } }, { status });
}

/**
 * Wraps an API route with common middleware: Error catching, tracing, auth enforcement.
 */
export function withCoreMiddleware(
  handler: (ctx: ApiContext) => Promise<NextResponse>,
  options?: ApiHandlerOptions
) {
  return async (req: NextRequest, { params }: { params: any } = { params: {} }): Promise<NextResponse> => {
    const traceId = req.headers.get('x-request-id') || crypto.randomUUID();
    let session: SessionPayload | undefined = undefined;

    try {
      // 1. Authentication Layer
      if (options?.requireAuth) {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return errorResponse('Missing or invalid authentication token', 'UNAUTHORIZED', 401);
        }

        const token = authHeader.split(' ')[1];
        const payload = await JWTService.verifyAccessToken(token);

        if (!payload) {
          return errorResponse('Token expired or invalid', 'UNAUTHORIZED', 401);
        }
        session = payload;
      }

      // 2. Execute Handler
      const ctx: ApiContext = {
        req,
        params,
        session
      };

      const response = await handler(ctx);
      
      // Inject trace ID for observability
      response.headers.set('x-trace-id', traceId);
      
      return response;

    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return errorResponse('Validation failed', 'VALIDATION_ERROR', 400, err.format());
      }
      
      ErrorTracker.captureError(err, { traceId, url: req.url });
      Logger.error('API Error', err, { traceId, url: req.url });
      
      return errorResponse('An unexpected error occurred', 'INTERNAL_ERROR', 500);
    }
  };
}
