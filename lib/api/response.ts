import { NextResponse } from "next/server";

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  message: string;
  error: unknown | null;
};

export function apiSuccess<T>(data: T, message = "Success", status = 200) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data, message, error: null }, { status });
}

export function apiError(message: string, error: unknown = null, status = 500) {
  return NextResponse.json<ApiResponse<null>>({ success: false, data: null, message, error }, { status });
}
