'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Laptop,
  ArrowLeftRight,
  Scale,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  ShoppingCart,
  ChevronRight,
  Store,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const changeRole = (newRole: 'OWNER' | 'FINANCE' | 'KASIR') => {
    const updatedUser = {
      ...user,
      role: newRole,
      name: newRole === 'OWNER' ? 'Dimas Owner' : newRole === 'FINANCE' ? 'Siti Keuangan' : 'Budi Kasir',
    };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    window.location.reload();
  };

  // Saring menu sidebar berdasarkan Role pengguna (RBAC)
  const getNavItems = () => {
    const currentRole = user?.role || 'KASIR';

    // 1. Role KASIR: Hanya melihat Terminal Kasir & Katalog Stok (Read-Only)
    if (currentRole === 'KASIR') {
      return [
        {
          title: 'Terminal Kasir (POS)',
          href: '/pos',
          icon: Store,
          badge: 'UTAMA',
        },
        {
          title: 'Katalog & Stok Barang',
          href: '/inventory',
          icon: Laptop,
          badge: 'LIHAT',
        },
        {
          title: 'Keamanan 2FA',
          href: '/2fa-setup',
          icon: ShieldCheck,
        },
      ];
    }

    // 2. Role FINANCE: Kelola barang (CRUD) & Akuntansi/Arus Kas (TIDAK ADA KASIR)
    if (currentRole === 'FINANCE') {
      return [
        {
          title: 'Dashboard Utama',
          href: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          title: 'Inventaris & Data Barang',
          href: '/inventory',
          icon: Laptop,
          badge: 'CRUD',
        },
        {
          title: 'Jurnal & Arus Kas',
          href: '/finance',
          icon: ArrowLeftRight,
        },
        {
          title: 'Laporan & Neraca',
          href: '/finance',
          icon: Scale,
        },
        {
          title: 'Keamanan 2FA',
          href: '/2fa-setup',
          icon: ShieldCheck,
        },
      ];
    }

    // 3. Role OWNER: Super Admin (Bisa lihat dan akses SEMUA)
    return [
      {
        title: 'Dashboard Utama',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Terminal Kasir (POS)',
        href: '/pos',
        icon: Store,
        badge: 'POS',
      },
      {
        title: 'Inventaris & QC Unit',
        href: '/inventory',
        icon: Laptop,
        badge: 'ALL',
      },
      {
        title: 'Jurnal & Arus Kas',
        href: '/finance',
        icon: ArrowLeftRight,
      },
      {
        title: 'Laporan & Neraca',
        href: '/finance',
        icon: Scale,
      },
      {
        title: 'Keamanan 2FA',
        href: '/2fa-setup',
        icon: ShieldCheck,
      },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 text-white font-sans z-30 select-none">
      {/* BRAND & HEADER & NAV LINKS (SCROLLABLE AREA JIKA LAYAR PENDEK) */}
      <div className="p-5 space-y-6 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:#262626_transparent]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white text-black rounded-xl font-bold flex items-center justify-center shadow-lg">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-sm text-white tracking-wider uppercase">SOLIT POS</h2>
            <p className="text-[10px] text-neutral-400 font-mono">ERP & POS Toko Laptop</p>
          </div>
        </div>

        {/* USER PROFILE CARD */}
        {user && (
          <div className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-neutral-800 rounded-lg">
                  <UserIcon className="w-4 h-4 text-white" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-neutral-400 truncate">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px] font-mono">
              <span className="text-neutral-400">Hak Akses:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold ${
                  user.role === 'OWNER'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-600/50'
                    : user.role === 'FINANCE'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-600/50'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-600/50'
                }`}
              >
                {user.role}
              </span>
            </div>
          </div>
        )}

        {/* DEMO ROLE SWITCHER WIDGET */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-neutral-500 uppercase px-1">Simulasi Role User:</p>
          <div className="grid grid-cols-3 gap-1 bg-black p-1 border border-neutral-800 rounded-lg text-[10px] font-mono">
            {(['OWNER', 'FINANCE', 'KASIR'] as const).map((r) => (
              <button
                key={r}
                onClick={() => changeRole(r)}
                className={`py-1 rounded font-bold transition cursor-pointer ${
                  user?.role === r
                    ? 'bg-white text-black shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="space-y-1">
          <p className="text-[10px] font-mono text-neutral-500 uppercase px-1 pb-1">Fitur Utama System:</p>
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const IconComponent = item.icon;

            return (
              <Link
                key={index}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-neutral-800 text-white font-bold border border-neutral-700 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                  <span>{item.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  {item.badge && (
                    <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 text-[9px] font-mono rounded border border-emerald-800">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-3 h-3 text-neutral-600" />
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* FOOTER & LOGOUT BUTTON (PINNED AT THE BOTTOM) */}
      <div className="p-4 border-t border-neutral-800 space-y-3 shrink-0 bg-neutral-950">
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span className="flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            2FA Active
          </span>
          <span className="font-mono text-[10px] text-neutral-600">v1.0.0</span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 border border-red-900/50 bg-red-950/20 hover:bg-red-950/60 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Keluar (Logout)
        </button>
      </div>
    </aside>
  );
}
