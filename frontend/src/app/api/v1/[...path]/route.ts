import { NextRequest, NextResponse } from "next/server";

function djangoBase(): string {
  return (
    process.env.DJANGO_API_URL ||
    process.env.INTERNAL_API_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "");
}

async function proxy(req: NextRequest, segments: string[]) {
  const path = segments.join("/");
  const trail = path.endsWith("/") ? path : `${path}/`;
  const qs = req.nextUrl.search;
  const url = `${djangoBase()}/api/v1/${trail}${qs}`;

  const headers = new Headers();
  const auth = req.headers.get("authorization");
  if (auth) headers.set("Authorization", auth);

  const method = req.method;
  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const ct = req.headers.get("content-type");
    if (ct) {
      headers.set("Content-Type", ct);
      
      // Czytamy body tylko jeśli jest Content-Type (dla POST/PATCH/PUT)
      // DELETE zazwyczaj nie ma body i próba czytania może powodować błędy na niektórych systemach
      try {
        body = await req.arrayBuffer();
      } catch (e) {
        console.warn("[BFF] Could not read request body:", e);
      }
    } else if (method !== "DELETE") {
      // Jeśli to nie DELETE i nie ma CT, ale jest body? (rzadkie)
      try {
        const buf = await req.arrayBuffer();
        if (buf.byteLength > 0) body = buf;
      } catch {
        /* ignore empty body */
      }
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
    });
  } catch (e) {
    const base = djangoBase();
    const devDetail =
      process.env.NODE_ENV === "development"
        ? e instanceof Error
          ? `${e.message}${e.cause != null ? ` — ${String(e.cause)}` : ""} → ${url}`
          : String(e)
        : undefined;
    console.error("[BFF] Upstream fetch failed:", base, e);
    return NextResponse.json(
      {
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message:
            "Nie można połączyć się z serwerem API (backend). Uruchom Django lub sprawdź INTERNAL_API_URL / DJANGO_API_URL.",
          ...(devDetail ? { detail: devDetail.slice(0, 500) } : {}),
        },
      },
      { status: 503 }
    );
  }

  if (method === "HEAD") {
    return new NextResponse(null, { status: res.status });
  }

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: { message: text.slice(0, 200), code: "PARSE_ERROR" } };
  }

  const nextRes = NextResponse.json(data, { status: res.status });
  const rateRemaining = res.headers.get("X-RateLimit-Remaining");
  if (rateRemaining) nextRes.headers.set("X-RateLimit-Remaining", rateRemaining);
  const retryAfter = res.headers.get("Retry-After");
  if (retryAfter) nextRes.headers.set("Retry-After", retryAfter);
  return nextRes;
}

type RouteCtx = { params: { path: string[] } };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export async function HEAD(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}
