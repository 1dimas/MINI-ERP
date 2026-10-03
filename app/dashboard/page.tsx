'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  Receipt,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Scale,
  TrendingUp,
  Clock,
  ArrowLeftRight,
  BookOpen,
  Lock,
  Laptop,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [pendingDraftsCount, setPendingDraftsCount] = useState<number>(0);
  const [plSummary, setPlSummary] = useState<any>(null);
  const [tbIsBalanced, setTbIsBalanced] = useState<boolean>(true);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!savedToken) {
      router.push('/login');
      return;
    }

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        if (parsedUser.role === 'FINANCE' || parsedUser.role === 'OWNER') {
          fetchDashboardStats();
        }
      } catch (e) {
        setUser(null);
      }
    }
  }, [router]);

  const fetchDashboardStats = async () => {
    setLoadingStats(true);
    try {
      const [jRes, plRes, tbRes] = await Promise.all([
        fetch('/api/journal?status=DRAFT'),
        fetch('/api/accounting/profit-loss'),
        fetch('/api/accounting/trial-balance'),
      ]);

      if (jRes.ok) {
        const jData = await jRes.json();
        if (Array.isArray(jData)) setPendingDraftsCount(jData.length);
      }

      if (plRes.ok) {
        const plData = await plRes.json();
        setPlSummary(plData.summary);
      }

      if (tbRes.ok) {
        const tbData = await tbRes.json();
        setTbIsBalanced(tbData?.summary?.isBalanced ?? true);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-xs text-neutral-400 font-mono">Memuat sesi dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-white font-sans overflow-hidden">
      {/* SIDEBAR COMPONENT (LEFT NAVIGATION BAR) */}
      <Sidebar />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto">
        {/* HEADER UTAMA */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">Dashboard Utama</h1>
              <span
                className={`px-2 py-0.5 text-[10px] font-mono border rounded font-bold ${
                  user.role === 'OWNER'
                    ? 'border-amber-500 bg-amber-950 text-amber-300'
                    : user.role === 'FINANCE'
                    ? 'border-blue-500 bg-blue-950 text-blue-300'
                    : 'border-emerald-500 bg-emerald-950 text-emerald-300'
                }`}
              >
                ROLE: {user.role}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Selamat datang kembali, <span className="text-white font-semibold">{user.name}</span>! Ringkasan operasional sistem toko laptop & akuntansi.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-neutral-500 font-mono">AUTENTIKASI AKUN</p>
              <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {user.isTwoFactorEnabled ? '2FA TERPROTEKSI' : 'AKTIF'}
              </p>
            </div>
          </div>
        </header>

        {/* DASHBOARD SPESIFIK UNTUK ROLE KASIR */}
        {user.role === 'KASIR' && (
          <div className="space-y-6">
            <div className="border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                Terminal Penjualan Kasir (POS Interface)
              </h2>
              <p className="text-xs text-neutral-400">
                Panel transaksi penjualan kasir, scan serial number unit, dan pencatatan kas toko.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-neutral-800 bg-neutral-950">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-neutral-400">Penjualan Kasir Hari Ini</CardDescription>
                  <CardTitle className="text-xl font-mono text-emerald-400">Rp 0</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-neutral-500">Otomatis POSTED ke Jurnal POS</p>
                </CardContent>
              </Card>

              <Card className="border-neutral-800 bg-neutral-950">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-neutral-400">Status Shift Kasir</CardDescription>
                  <CardTitle className="text-base text-white font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    SHIFT AKTIF (TERMINAL 1)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-neutral-500">Siap Melayani Transaksi POS</p>
                </CardContent>
              </Card>

              <Card className="border-neutral-800 bg-neutral-950">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-neutral-400">Hak Akses Modul</CardDescription>
                  <CardTitle className="text-xs font-mono text-neutral-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-neutral-500" />
                    KASIR TERMINAL ONLY
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-neutral-500">
                    Akses Modul Keuangan & Audit Ditolak (Strict Access)
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-neutral-800 bg-neutral-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  Aksi Cepat Kasir
                </CardTitle>
                <CardDescription className="text-xs">
                  Buka inventaris unit laptop siap jual atau scan serial number unit di kasir.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-3">
                <Link href="/inventory" className="flex-1">
                  <Button className="w-full justify-between h-11 bg-white text-black hover:bg-neutral-200">
                    <span className="flex items-center gap-2 font-bold">
                      <Laptop className="w-4 h-4" />
                      Buka Modul Inventaris & Mesin Kasir POS
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* DASHBOARD SPESIFIK UNTUK ROLE FINANCE */}
        {user.role === 'FINANCE' && (
          <div className="space-y-6">
            <div className="border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-400" />
                Portal Keuangan & Maker Hub (Finance)
              </h2>
              <p className="text-xs text-neutral-400">
                Kelola pencatatan Arus Kas (Cashflow), Draf Jurnal Umum, dan Buku Besar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-yellow-900/60 bg-neutral-950">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-yellow-400">Draf Menunggu Audit Owner</CardDescription>
                  <CardTitle className="text-xl font-mono text-yellow-300 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {loadingStats ? '...' : `${pendingDraftsCount} Transaksi`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-neutral-500">Dibuat sebagai DRAFT (Belum POSTED)</p>
                </CardContent>
              </Card>

              <Card className="border-neutral-800 bg-neutral-950">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-neutral-400">Estimasi Laba Bersih Periodik</CardDescription>
                  <CardTitle className="text-xl font-mono text-emerald-400">
                    {loadingStats ? '...' : formatRupiah(plSummary?.labaBersih)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-neutral-500">Berdasarkan Jurnal POSTED</p>
                </CardContent>
              </Card>

              <Card className="border-neutral-800 bg-neutral-950">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-neutral-400">Status Balance Neraca</CardDescription>
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    {tbIsBalanced ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        100% BALANCE
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        MEMERLUKAN CEK SELISIH
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-neutral-500">Akuntansi Double-Entry</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-neutral-800 bg-neutral-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Navigasi Utama Finance
                </CardTitle>
                <CardDescription className="text-xs">
                  Akses cepat ke Modul Input Arus Kas, Draf Jurnal, Neraca Saldo, dan Buku Besar.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link href="/inventory">
                  <Button className="w-full justify-between h-11 bg-white text-black hover:bg-neutral-200">
                    <span className="flex items-center gap-2 font-bold">
                      <Laptop className="w-4 h-4" />
                      Manajemen Inventaris & QC
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <Link href="/finance">
                  <Button variant="outline" className="w-full justify-between h-11 border-neutral-700">
                    <span className="flex items-center gap-2 font-medium">
                      <ArrowLeftRight className="w-4 h-4" />
                      Input Arus Kas & Draf Jurnal
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <Link href="/finance">
                  <Button variant="outline" className="w-full justify-between h-11 border-neutral-700">
                    <span className="flex items-center gap-2 font-medium">
                      <BookOpen className="w-4 h-4" />
                      Buka Buku Besar & Laporan
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* DASHBOARD SPESIFIK UNTUK ROLE OWNER */}
        {user.role === 'OWNER' && (
          <div className="space-y-6">
            <div className="border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                Executive Dashboard & Checker Portal (Owner)
              </h2>
              <p className="text-xs text-neutral-400">
                Hak akses tertinggi: Otorisasi Audit Jurnal, Pengawasan Keuangan Toko, dan Keamanan Sistem.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-yellow-900/80 bg-neutral-950">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-yellow-400">Antrean Audit Jurnal (Checker)</CardDescription>
                  <CardTitle className="text-xl font-mono text-yellow-300 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {loadingStats ? '...' : `${pendingDraftsCount} Draf`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-neutral-500">Memerlukan Approve / Reject Owner</p>
                </CardContent>
              </Card>

              <Card className="border-neutral-800 bg-neutral-950">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-neutral-400">Laba Bersih Toko (Net Profit)</CardDescription>
                  <CardTitle className="text-xl font-mono text-emerald-400">
                    {loadingStats ? '...' : formatRupiah(plSummary?.labaBersih)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-neutral-500">Laporan Keuangan Terposting</p>
                </CardContent>
              </Card>

              <Card className="border-neutral-800 bg-neutral-950">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-neutral-400">Audit Balance Neraca</CardDescription>
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    {tbIsBalanced ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        100% BALANCE
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        TIDAK BALANCE
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-neutral-500">Integritas Data Akuntansi</p>
                </CardContent>
              </Card>

              <Card className="border-neutral-800 bg-neutral-950">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-neutral-400">Otoritas User System</CardDescription>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    FULL ADMIN ACCESS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-neutral-500">Role Pemilik Toko (OWNER)</p>
                </CardContent>
              </Card>
            </div>

            {/* Owner Action Hub */}
            <Card className="border-neutral-800 bg-neutral-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  Pusat Kontrol & Otorisasi Owner
                </CardTitle>
                <CardDescription className="text-xs">
                  Lakukan pengesahan Draf Jurnal (Approve) atau tinjau seluruh laporan neraca & laba rugi.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Link href="/inventory">
                  <Button className="w-full justify-between h-11 bg-white text-black hover:bg-neutral-200">
                    <span className="flex items-center gap-2 font-bold">
                      <Laptop className="w-4 h-4" />
                      Manajemen Unit & QC
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <Link href="/finance">
                  <Button variant="outline" className="w-full justify-between h-11 border-neutral-700">
                    <span className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Audit & Approve Jurnal ({pendingDraftsCount})
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <Link href="/finance">
                  <Button variant="outline" className="w-full justify-between h-11 border-neutral-700">
                    <span className="flex items-center gap-2 font-medium">
                      <Scale className="w-4 h-4" />
                      Lihat Neraca & Laba Rugi
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <Link href="/2fa-setup">
                  <Button variant="outline" className="w-full justify-between h-11 border-neutral-700">
                    <span className="flex items-center gap-2 font-medium">
                      <Lock className="w-4 h-4" />
                      Security 2FA
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
