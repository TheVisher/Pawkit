import { NextResponse } from 'next/server';

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

interface ApiErrorResponse {
  error: string;
  message: string;
  code: string;
  details?: any;
}

export function unauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json<ApiErrorResponse>({
    error: 'Unauthorized',
    message,
    code: ErrorCodes.UNAUTHORIZED,
  }, { status: 401 });
}

export function notFound(resource = 'Resource', details?: any): NextResponse {
  return NextResponse.json<ApiErrorResponse>({
    error: 'Not Found',
    message: `${resource} not found`,
    code: ErrorCodes.NOT_FOUND,
    details,
  }, { status: 404 });
}

export function validationError(message: string, details?: any): NextResponse {
  return NextResponse.json<ApiErrorResponse>({
    error: 'Validation Error',
    message,
    code: ErrorCodes.VALIDATION_ERROR,
    details,
  }, { status: 400 });
}

export function conflict(message: string, details?: any): NextResponse {
  return NextResponse.json<ApiErrorResponse>({
    error: 'Conflict',
    message,
    code: ErrorCodes.CONFLICT,
    details,
  }, { status: 409 });
}

export function rateLimited(message = 'Too many requests'): NextResponse {
  return NextResponse.json<ApiErrorResponse>({
    error: 'Rate Limited',
    message,
    code: ErrorCodes.RATE_LIMITED,
  }, { status: 429 });
}

export function success<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}
