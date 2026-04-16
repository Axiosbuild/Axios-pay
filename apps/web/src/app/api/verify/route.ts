import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
const AUTH_PREFIX = '/api/v1/auth';

export async function POST(req: NextRequest) {
  try {
    const { token, otp, userId } = await req.json();

    if (!API_BASE_URL) {
      return NextResponse.json({ error: 'API base URL is not configured' }, { status: 500 });
    }

    if (token && userId) {
      const verifyLinkUrl = new URL(`${AUTH_PREFIX}/verify-email-link`, API_BASE_URL);
      verifyLinkUrl.searchParams.set('token', token);
      verifyLinkUrl.searchParams.set('userId', userId);

      const response = await fetch(verifyLinkUrl.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    if (otp && userId) {
      const response = await fetch(`${API_BASE_URL}${AUTH_PREFIX}/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp }),
        cache: 'no-store',
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(
      { error: 'Invalid verification payload. Provide token+userId or otp+userId.' },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 });
  }
}
