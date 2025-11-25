import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { validationError, notFound, conflict, ErrorCodes } from "./api-responses";

/**
 * Enhanced centralized error handler for API routes
 *
 * @param error - The error to handle
 * @param context - Optional context for logging (route, userId, etc.)
 * @returns NextResponse with standardized error format
 */
export function handleApiError(error: unknown, context?: { route?: string; userId?: string }): NextResponse {
  // Log all errors with context
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error('[API Error]', {
    error: errorMessage,
    stack: errorStack,
    ...context,
  });

  // Zod validation errors
  if (error instanceof ZodError) {
    return validationError('Invalid input', error.errors);
  }

  // Prisma errors (check for code property since PrismaClientKnownRequestError may not be available)
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    const prismaError = error as { code: string; meta?: Record<string, unknown> };
    switch (prismaError.code) {
      case "P2025": // Record not found
        return notFound('Resource', prismaError.meta);
      case "P2002": // Unique constraint violation
        return conflict('Resource already exists', prismaError.meta);
      case "P2003": // Foreign key constraint violation
        return validationError('Invalid reference', prismaError.meta);
      default:
        if (prismaError.code.startsWith('P')) {
          // It's a Prisma error
          return NextResponse.json({
            error: 'Database Error',
            message: 'A database error occurred',
            code: 'DATABASE_ERROR',
          }, { status: 500 });
        }
    }
  }

  // Custom duplicate URL errors
  if (error instanceof Error) {
    if (error.message === 'DUPLICATE_URL_IN_TRASH') {
      return conflict('This URL is in your trash. Empty trash to add it again.', {
        code: 'DUPLICATE_URL_IN_TRASH'
      });
    }
    // Custom validation errors
    if (error.message.includes("required") || error.message.includes("invalid")) {
      return validationError(error.message);
    }
  }

  // Unknown error
  return NextResponse.json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: ErrorCodes.INTERNAL_ERROR,
  }, { status: 500 });
}
