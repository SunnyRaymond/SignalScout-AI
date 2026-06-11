import type { NextRequest } from "next/server";
import { handleApiRequest } from "@/lib/api-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ path: string[] }>;
};

async function route(request: NextRequest, context: Context) {
  const { path } = await context.params;
  return handleApiRequest(request, path || []);
}

export const GET = route;
export const POST = route;
export const PUT = route;
export const DELETE = route;
