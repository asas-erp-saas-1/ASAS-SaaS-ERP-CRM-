import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
};

export class ApiError extends Error {
  constructor(public override message: string, public status: number = 400, public details?: any) {
    super(message);
  }
}

export async function handleApiRequest<T>(
  requestHandler: () => Promise<NextResponse>
) {
  try {
    return await requestHandler();
  } catch (error: any) {
    console.error('[API_ERROR]:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error.details,
        },
        { status: error.status }
      );
    }

    // Default error
    const message = process.env.NODE_ENV === 'production' 
      ? 'An internal server error occurred' 
      : error.message || 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function errorResponse(message: string, status: number = 400, details?: any) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      details,
    },
    { status }
  );
}
