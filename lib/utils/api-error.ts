import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export function handleApiError(error: unknown): NextResponse {
  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      { message: "Validation error", errors: error.errors },
      { status: 400 }
    );
  }

  // Prisma errors (check for code property since PrismaClientKnownRequestError may not be available)
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    const prismaError = error as { code: string; message?: string };
    switch (prismaError.code) {
      case "P2025": // Record not found
        return NextResponse.json(
          { message: "Resource not found" },
          { status: 404 }
        );
      case "P2002": // Unique constraint violation
        return NextResponse.json(
          { message: "Resource already exists" },
          { status: 409 }
        );
      case "P2003": // Foreign key constraint violation
        return NextResponse.json(
          { message: "Invalid reference" },
          { status: 400 }
        );
      default:
        if (prismaError.code.startsWith('P')) {
          // It's a Prisma error
          console.error("Prisma error:", error);
          return NextResponse.json(
            { message: "Database error" },
            { status: 500 }
          );
        }
    }
  }

  // Generic errors
  if (error instanceof Error) {
    // Check if it's a validation error from our code
    if (error.message.includes("required") || error.message.includes("invalid")) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    console.error("Unexpected error:", error);
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }

  // Unknown error
  console.error("Unknown error:", error);
  return NextResponse.json(
    { message: "Internal server error" },
    { status: 500 }
  );
}
