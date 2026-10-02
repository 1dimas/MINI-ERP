'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!savedToken) {
      router.push('/login');
      return;
    }

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        setUser(null);
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Dashboard Toko</CardTitle>
              <CardDescription>Selamat datang di sistem toko</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <div className="p-3 border border-neutral-800 bg-neutral-900 rounded text-xs space-y-1">
              <p className="text-neutral-400">Nama: <span className="text-white font-medium">{user?.name || '-'}</span></p>
              <p className="text-neutral-400">Email: <span className="text-white font-medium">{user?.email || '-'}</span></p>
              <p className="text-neutral-400">Role: <span className="text-white font-medium">{user?.role || '-'}</span></p>
              <p className="text-neutral-400">Status 2FA: <span className="text-white font-medium">{user?.isTwoFactorEnabled ? 'Aktif' : 'Tidak Aktif'}</span></p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-neutral-400 font-medium">Navigasi Modul:</p>
              <Link href="/finance" className="block">
                <Button className="w-full justify-between">
                  <span>Modul Keuangan & Akuntansi (Finance)</span>
                  <span>&rarr;</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
