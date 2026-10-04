'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import { ShieldCheck, Lock, ArrowLeft, Loader2, KeyRound } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';
  const sessionError = searchParams.get('error');

  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    sessionError === 'session_expired'
      ? 'Sesi Anda telah berakhir. Silakan login kembali.'
      : ''
  );
  const [message, setMessage] = useState('');

  // 1. Submit Form Email & Password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Email atau password salah');
      }

      // Jika akun mengaktifkan 2FA: alihkan ke step input OTP
      if (data.requires2FA) {
        setUserId(data.userId);
        setStep('2fa');
        setOtp('');
        setMessage('Buka aplikasi Google Authenticator dan masukkan 6 digit kode.');
        return;
      }

      // Jika tidak butuh 2FA: simpan token ke cookies dan redirect
      const token = data.access_token || data.accessToken;
      if (token) {
        saveSession(token, data.user);
      }

      const targetRoute = getRoleTargetRoute(token, data.user);
      const targetLabel = targetRoute === '/pos' ? 'Terminal Kasir (POS)...' : 'Dashboard Utama...';

      setMessage(`Login berhasil! Mengalihkan ke ${targetLabel}`);
      setTimeout(() => {
        router.push(targetRoute);
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  // Helper menentukan rute tujuan berdasarkan role
  const getRoleTargetRoute = (token?: string, userObj?: any): string => {
    let role = userObj?.role;
    if (!role && token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
          const payload = JSON.parse(payloadStr);
          role = payload.role;
        }
      } catch (err) {
        // ignore
      }
    }

    const normalizedRole = (role || '').toUpperCase();
    if (normalizedRole === 'KASIR') {
      return '/pos';
    }
    return '/dashboard';
  };

  // 2. Submit Verifikasi 2FA (OTP)
  const handleVerify2FA = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otp.length < 6) {
      setError('Masukkan 6 digit kode OTP secara lengkap');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Kode 2FA tidak valid atau sudah kadaluarsa');
      }

      // Simpan access_token ke cookies (agar middleware Next.js dapat mendeteksi)
      const token = data.access_token || data.accessToken;
      if (token) {
        saveSession(token, data.user);
      }

      const targetRoute = getRoleTargetRoute(token, data.user);
      const targetLabel = targetRoute === '/pos' ? 'Terminal Kasir (POS)...' : 'Dashboard Utama...';

      setMessage(`Verifikasi 2FA sukses! Mengalihkan ke ${targetLabel}`);
      setTimeout(() => {
        router.push(targetRoute);
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Verifikasi gagal');
    } finally {
      setLoading(false);
    }
  };

  // Helper simpan session ke Cookies & LocalStorage
  const saveSession = (token: string, user?: any) => {
    Cookies.set('access_token', token, { expires: 1, path: '/' });
    Cookies.set('token', token, { expires: 1, path: '/' });

    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
      localStorage.setItem('token', token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        Cookies.set('user_role', user.role || '', { expires: 1, path: '/' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 selection:bg-white selection:text-black">
      {/* Background radial gradient subtle */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-neutral-900/40 via-black to-black" />

      <div className="w-full max-w-sm relative z-10">
        {/* Branding header minimalis */}
        <div className="mb-6 text-center space-y-1">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-neutral-800 bg-neutral-900 text-white mb-2">
            {step === 'login' ? <Lock className="w-5 h-5 text-white" /> : <ShieldCheck className="w-5 h-5 text-white" />}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">SOLIT POS</h1>
          <p className="text-xs text-neutral-400">Sistem Kasir & Manajemen Toko</p>
        </div>

        <Card className="border border-neutral-800 bg-neutral-950/90 backdrop-blur-md shadow-2xl">
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight text-white">
              {step === 'login' ? 'Masuk ke Sistem' : 'Otorisasi Dua Faktor (2FA)'}
            </CardTitle>
            <CardDescription className="text-xs text-neutral-400">
              {step === 'login'
                ? 'Masukkan kredensial akun kasir atau manajemen Anda'
                : 'Masukkan 6 digit kode OTP dari aplikasi Google Authenticator'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Alert Error */}
            {error && (
              <div className="p-3 border border-red-900/60 bg-red-950/40 text-red-300 text-xs rounded-md leading-relaxed flex items-start gap-2 animate-in fade-in">
                <span className="font-bold">•</span>
                <span>{error}</span>
              </div>
            )}

            {/* Alert Info/Message */}
            {message && !error && (
              <div className="p-3 border border-neutral-800 bg-neutral-900 text-neutral-200 text-xs rounded-md leading-relaxed flex items-start gap-2 animate-in fade-in">
                <span className="font-bold">✓</span>
                <span>{message}</span>
              </div>
            )}

            {/* STEP 1: Form Email & Password */}
            {step === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-neutral-300">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@solitpos.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-500 focus:border-neutral-400 focus:ring-0"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-neutral-300">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-500 focus:border-neutral-400 focus:ring-0"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black hover:bg-neutral-200 font-semibold h-10 mt-2 transition-all"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memeriksa akun...
                    </span>
                  ) : (
                    'Masuk'
                  )}
                </Button>
              </form>
            ) : (
              /* STEP 2: Komponen InputOTP Shadcn (6 Digit) */
              <form onSubmit={handleVerify2FA} className="space-y-5">
                <div className="flex flex-col items-center justify-center space-y-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <KeyRound className="w-3.5 h-3.5 text-neutral-300" />
                    <span>Kode Verifikasi 6 Digit</span>
                  </div>

                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      // Auto-submit saat 6 digit terpenuhi
                      if (val.length === 6) {
                        setTimeout(() => {
                          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                          handleVerify2FA(fakeEvent);
                        }, 50);
                      }
                    }}
                    disabled={loading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full bg-white text-black hover:bg-neutral-200 font-semibold h-10 transition-all"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memverifikasi OTP...
                    </span>
                  ) : (
                    'Verifikasi & Masuk'
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('login');
                    setOtp('');
                    setError('');
                    setMessage('');
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors pt-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke input email & password</span>
                </button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-neutral-500">
          Dilindungi oleh otentikasi JWT & 2FA Time-based One-Time Password
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-neutral-400 text-xs">
          Memuat halaman login...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
