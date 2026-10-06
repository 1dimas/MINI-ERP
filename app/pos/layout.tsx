'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  Lock,
  Unlock,
  Loader2,
  Clock,
  LogOut,
  LayoutDashboard,
  Laptop,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePosStore } from '@/store/usePosStore';

export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const {
    user,
    setUser,
    currentShift,
    isLoadingShift,
    fetchCurrentShift,
    setIsOpenShiftModal,
    setIsCloseShiftModal,
  } = usePosStore();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Real-time Digital Clock (Update tiap detik)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const dateStr = now.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      setCurrentTime(`${timeStr} WIB`);
      setCurrentDate(dateStr);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load user session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          fetchCurrentShift(parsed.id, parsed.role);
        } catch {
          // ignore
        }
      } else {
        fetchCurrentShift();
      }
    }
  }, []);

  const handleLogout = () => {
    Cookies.remove('access_token');
    Cookies.remove('token');
    Cookies.remove('user_role');
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    router.push('/login');
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const isOwner = user?.role === 'OWNER';

  return (
    <div className="h-screen w-screen overflow-hidden bg-neutral-950 text-white flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* ============================================================ */}
      {/* HEADER POS TOP BAR (ISOLASI KHUSUS KASIR - TANPA SIDEBAR)   */}
      {/* ============================================================ */}
      <header className="border-b border-neutral-800 bg-black/80 backdrop-blur-md px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0 z-30 select-none">
        {/* Sisi Kiri: Branding POS */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-black text-sm shadow-md shadow-emerald-500/20">
            POS
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              SOLIT POS <span className="text-[10px] text-neutral-400 font-normal">v1.0 (Zero-Friction)</span>
            </h1>
            <p className="text-[11px] text-neutral-400">Terminal Kasir & Integrasi Otomatis Akuntansi</p>
          </div>
        </div>

        {/* Sisi Tengah / Kanan: Status Shift, Jam Real-time, Nama Kasir, Owner Action, & Logout */}
        <div className="flex items-center gap-2.5 sm:gap-3 text-xs">
          {/* 1. Status Shift (Buka / Tutup) */}
          {isLoadingShift ? (
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-full text-neutral-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-[11px]">Memeriksa Shift...</span>
            </div>
          ) : currentShift ? (
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-semibold text-[11px]">Shift Aktif</span>
              <span className="text-neutral-600 hidden sm:inline">•</span>
              <span className="text-neutral-400 hidden md:inline text-[11px]">
                Modal: <strong className="text-white">{formatRupiah(Number(currentShift.shift?.startingCash || 0))}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCloseShiftModal(true)}
                className="h-6 px-2 text-[10px] bg-red-950 hover:bg-red-900 text-red-200 border border-red-800/80 rounded-full font-medium ml-1 cursor-pointer flex items-center gap-1"
              >
                <Lock className="w-3 h-3" />
                <span>Tutup Shift</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-800/60 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-300 font-medium text-[11px]">Shift Tutup</span>
              <Button
                size="sm"
                onClick={() => setIsOpenShiftModal(true)}
                className="h-6 px-2 text-[10px] bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full ml-1 cursor-pointer flex items-center gap-1"
              >
                <Unlock className="w-3 h-3" />
                <span>Buka Shift</span>
              </Button>
            </div>
          )}

          {/* 2. Jam Real-Time */}
          {currentTime && (
            <div className="hidden md:flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-800 px-3 py-1 rounded-full text-neutral-300 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              <span>{currentTime}</span>
              <span className="text-neutral-600">|</span>
              <span className="text-neutral-400 text-[10px]">{currentDate}</span>
            </div>
          )}

          {/* 3. Nama Kasir & Badge Role */}
          <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
            <span className="text-neutral-300 text-[11px]">
              Kasir: <strong className="text-white">{user?.name || 'Budi Kasir'}</strong>
            </span>
            <Badge variant="outline" className="text-[9px] border-neutral-700 text-neutral-300 py-0 px-1.5">
              {user?.role || 'KASIR'}
            </Badge>
          </div>

          {/* 4. Tombol Riwayat Transaksi (Read-Only untuk Kasir & Owner) */}
          <Link href="/pos?tab=history">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs text-neutral-300 hover:text-white border-neutral-800 bg-neutral-900 cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Riwayat Nota</span>
            </Button>
          </Link>

          {/* 5. Tombol Cek Stok Barang (Read-Only untuk Kasir & Owner) */}
          <Link href="/inventory">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs text-neutral-300 hover:text-white border-neutral-800 bg-neutral-900 cursor-pointer"
            >
              <Laptop className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Cek Stok</span>
            </Button>
          </Link>

          {/* 5. Khusus Role 'OWNER': Tombol "Kembali ke Dasbor" */}
          {isOwner && (
            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs text-amber-300 hover:text-amber-200 border-amber-800/80 bg-amber-950/40 hover:bg-amber-900/50 cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
                <span>Kembali ke Dasbor</span>
              </Button>
            </Link>
          )}

          {/* 6. Tombol Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* BODY KASIR (FULL SCREEN VIEW)                                */}
      {/* ============================================================ */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {children}
      </div>
    </div>
  );
}
