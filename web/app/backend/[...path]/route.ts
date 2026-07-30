import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy same-origin /backend/* → API.
 * Prefere API_URL (runtime/interno Coolify); fallback NEXT_PUBLIC_API_URL.
 */
function apiBase(): string {
  const raw =
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    'http://localhost:3000';
  return raw.replace(/\/$/, '');
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;
  const target = `${apiBase()}/${path.join('/')}${req.nextUrl.search}`;

  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  const authorization = req.headers.get('authorization');
  if (contentType) headers.set('content-type', contentType);
  if (authorization) headers.set('authorization', authorization);

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer(),
      cache: 'no-store',
    });

    const outHeaders = new Headers();
    const upstreamType = upstream.headers.get('content-type');
    if (upstreamType) outHeaders.set('content-type', upstreamType);

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proxy falhou';
    return NextResponse.json(
      {
        error: 'PROXY_ERROR',
        message: `Não foi possível alcançar a API em ${apiBase()}: ${message}`,
      },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
