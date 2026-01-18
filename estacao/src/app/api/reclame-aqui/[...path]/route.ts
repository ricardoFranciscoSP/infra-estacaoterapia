import { NextResponse } from "next/server";

const BASE_URL = "https://s3.amazonaws.com/raichu-beta/";

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const path = Array.isArray(params.path) ? params.path.join("/") : "";
  if (!path || !path.startsWith("ra-verified/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(path, BASE_URL);
  const upstream = await fetch(url, {
    headers: {
      "User-Agent": "estacaoterapia-reclame-aqui-proxy",
    },
    // Force revalidation only when needed; response is cached downstream.
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: "Upstream error" }, { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const response = new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // Cache longo para ativos estáticos
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });

  return response;
}
