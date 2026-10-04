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
  RotateCcw,
  Ban,
  Loader2,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [pendingDraftsCount, setPendingDraftsCount] = useState<number>(0);
  const [plSummary, setPlSummary] = useState<any>(null);
  const [tbIsBalanced, setTbIsBalanced] = useState<boolean>(true);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [posTransactions, setPosTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(false);
  const [isVoiding, setIsVoiding] = useState<string | null>(null);
  const [voidFeedback, setVoidFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

        if (parsedUser.role === 'OWNER') {
          fetchTransactions(parsedUser);
        }
      } catch (e) {
        setUser(null);
      }
    }
  }, [router]);

  const fetchTransactions = async (currentUser?: any) => {
    setLoadingTransactions(true);
    try {
      const activeUser = currentUser || user;
      const res = await fetch('/api/pos/transactions', {
        headers: {
          'x-user-role': activeUser?.role || 'OWNER',
          'x-user-name': activeUser?.name || 'Owner',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPosTransactions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load POS transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleVoidTransaction = async (invoiceNumber: string) => {
    const confirmed = window.confirm(
      `Peringatan Otoritas Owner:\n\nApakah Anda yakin ingin membatalkan (VOID) nota [${invoiceNumber}]?\n\n- Seluruh unit laptop akan otomatis dikembalikan ke status 'AVAILABLE'.\n- Jurnal Pembalik (Reversal) akan otomatis dicatat untuk merapikan Laba/Rugi.`
    );
    if (!confirmed) return;

    setIsVoiding(invoiceNumber);
    setVoidFeedback(null);

    try {
      const res = await fetch(`/api/pos/void/${encodeURIComponent(invoiceNumber)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'OWNER',
          'x-user-name': user?.name || 'Dimas Owner',
          'x-user-id': user?.id || 'owner-id',
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal membatalkan transaksi');
      }

      setVoidFeedback({
        type: 'success',
        message: data.message || `Invoice [${invoiceNumber}] berhasil di-VOID!`,
      });

      // Refresh data transaksi & neraca/laba rugi otomatis
      await Promise.all([fetchTransactions(), fetchDashboardStats()]);
    } catch (err: any) {
      setVoidFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat membatalkan transaksi',
      });
    } finally {
      setIsVoiding(null);
    }
  };

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
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      {/* SIDEBAR COMPONENT (LEFT NAVIGATION BAR) */}
      <Sidebar />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 min-w-0 p-6 lg:p-8 space-y-6 overflow-y-auto">
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

            {/* TABEL RIWAYAT TRANSAKSI POS & KONTROL VOID OWNER */}
            <Card className="border-neutral-800 bg-neutral-950 shadow-xl">
              <CardHeader className="pb-3 border-b border-neutral-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-emerald-400" />
                      Riwayat Transaksi Penjualan Kasir (POS)
                    </CardTitle>
                    <CardDescription className="text-xs text-neutral-400 mt-0.5">
                      Pengawasan nota kasir. Owner memiliki wewenang membatalkan transaksi (VOID) dengan Auto-Reversal Journal.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchTransactions()}
                    className="h-8 text-xs border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white"
                  >
                    Refresh Nota
                  </Button>
                </div>

                {/* Feedback Alert Void */}
                {voidFeedback && (
                  <div
                    className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
                      voidFeedback.type === 'error'
                        ? 'border border-red-900 bg-red-950/50 text-red-200'
                        : 'border border-emerald-900 bg-emerald-950/50 text-emerald-200'
                    }`}
                  >
                    {voidFeedback.type === 'error' ? (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>{voidFeedback.message}</span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-0">
                {loadingTransactions ? (
                  <div className="py-12 text-center text-neutral-500 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Memuat riwayat transaksi kasir...</span>
                  </div>
                ) : posTransactions.length === 0 ? (
                  <div className="py-12 text-center text-neutral-500 text-xs">
                    Belum ada riwayat transaksi kasir yang tercatat di database.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-neutral-800 hover:bg-transparent">
                          <TableHead className="text-xs font-semibold text-neutral-400">No. Invoice</TableHead>
                          <TableHead className="text-xs font-semibold text-neutral-400">Waktu</TableHead>
                          <TableHead className="text-xs font-semibold text-neutral-400">Kasir</TableHead>
                          <TableHead className="text-xs font-semibold text-neutral-400">Unit / Serial Number</TableHead>
                          <TableHead className="text-right text-xs font-semibold text-neutral-400">Total Penjualan</TableHead>
                          <TableHead className="text-center text-xs font-semibold text-neutral-400">Status</TableHead>
                          <TableHead className="text-center text-xs font-semibold text-neutral-400">Aksi Otoritas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {posTransactions.map((tx: any) => {
                          const isVoid = tx.status === 'VOID';
                          const displayInvoice = tx.invoiceNumber || tx.id.slice(0, 13);
                          const dateFormatted = new Date(tx.tanggal).toLocaleString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          });

                          return (
                            <TableRow key={tx.id} className="border-neutral-800 hover:bg-neutral-900/40">
                              <TableCell className="font-mono text-xs font-bold text-white">
                                {displayInvoice}
                              </TableCell>
                              <TableCell className="text-xs text-neutral-400 whitespace-nowrap">
                                {dateFormatted}
                              </TableCell>
                              <TableCell className="text-xs text-neutral-300">
                                {tx.cashierName || 'Kasir'}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-neutral-300 max-w-[220px] truncate">
                                {tx.serialNumber}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-white text-xs">
                                {formatRupiah(Number(tx.totalPrice))}
                              </TableCell>
                              <TableCell className="text-center">
                                {isVoid ? (
                                  <Badge variant="outline" className="border-red-800 bg-red-950/60 text-red-300 text-[10px] font-mono">
                                    VOID
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-emerald-800 bg-emerald-950/60 text-emerald-300 text-[10px] font-mono">
                                    SUCCESS
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {isVoid ? (
                                  <span className="text-[11px] text-neutral-500 font-mono italic">
                                    Dibatalkan
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isVoiding === (tx.invoiceNumber || tx.id)}
                                    onClick={() => handleVoidTransaction(tx.invoiceNumber || tx.id)}
                                    className="h-7 px-3 text-xs font-semibold border-red-800 bg-red-950/50 text-red-300 hover:bg-red-800 hover:text-white transition-all cursor-pointer gap-1.5"
                                  >
                                    {isVoiding === (tx.invoiceNumber || tx.id) ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Proses...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Ban className="w-3.5 h-3.5 text-red-400" />
                                        <span>Void Transaksi</span>
                                      </>
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
