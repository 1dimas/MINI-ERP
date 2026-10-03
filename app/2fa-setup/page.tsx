'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TwoFactorSetupPage() {
  const [userId, setUserId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleGenerate2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal generate 2FA');

      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
      setMessage('Scan QR Code dengan Google Authenticator');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setVerifying(true);

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verifikasi gagal');

      setMessage('2FA Berhasil Diaktifkan!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 p-6 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-sm">
          <Card className="border-neutral-800 bg-neutral-950">
            <CardHeader>
              <CardTitle>Setup 2FA</CardTitle>
              <CardDescription>Generate & Scan QR Code Google Authenticator</CardDescription>
            </CardHeader>

            <CardContent>
              {error && <div className="mb-4 p-3 border border-red-800 bg-red-950/40 text-red-400 text-xs rounded">{error}</div>}
              {message && <div className="mb-4 p-3 border border-neutral-700 bg-neutral-900 text-neutral-300 text-xs rounded">{message}</div>}

              {!qrCodeUrl ? (
                <form onSubmit={handleGenerate2FA} className="space-y-4">
                  <div>
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      type="text"
                      placeholder="User ID dari Database"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      required
                      className="bg-black border-neutral-800"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-white text-black font-bold hover:bg-neutral-200" disabled={loading}>
                    {loading ? 'Generating...' : 'Generate 2FA QR Code'}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center p-4 border border-neutral-800 bg-black rounded-xl">
                    <Image src={qrCodeUrl} alt="2FA QR Code" width={160} height={160} className="bg-white p-2 rounded-lg" />
                    <p className="text-xs text-neutral-400 mt-2 font-mono">Secret: <code className="text-white">{secret}</code></p>
                  </div>

                  <form onSubmit={handleVerify2FA} className="space-y-4">
                    <div>
                      <Label htmlFor="otp">Kode OTP (6 Digit)</Label>
                      <Input
                        id="otp"
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        className="text-center font-mono tracking-widest text-lg bg-black border-neutral-800"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold" disabled={verifying}>
                      {verifying ? 'Memverifikasi...' : 'Aktifkan 2FA'}
                    </Button>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
