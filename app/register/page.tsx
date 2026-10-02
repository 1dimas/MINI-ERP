'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('OWNER');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registrasi gagal');

      setMessage(`User ${data.name} berhasil terdaftar!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Register First User</CardTitle>
            <CardDescription>Pendaftaran akun utama sistem</CardDescription>
          </CardHeader>

          <CardContent>
            {error && <div className="mb-4 p-3 border border-red-800 bg-red-950/40 text-red-400 text-xs rounded">{error}</div>}
            {message && <div className="mb-4 p-3 border border-neutral-700 bg-neutral-900 text-neutral-300 text-xs rounded">{message}</div>}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama</Label>
                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  className="w-full h-10 rounded border border-neutral-800 bg-neutral-900 px-3 text-sm text-white"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="OWNER">OWNER</option>
                  <option value="FINANCE">FINANCE</option>
                  <option value="KASIR">KASIR</option>
                </select>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Daftar...' : 'Daftar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
