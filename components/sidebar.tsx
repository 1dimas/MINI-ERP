'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Laptop,
  ArrowLeftRight,
  Scale,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  ChevronRight,
  ChevronDown,
  Store,
  Folder,
  Receipt,
  Boxes,
  Wallet,
  CheckCircle2,
  Clock,
  BadgeCheck,
  FileText,
  BookOpen,
  Users,
} from 'lucide-react';
import { hasPermission } from '@/lib/permissions';

interface SubNavItem {
  title: string;
  href: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  type: 'group';
  title: string;
  icon: any;
  items: SubNavItem[];
}

interface SingleNavItem {
  type: 'link';
  title: string;
  href: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  subItems?: { title: string; href: string; icon?: any }[];
}

type NavEntry = NavGroup | SingleNavItem;

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'INVENTARIS & BARANG': true,
    'KEUANGAN & AKUNTANSI': true,
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {}
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    router.push('/login');
  };

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const currentRole = user?.role || 'KASIR';

  // Saring Navigasi Berdasarkan Role Asli (RBAC Murni Tanpa Simulasi)
  // Saring Navigasi Berdasarkan Role & Hak Akses Fitur Dinamis
  const getNavEntries = (): NavEntry[] => {
    // Role OWNER selalu melihat seluruh navigasi penuh
    if (currentRole === 'OWNER') {
      return [
        {
          type: 'link',
          title: 'Dashboard Utama',
          href: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          type: 'link',
          title: 'Terminal Kasir (POS)',
          href: '/pos',
          icon: Store,
          badge: 'POS',
          badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
        },
        {
          type: 'group',
          title: 'INVENTARIS & BARANG',
          icon: Boxes,
          items: [
            {
              title: 'Katalog & Data Barang',
              href: '/inventory?tab=models',
              icon: Folder,
            },
            {
              title: 'Manajemen Unit & Stok',
              href: '/inventory?tab=units',
              icon: Laptop,
            },
            {
              title: 'QC & Approval Unit',
              href: '/inventory?tab=qc',
              icon: BadgeCheck,
              badge: 'AUDIT',
              badgeColor: 'bg-yellow-950 text-yellow-300 border-yellow-800',
            },
            {
              title: 'Riwayat Pembelian',
              href: '/inventory?tab=purchases',
              icon: Receipt,
            },
          ],
        },
        {
          type: 'group',
          title: 'KEUANGAN & AKUNTANSI',
          icon: Wallet,
          items: [
            {
              title: 'Jurnal Umum',
              href: '/finance?tab=jurnal',
              icon: FileText,
              badge: 'AUDIT',
              badgeColor: 'bg-yellow-950 text-yellow-300 border-yellow-800',
            },
            {
              title: 'Buku Besar (Ledger)',
              href: '/finance?tab=buku-besar',
              icon: BookOpen,
            },
            {
              title: 'Neraca & Laporan',
              href: '/finance?tab=neraca',
              icon: Scale,
              badge: 'LAPORAN',
              badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
            },
            {
              title: 'Arus Kas (Cashflow)',
              href: '/finance?tab=cashflow',
              icon: ArrowLeftRight,
            },
          ],
        },
        {
          type: 'link',
          title: 'Manajemen Akun & SDM',
          href: '/accounts',
          icon: Users,
          badge: 'SECURITY',
          badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
        },
        {
          type: 'link',
          title: 'Keamanan Akun (2FA)',
          href: '/2fa-setup',
          icon: ShieldCheck,
        },
        {
          type: 'link',
          title: 'Profil & Kredensial',
          href: '/profile',
          icon: UserIcon,
        },
      ];
    }

    // Role Karyawan Lain: Tampilkan modul secara DINAMIS berdasarkan hak akses fitur
    const entries: NavEntry[] = [];

    // 1. Dashboard Ringkasan
    if (
      currentRole === 'FINANCE' ||
      hasPermission(user, 'ACCOUNT_MANAGE') ||
      hasPermission(user, 'FINANCE_JOURNAL') ||
      hasPermission(user, 'FINANCE_REPORT')
    ) {
      entries.push({
        type: 'link',
        title: 'Dashboard Ringkasan',
        href: '/dashboard',
        icon: LayoutDashboard,
      });
    }

    // 2. Terminal Kasir (POS)
    if (hasPermission(user, 'POS_CHECKOUT')) {
      entries.push({
        type: 'link',
        title: 'Terminal Kasir (POS)',
        href: '/pos',
        icon: Store,
        badge: 'UTAMA',
        badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
      });
    }

    // 3. Riwayat Transaksi (Khusus jika memiliki izin riwayat transaksi)
    if (hasPermission(user, 'POS_HISTORY') && !hasPermission(user, 'FINANCE_JOURNAL')) {
      entries.push({
        type: 'link',
        title: 'Riwayat Transaksi',
        href: '/pos?tab=history',
        icon: Receipt,
        badge: 'READ ONLY',
        badgeColor: 'bg-neutral-800 text-neutral-300 border-neutral-700',
      });
    }

    // 4. Modul Inventaris & Stok
    const canViewInv = hasPermission(user, 'INVENTORY_VIEW');
    const canManageInv = hasPermission(user, 'INVENTORY_MANAGE');
    const canQcInv = hasPermission(user, 'INVENTORY_QC');
    const canPurchaseInv = hasPermission(user, 'INVENTORY_PURCHASE');

    if (canManageInv || canQcInv || canPurchaseInv) {
      const invItems: SubNavItem[] = [];
      if (canManageInv) {
        invItems.push({
          title: 'Katalog & Data Barang',
          href: '/inventory?tab=models',
          icon: Folder,
        });
        invItems.push({
          title: 'Manajemen Unit & Stok',
          href: '/inventory?tab=units',
          icon: Laptop,
        });
      }
      if (canQcInv) {
        invItems.push({
          title: 'QC & Approval Unit',
          href: '/inventory?tab=qc',
          icon: BadgeCheck,
          badge: 'AUDIT',
          badgeColor: 'bg-yellow-950 text-yellow-300 border-yellow-800',
        });
      }
      if (canPurchaseInv) {
        invItems.push({
          title: 'Riwayat Pembelian',
          href: '/inventory?tab=purchases',
          icon: Receipt,
          badge: 'EDIT',
          badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
        });
      }

      if (invItems.length > 0) {
        entries.push({
          type: 'group',
          title: 'INVENTARIS & BARANG',
          icon: Boxes,
          items: invItems,
        });
      }
    } else if (canViewInv) {
      entries.push({
        type: 'link',
        title: 'Cek Ketersediaan Stok',
        href: '/inventory',
        icon: Laptop,
        badge: 'STOK',
        badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
        subItems: [
          {
            title: 'Unit Siap Jual (Ready)',
            href: '/inventory?status=AVAILABLE',
            icon: CheckCircle2,
          },
          {
            title: 'Pending QC / Masuk',
            href: '/inventory?status=QC_PENDING',
            icon: Clock,
          },
        ],
      });
    }

    // 5. Modul Keuangan & Akuntansi
    const canJournal = hasPermission(user, 'FINANCE_JOURNAL');
    const canLedger = hasPermission(user, 'FINANCE_LEDGER');
    const canReport = hasPermission(user, 'FINANCE_REPORT');
    const canCashflow = hasPermission(user, 'FINANCE_CASHFLOW');

    if (canJournal || canLedger || canReport || canCashflow) {
      const finItems: SubNavItem[] = [];
      if (canJournal) {
        finItems.push({
          title: 'Jurnal Umum',
          href: '/finance?tab=jurnal',
          icon: FileText,
          badge: 'AUDIT',
          badgeColor: 'bg-yellow-950 text-yellow-300 border-yellow-800',
        });
      }
      if (canLedger) {
        finItems.push({
          title: 'Buku Besar (Ledger)',
          href: '/finance?tab=buku-besar',
          icon: BookOpen,
        });
      }
      if (canReport) {
        finItems.push({
          title: 'Neraca & Laporan',
          href: '/finance?tab=neraca',
          icon: Scale,
          badge: 'LAPORAN',
          badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
        });
      }
      if (canCashflow) {
        finItems.push({
          title: 'Arus Kas (Cashflow)',
          href: '/finance?tab=cashflow',
          icon: ArrowLeftRight,
        });
      }

      if (finItems.length > 0) {
        entries.push({
          type: 'group',
          title: 'KEUANGAN & AKUNTANSI',
          icon: Wallet,
          items: finItems,
        });
      }
    }

    // 6. Modul Manajemen SDM
    if (hasPermission(user, 'ACCOUNT_MANAGE')) {
      entries.push({
        type: 'link',
        title: 'Manajemen Akun & SDM',
        href: '/accounts',
        icon: Users,
        badge: 'SECURITY',
        badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
      });
    }

    // 7. Keamanan & Profil (Selalu ada)
    entries.push({
      type: 'link',
      title: 'Keamanan Akun (2FA)',
      href: '/2fa-setup',
      icon: ShieldCheck,
    });
    entries.push({
      type: 'link',
      title: 'Profil & Kredensial',
      href: '/profile',
      icon: UserIcon,
    });

    return entries;
  };

  const navEntries = getNavEntries();

  // Helper untuk cek link aktif
  const isLinkActive = (href: string) => {
    const [pathPart, queryPart] = href.split('?');
    if (pathname !== pathPart) return false;

    if (queryPart) {
      const urlParams = new URLSearchParams(queryPart);
      for (const [key, val] of urlParams.entries()) {
        const currentVal = searchParams.get(key);
        if (key === 'tab') {
          if (val === 'jurnal' && (!currentVal || currentVal === 'jurnal' || currentVal === 'accounting')) {
            continue;
          }
        }
        if (currentVal !== val) return false;
      }
      return true;
    }

    // Default jika tanpa query
    return !searchParams.get('tab') && !searchParams.get('status');
  };

  return (
    <aside className="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 text-white font-sans z-30 select-none">
      {/* BRAND & HEADER & NAV LINKS */}
      <div className="p-4 space-y-5 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:#262626_transparent]">
        {/* BRAND LOGO */}
        <div className="flex items-center gap-3 px-1">
          <div className="p-2.5 bg-gradient-to-br from-white to-neutral-200 text-black rounded-xl font-black flex items-center justify-center shadow-lg shadow-white/5">
            <Store className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="font-black text-sm text-white tracking-wider uppercase">SOLIT POS</h2>
            <p className="text-[10px] text-neutral-400 font-mono">ERP & POS Toko Laptop</p>
          </div>
        </div>

        {/* LOGGED IN USER PROFILE CARD (STRICT AUTHENTICATED USER) */}
        {user ? (
          <div className="p-3 bg-neutral-900/90 border border-neutral-800/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-neutral-800/80 rounded-lg text-neutral-300">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-neutral-400 truncate font-mono">{user.email}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800/70 flex items-center justify-between text-[10px] font-mono">
              <span className="text-neutral-400">Hak Akses:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold ${
                  user.role === 'OWNER'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-600/40'
                    : user.role === 'FINANCE'
                    ? 'bg-blue-500/15 text-blue-300 border border-blue-600/40'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-600/40'
                }`}
              >
                {user.role}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-[11px] text-neutral-400 font-mono">
            Memuat profil akun...
          </div>
        )}

        {/* NAVIGATION SECTIONS */}
        <nav className="space-y-4 pt-1">
          {navEntries.map((entry, idx) => {
            if (entry.type === 'link') {
              const active = isLinkActive(entry.href);
              const IconComp = entry.icon;

              return (
                <div key={idx} className="space-y-1">
                  <Link
                    href={entry.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      active
                        ? 'bg-white text-black font-bold shadow-md shadow-white/5'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComp className={`w-4 h-4 ${active ? 'text-black' : 'text-neutral-400'}`} />
                      <span>{entry.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {entry.badge && (
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-mono rounded border ${
                            entry.badgeColor || 'bg-neutral-800 text-neutral-300 border-neutral-700'
                          }`}
                        >
                          {entry.badge}
                        </span>
                      )}
                      <ChevronRight className={`w-3.5 h-3.5 ${active ? 'text-neutral-400' : 'text-neutral-600'}`} />
                    </div>
                  </Link>

                  {/* Sub-items if any (e.g. Kasir status quick-links) */}
                  {entry.subItems && (
                    <div className="pl-4 pr-1 py-1 space-y-1 border-l border-neutral-800/80 ml-4">
                      {entry.subItems.map((sub, sIdx) => {
                        const subActive = isLinkActive(sub.href);
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sIdx}
                            href={sub.href}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${
                              subActive
                                ? 'bg-neutral-800 text-white font-semibold'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                            }`}
                          >
                            {SubIcon && <SubIcon className="w-3.5 h-3.5 text-neutral-400" />}
                            <span>{sub.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Group Menu (Sub-menu collapsible)
            if (entry.type === 'group') {
              const isOpen = openGroups[entry.title] ?? true;
              const GroupIcon = entry.icon;

              return (
                <div key={idx} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(entry.title)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-mono text-neutral-400 uppercase tracking-wider hover:text-neutral-200 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <GroupIcon className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{entry.title}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-3 h-3 text-neutral-500" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-neutral-500" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="space-y-0.5 pl-1.5">
                      {entry.items.map((item, iIdx) => {
                        const itemActive = isLinkActive(item.href);
                        const ItemIcon = item.icon;

                        return (
                          <Link
                            key={iIdx}
                            href={item.href}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                              itemActive
                                ? 'bg-neutral-800 text-white font-bold border border-neutral-700 shadow-sm'
                                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <ItemIcon className={`w-3.5 h-3.5 ${itemActive ? 'text-white' : 'text-neutral-500'}`} />
                              <span>{item.title}</span>
                            </div>
                            {item.badge && (
                              <span
                                className={`px-1.5 py-0.2 text-[9px] font-mono rounded border ${
                                  item.badgeColor || 'bg-neutral-900 text-neutral-300 border-neutral-700'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </nav>
      </div>

      {/* FOOTER & LOGOUT */}
      <div className="p-4 border-t border-neutral-800/80 space-y-3 shrink-0 bg-neutral-950">
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span className="flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            2FA Active
          </span>
          <span className="font-mono text-[10px] text-neutral-600">v1.0.0</span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 border border-red-900/40 bg-red-950/20 hover:bg-red-950/50 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Keluar (Logout)
        </button>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  return (
    <React.Suspense
      fallback={
        <aside className="w-64 bg-neutral-950 border-r border-neutral-800 shrink-0 h-screen sticky top-0" />
      }
    >
      <SidebarContent />
    </React.Suspense>
  );
}

