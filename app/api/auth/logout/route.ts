import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logout berhasil. Sesi telah diakhiri.',
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  };

  response.cookies.set('access_token', '', cookieOptions);
  response.cookies.set('token', '', cookieOptions);
  response.cookies.set('user_role', '', {
    ...cookieOptions,
    httpOnly: false,
  });

  return response;
}
