import { NextResponse } from "next/server";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function ok<T>(body: T, status = 200) {
  return NextResponse.json(body, { status });
}

export function csv(body: string, filename: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

export function fail(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }
  if (error instanceof Error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ detail: "Unexpected server error." }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}
