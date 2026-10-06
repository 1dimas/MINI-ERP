'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  KeyRound,
  FileWarning,
  X,
  Loader2,
  History,
  Lock,
  Mail,
  User,
  ShieldOff,
  Clock,
  RotateCcw,
  Archive,
  UserX,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  APP_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  getEffectivePermissions,
  PermissionDefinition,
} from '@/lib/permissions';

interface WarningItem {
  id: string;
  reason: string;
  createdAt: string;
  issuedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

interface AccountItem {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'FINANCE' | 'KASIR';
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  suspendedAt?: string | null;
  daysSuspended?: number;
  remainingDays?: number;
  canRestore?: boolean;
  permissions?: string[];
  effectivePermissions?: string[];
  isTwoFactorEnabled: boolean;
  warningCount: number;
  isCriticalSp: boolean;
  receivedWarnings: WarningItem[];
}

export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-neutral-950 text-white">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      }
    >
      <AccountsContent />
    </Suspense>
  );
}

function AccountsContent() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'OWNER' | 'FINANCE' | 'KASIR'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'>('ALL');

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal Create
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'KASIR' as 'KASIR' | 'FINANCE',
    permissions: ROLE_DEFAULT_PERMISSIONS['KASIR'],
  });
  const [showCreateCustomPerms, setShowCreateCustomPerms] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Modal Terbitkan SP
  const [spTargetAccount, setSpTargetAccount] = useState<AccountItem | null>(null);
  const [spReason, setSpReason] = useState('');
  const [submittingSp, setSubmittingSp] = useState(false);

  // Modal Riwayat SP
  const [viewHistoryAccount, setViewHistoryAccount] = useState<AccountItem | null>(null);

  // Modal Kelola Hak Akses Fitur (Dynamic Feature Flags)
  const [permTargetAccount, setPermTargetAccount] = useState<AccountItem | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submittingPerms, setSubmittingPerms] = useState(false);

  // Action Loading tracking
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Helper untuk melampirkan JWT token dari localStorage ke request header
  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchAccounts = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch('/api/account/list', {
        headers: {
          ...getAuthHeaders(),
        },
      });
      if (res.status === 401 || res.status === 403) {
        showToast('Akses ditolak: Anda tidak memiliki wewenang Owner.', 'error');
        router.push('/dashboard');
        return;
      }
      if (!res.ok) {
        throw new Error('Gagal memuat data akun');
      }
      const data = await res.json();
      setAccounts(data);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat data karyawan', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        if (parsed.role !== 'OWNER') {
          router.push(parsed.role === 'KASIR' ? '/pos' : '/dashboard');
          return;
        }
      } catch (e) {}
    }
    fetchAccounts();
  }, [router]);

  // Handle Tambah Karyawan
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      showToast('Seluruh formulir wajib diisi', 'error');
      return;
    }
    setSubmittingCreate(true);
    try {
      const res = await fetch('/api/account/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal membuat akun');
      }
      showToast(`Akun ${data.name} (${data.role}) berhasil ditambahkan dengan hak akses fitur terpilih!`, 'success');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'KASIR',
        permissions: ROLE_DEFAULT_PERMISSIONS['KASIR'],
      });
      setShowCreateCustomPerms(false);
      fetchAccounts(true);
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan akun', 'error');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Handle Suspend (Nonaktifkan dengan Masa Tenggang 3 Minggu)
  const handleSuspend = async (account: AccountItem) => {
    if (
      !confirm(
        `Nonaktifkan akun ${account.name} (${account.email})?\n\n• Token login akan ditolak seketika.\n• Masa tenggang (Grace Period) 3 minggu (21 hari) akan dimulai.\n• Anda dapat memulihkan (Restore) akun ini kapan saja sebelum 21 hari berakhir.`
      )
    ) {
      return;
    }

    setActionLoadingId(account.id);
    try {
      const res = await fetch(`/api/account/${account.id}/suspend`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menonaktifkan akun');
      }
      showToast(data.message || `Akun ${account.name} dinonaktifkan (SUSPENDED)`, 'success');
      fetchAccounts(true);
    } catch (err: any) {
      showToast(err.message || 'Gagal menonaktifkan akun', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Restore (Pulihkan dalam batas 21 hari)
  const handleRestore = async (account: AccountItem) => {
    if (
      !confirm(
        `Pulihkan kembali akun ${account.name} (${account.email})?\n\nStatus akan kembali menjadi ACTIVE dan karyawan dapat login kembali.`
      )
    ) {
      return;
    }

    setActionLoadingId(account.id);
    try {
      const res = await fetch(`/api/account/${account.id}/restore`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memulihkan akun');
      }
      showToast(data.message || `Akun ${account.name} berhasil dipulihkan!`, 'success');
      fetchAccounts(true);
    } catch (err: any) {
      showToast(err.message || 'Gagal memulihkan akun', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reset 2FA
  const handleReset2Fa = async (account: AccountItem) => {
    if (
      !confirm(
        `Reset 2FA darurat untuk ${account.name}?\n\nKaryawan ini tidak lagi terkunci oleh OTP lama dan bisa login langsung untuk mendaftarkan 2FA baru di HP barunya.`
      )
    ) {
      return;
    }

    setActionLoadingId(account.id);
    try {
      const res = await fetch(`/api/account/${account.id}/reset-2fa`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal reset 2FA');
      }
      showToast(data.message || '2FA berhasil di-reset', 'success');
      fetchAccounts(true);
    } catch (err: any) {
      showToast(err.message || 'Gagal mereset 2FA', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Terbitkan SP
  const handleIssueSpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spTargetAccount || !spReason.trim()) {
      showToast('Alasan penerbitan SP wajib diisi', 'error');
      return;
    }

    setSubmittingSp(true);
    try {
      const res = await fetch(`/api/account/${spTargetAccount.id}/sp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ reason: spReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menerbitkan SP');
      }
      showToast(data.message || 'Surat Peringatan berhasil diterbitkan', 'success');
      setSpTargetAccount(null);
      setSpReason('');
      fetchAccounts(true);
    } catch (err: any) {
      showToast(err.message || 'Gagal menerbitkan SP', 'error');
    } finally {
      setSubmittingSp(false);
    }
  };

  // Buka Modal Kelola Fitur
  const handleOpenPermModal = (account: AccountItem) => {
    setPermTargetAccount(account);
    const currentPerms =
      account.permissions && account.permissions.length > 0
        ? account.permissions
        : ROLE_DEFAULT_PERMISSIONS[account.role] || [];
    setSelectedPermissions(currentPerms);
  };

  // Toggle Satu Fitur
  const handleTogglePermission = (permKey: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((k) => k !== permKey) : [...prev, permKey]
    );
  };

  // Reset ke Template Default Role
  const handleResetToRoleDefault = () => {
    if (!permTargetAccount) return;
    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[permTargetAccount.role] || [];
    setSelectedPermissions(defaultPerms);
    showToast(`Direset ke template default role ${permTargetAccount.role}`, 'success');
  };

  // Pilih Semua Fitur
  const handleSelectAllPerms = () => {
    setSelectedPermissions(APP_PERMISSIONS.map((p) => p.key));
  };

  // Kosongkan Semua Fitur
  const handleClearAllPerms = () => {
    setSelectedPermissions([]);
  };

  // Simpan Perubahan Fitur
  const handleSavePermissions = async () => {
    if (!permTargetAccount) return;
    setSubmittingPerms(true);
    try {
      const res = await fetch(`/api/account/${permTargetAccount.id}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memperbarui izin fitur');
      }
      showToast(`Hak akses fitur untuk ${permTargetAccount.name} berhasil disimpan!`, 'success');
      setPermTargetAccount(null);
      fetchAccounts(true);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan izin fitur', 'error');
    } finally {
      setSubmittingPerms(false);
    }
  };

  // Grouped Permissions by Category
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionDefinition[]> = {};
    for (const p of APP_PERMISSIONS) {
      if (!groups[p.categoryLabel]) {
        groups[p.categoryLabel] = [];
      }
      groups[p.categoryLabel].push(p);
    }
    return groups;
  }, []);

  // Filtering Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchSearch =
        acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === 'ALL' || acc.role === roleFilter;
      const matchStatus = statusFilter === 'ALL' || acc.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [accounts, searchQuery, roleFilter, statusFilter]);

  // Metrics
  const stats = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((a) => a.status === 'ACTIVE').length;
    const suspended = accounts.filter((a) => a.status === 'SUSPENDED').length;
    const archived = accounts.filter((a) => a.status === 'ARCHIVED').length;
    const withSp = accounts.filter((a) => a.warningCount > 0).length;
    return { total, active, suspended, archived, withSp };
  }, [accounts]);

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#262626_transparent]">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-20 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white tracking-wide uppercase flex items-center gap-2">
                  Manajemen Akun & SDM
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                    FITUR CONTROLLER
                  </Badge>
                </h1>
                <p className="text-xs text-neutral-400">
                  Kelola hak akses fitur dinamis per karyawan (tanpa koding), masa tenggang (Grace Period 3 Minggu), SP, dan reset 2FA.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAccounts()}
              disabled={loading}
              className="bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="bg-white hover:bg-neutral-200 text-black font-bold text-xs gap-1.5 shadow-md shadow-white/5"
            >
              <UserPlus className="w-4 h-4 text-black" />
              Tambah Karyawan
            </Button>
          </div>
        </header>

        {/* CONTENT BODY */}
        <div className="p-6 space-y-6 flex-1">
          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-neutral-900/60 border-neutral-800/80">
              <CardContent className="p-4 space-y-1">
                <p className="text-[11px] text-neutral-400 font-mono uppercase">Total Terdaftar</p>
                <p className="text-2xl font-black text-white">{stats.total}</p>
                <p className="text-[10px] text-neutral-400">Termasuk arsip mati</p>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900/60 border-neutral-800/80">
              <CardContent className="p-4 space-y-1">
                <p className="text-[11px] text-emerald-400 font-mono uppercase">Karyawan Aktif</p>
                <p className="text-2xl font-black text-emerald-300">{stats.active}</p>
                <p className="text-[10px] text-neutral-400">Memiliki akses sistem</p>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900/60 border-neutral-800/80">
              <CardContent className="p-4 space-y-1">
                <p className="text-[11px] text-amber-400 font-mono uppercase">Masa Tenggang</p>
                <p className="text-2xl font-black text-amber-400">{stats.suspended}</p>
                <p className="text-[10px] text-neutral-400">Bisa di-restore (≤ 21 hr)</p>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900/60 border-neutral-800/80">
              <CardContent className="p-4 space-y-1">
                <p className="text-[11px] text-neutral-400 font-mono uppercase">Arsip Mati</p>
                <p className="text-2xl font-black text-neutral-400">{stats.archived}</p>
                <p className="text-[10px] text-neutral-400">Lewat 3 minggu (&gt; 21 hr)</p>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900/60 border-neutral-800/80">
              <CardContent className="p-4 space-y-1">
                <p className="text-[11px] text-orange-400 font-mono uppercase">Kena Catatan SP</p>
                <p className="text-2xl font-black text-orange-400">{stats.withSp}</p>
                <p className="text-[10px] text-neutral-400">Jejak indisipliner</p>
              </CardContent>
            </Card>
          </div>

          {/* SEARCH & FILTER CONTROLS */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-neutral-900/50 p-3 rounded-2xl border border-neutral-800/80">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau email..."
                className="pl-9 bg-neutral-950 border-neutral-800 text-xs h-9 text-white placeholder:text-neutral-500 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {/* Status filter tabs */}
              <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
                {(['ALL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                      statusFilter === s
                        ? s === 'SUSPENDED'
                          ? 'bg-amber-950 text-amber-300 font-bold border border-amber-800'
                          : s === 'ARCHIVED'
                          ? 'bg-neutral-800 text-neutral-300 font-bold border border-neutral-700'
                          : 'bg-neutral-800 text-white font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {s === 'ALL'
                      ? 'SEMUA'
                      : s === 'ACTIVE'
                      ? 'AKTIF'
                      : s === 'SUSPENDED'
                      ? 'MASA TENGGANG'
                      : 'ARSIP MATI'}
                  </button>
                ))}
              </div>

              {/* Role filter */}
              <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
                {(['ALL', 'OWNER', 'FINANCE', 'KASIR'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition ${
                      roleFilter === r
                        ? 'bg-neutral-800 text-white font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MAIN TABLE */}
          <Card className="bg-neutral-900/50 border-neutral-800/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300 border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/90 text-neutral-400 font-mono text-[11px] uppercase">
                    <th className="p-4">Karyawan</th>
                    <th className="p-4">Role Akses</th>
                    <th className="p-4">Fitur Diizinkan</th>
                    <th className="p-4">Status & Masa Tenggang</th>
                    <th className="p-4">Keamanan 2FA</th>
                    <th className="p-4">Audit SP</th>
                    <th className="p-4 text-right">Aksi Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-sans">
                  {loading && accounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-neutral-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-neutral-400" />
                        Memuat data karyawan dan hak akses fitur...
                      </td>
                    </tr>
                  ) : filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-neutral-500">
                        Tidak ada akun karyawan yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((account) => {
                      const isOwnerRole = account.role === 'OWNER';
                      const isCurrentOwner = currentUser?.id === account.id;
                      const isSuspended = account.status === 'SUSPENDED';
                      const isArchived = account.status === 'ARCHIVED';
                      const isActionBusy = actionLoadingId === account.id;

                      const effectivePerms =
                        account.effectivePermissions ||
                        account.permissions ||
                        (isOwnerRole ? APP_PERMISSIONS.map((p) => p.key) : ROLE_DEFAULT_PERMISSIONS[account.role] || []);

                      return (
                        <tr
                          key={account.id}
                          className={`hover:bg-neutral-900/60 transition ${
                            isArchived
                              ? 'bg-neutral-950/40 opacity-70'
                              : isSuspended
                              ? 'bg-amber-950/10'
                              : ''
                          }`}
                        >
                          {/* Nama & Email */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                                  isArchived
                                    ? 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                                    : isSuspended
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : account.role === 'OWNER'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800/80'
                                    : account.role === 'FINANCE'
                                    ? 'bg-blue-950 text-blue-300 border border-blue-800/80'
                                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                                }`}
                              >
                                {account.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  {account.name}
                                  {isCurrentOwner && (
                                    <span className="text-[10px] font-mono bg-neutral-800 text-neutral-300 px-1.5 py-0.2 rounded border border-neutral-700">
                                      Anda
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-neutral-400 font-mono">
                                  {account.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="p-4">
                            <Badge
                              className={`text-[10px] font-mono ${
                                account.role === 'OWNER'
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                  : account.role === 'FINANCE'
                                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                              }`}
                            >
                              {account.role}
                            </Badge>
                          </td>

                          {/* Fitur Diizinkan (Management Fitur) */}
                          <td className="p-4">
                            {isOwnerRole ? (
                              <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px] font-mono">
                                Semua Fitur (Full Access)
                              </Badge>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                                  {effectivePerms.length} / {APP_PERMISSIONS.length} Fitur
                                </span>
                                {!isArchived && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPermModal(account)}
                                    className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition"
                                    title="Ubah Hak Akses Fitur Karyawan"
                                  >
                                    <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-300" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Status & Masa Tenggang */}
                          <td className="p-4">
                            {isArchived ? (
                              <div className="space-y-0.5">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-neutral-900 text-neutral-400 border border-neutral-800">
                                  <Archive className="w-3 h-3 text-neutral-500" />
                                  ARSIP MATI (Permanen)
                                </div>
                                <p className="text-[9px] text-neutral-500 font-mono">
                                  Lewat 3 minggu
                                </p>
                              </div>
                            ) : isSuspended ? (
                              <div className="space-y-0.5">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                  <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                                  SUSPENDED ({account.remainingDays ?? 0} hr)
                                </div>
                                <p className="text-[9px] text-amber-400/90 font-mono">
                                  Hari ke-{account.daysSuspended ?? 0} dari 21
                                </p>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/70">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                ACTIVE
                              </div>
                            )}
                          </td>

                          {/* 2FA Status */}
                          <td className="p-4">
                            {account.isTwoFactorEnabled ? (
                              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Aktif</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-neutral-500 font-mono text-[11px]">
                                <ShieldOff className="w-3.5 h-3.5 text-neutral-500" />
                                <span>Belum</span>
                              </div>
                            )}
                          </td>

                          {/* Surat Peringatan (SP) */}
                          <td className="p-4">
                            {isOwnerRole ? (
                              <span className="text-neutral-500 font-mono text-[11px]">-</span>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    className={`text-[9px] font-mono ${
                                      account.warningCount === 0
                                        ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                                        : account.warningCount === 1
                                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                                        : account.warningCount === 2
                                        ? 'bg-orange-950 text-orange-300 border-orange-700'
                                        : 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                                    }`}
                                  >
                                    SP #{account.warningCount}
                                  </Badge>

                                  {account.warningCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setViewHistoryAccount(account)}
                                      className="text-[10px] text-neutral-400 hover:text-white underline font-mono"
                                    >
                                      Histori
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Aksi Otoritas Owner */}
                          <td className="p-4 text-right">
                            {isOwnerRole ? (
                              <span className="text-neutral-500 text-[11px] font-mono italic">
                                Super Admin
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Tombol Kelola Fitur */}
                                {!isArchived && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenPermModal(account)}
                                    className="h-7 text-[11px] bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800 gap-1"
                                    title="Atur Fitur Tanpa Koding"
                                  >
                                    <SlidersHorizontal className="w-3 h-3 text-neutral-400" />
                                    Fitur
                                  </Button>
                                )}

                                {/* Tombol Terbitkan SP (jika aktif) */}
                                {!isArchived && !isSuspended && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSpTargetAccount(account);
                                      setSpReason('');
                                    }}
                                    className="h-7 text-[11px] bg-neutral-900 border-neutral-700 text-amber-300 hover:bg-amber-950/40 hover:text-amber-200 hover:border-amber-700 gap-1"
                                  >
                                    <FileWarning className="w-3 h-3 text-amber-400" />
                                    SP
                                  </Button>
                                )}

                                {/* Tombol Reset 2FA */}
                                {account.isTwoFactorEnabled && !isArchived && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={isActionBusy}
                                    onClick={() => handleReset2Fa(account)}
                                    title="Gunakan jika HP karyawan hilang/rusak agar tidak tersangkut OTP"
                                    className="h-7 text-[11px] bg-neutral-900 border-neutral-700 text-blue-300 hover:bg-blue-950/40 hover:text-blue-200 hover:border-blue-700"
                                  >
                                    <KeyRound className="w-3 h-3 text-blue-400" />
                                  </Button>
                                )}

                                {/* Tombol RESTORE (Jika SUSPENDED dan masih dalam masa tenggang) */}
                                {isSuspended && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={isActionBusy}
                                    onClick={() => handleRestore(account)}
                                    className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 shadow-sm"
                                  >
                                    <RotateCcw className="w-3 h-3 text-white" />
                                    Restore
                                  </Button>
                                )}

                                {/* Tombol SUSPEND (Jika ACTIVE) */}
                                {!isSuspended && !isArchived && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={isActionBusy}
                                    onClick={() => handleSuspend(account)}
                                    className={`h-7 text-[11px] font-bold text-white transition ${
                                      account.isCriticalSp
                                        ? 'bg-red-600 hover:bg-red-500 shadow-md shadow-red-900/50'
                                        : 'bg-neutral-800 hover:bg-amber-950 hover:text-amber-300 hover:border-amber-800 border border-neutral-700'
                                    }`}
                                  >
                                    <UserX className="w-3 h-3 text-amber-400" />
                                    {account.isCriticalSp ? 'Suspend!' : 'Suspend'}
                                  </Button>
                                )}

                                {/* Jika ARCHIVED (Arsip Mati Permanen) */}
                                {isArchived && (
                                  <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                                    Terkunci
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL: KELOLA HAK AKSES FITUR (MANAJEMEN FITUR DINAMIS)  */}
      {/* ======================================================== */}
      {permTargetAccount && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-neutral-900 border-neutral-800 text-white shadow-2xl flex flex-col max-h-[90vh]">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  Kelola Fitur Akun: {permTargetAccount.name}
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400">
                  Role Dasar: <span className="font-bold text-white">{permTargetAccount.role}</span> • Tambah atau kurangi fitur tanpa koding ulang.
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setPermTargetAccount(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </CardHeader>

            {/* QUICK ACTIONS BAR */}
            <div className="p-3 bg-neutral-950/70 border-b border-neutral-800 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 font-mono text-[11px]">
                  Terpilih: <strong className="text-white">{selectedPermissions.length}</strong> dari {APP_PERMISSIONS.length} fitur
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleResetToRoleDefault}
                  className="h-7 text-[11px] bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Default Role ({permTargetAccount.role})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAllPerms}
                  className="h-7 text-[11px] bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
                >
                  Pilih Semua
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleClearAllPerms}
                  className="h-7 text-[11px] bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
                >
                  Hapus Semua
                </Button>
              </div>
            </div>

            {/* CHECKBOX LIST BY CATEGORY */}
            <div className="p-4 overflow-y-auto space-y-5 text-xs flex-1 [scrollbar-width:thin] [scrollbar-color:#262626_transparent]">
              {Object.entries(groupedPermissions).map(([catTitle, perms]) => (
                <div key={catTitle} className="space-y-2">
                  <h4 className="font-mono text-[11px] uppercase text-neutral-400 font-bold tracking-wider flex items-center gap-1.5 pb-1 border-b border-neutral-800/80">
                    <Layers className="w-3.5 h-3.5 text-neutral-500" />
                    {catTitle}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {perms.map((p) => {
                      const isChecked = selectedPermissions.includes(p.key);
                      return (
                        <div
                          key={p.key}
                          onClick={() => handleTogglePermission(p.key)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-2.5 select-none ${
                            isChecked
                              ? 'bg-neutral-800/90 border-emerald-600/70 shadow-sm'
                              : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="pt-0.5">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-neutral-600" />
                            )}
                          </div>
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <p className="font-bold text-white text-xs flex items-center justify-between">
                              <span>{p.name}</span>
                              <span className="font-mono text-[9px] text-neutral-500">{p.key}</span>
                            </p>
                            <p className="text-[10px] text-neutral-400 leading-tight">
                              {p.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="p-4 border-t border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950">
              <p className="text-[11px] text-neutral-400 font-mono">
                💡 Perubahan akan langsung aktif pada sesi user berikutnya.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPermTargetAccount(null)}
                  className="bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  disabled={submittingPerms}
                  onClick={handleSavePermissions}
                  className="bg-white hover:bg-neutral-200 text-black font-bold text-xs"
                >
                  {submittingPerms ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    'Simpan Hak Akses Fitur'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: TAMBAH KARYAWAN BARU (KHUSUS OWNER)             */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-neutral-900 border-neutral-800 text-white shadow-2xl flex flex-col max-h-[90vh]">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  Tambah Karyawan Baru
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400">
                  Karyawan baru akan dibuat dengan status ACTIVE.
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </CardHeader>

            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-hidden">
              <CardContent className="space-y-4 pt-4 text-xs overflow-y-auto flex-1">
                <div className="space-y-1.5">
                  <Label className="text-neutral-300 font-semibold">Nama Lengkap</Label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      required
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="Contoh: Budi Santoso"
                      className="pl-9 bg-neutral-950 border-neutral-800 text-xs h-9 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-neutral-300 font-semibold">Alamat Email</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      required
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="budi@solitpos.com"
                      className="pl-9 bg-neutral-950 border-neutral-800 text-xs h-9 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-neutral-300 font-semibold">Role & Hak Akses Dasar</Label>
                  <select
                    value={createForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value as 'KASIR' | 'FINANCE';
                      setCreateForm({
                        ...createForm,
                        role: newRole,
                        permissions: ROLE_DEFAULT_PERMISSIONS[newRole],
                      });
                    }}
                    className="w-full h-9 px-3 bg-neutral-950 border border-neutral-800 rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                  >
                    <option value="KASIR">KASIR - Template Default Kasir</option>
                    <option value="FINANCE">FINANCE - Template Default Keuangan</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-neutral-300 font-semibold">Password Awal (Sementara)</Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      required
                      type="password"
                      minLength={6}
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="Minimal 6 karakter..."
                      className="pl-9 bg-neutral-950 border-neutral-800 text-xs h-9 text-white"
                    />
                  </div>
                </div>

                {/* EXPANDABLE CUSTOM PERMISSIONS TOGGLE */}
                <div className="pt-2 border-t border-neutral-800/80">
                  <button
                    type="button"
                    onClick={() => setShowCreateCustomPerms(!showCreateCustomPerms)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-neutral-300 hover:text-white"
                  >
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                      Sesuaikan Hak Akses Fitur Karyawan ({createForm.permissions.length} Fitur)
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {showCreateCustomPerms ? 'Sembunyikan' : 'Buka Kustomisasi'}
                    </span>
                  </button>

                  {showCreateCustomPerms && (
                    <div className="mt-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2 max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {APP_PERMISSIONS.map((p) => {
                          const isChecked = createForm.permissions.includes(p.key);
                          return (
                            <label
                              key={p.key}
                              className="flex items-center gap-2 text-[11px] text-neutral-300 cursor-pointer p-1.5 hover:bg-neutral-900 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setCreateForm({
                                    ...createForm,
                                    permissions: isChecked
                                      ? createForm.permissions.filter((k) => k !== p.key)
                                      : [...createForm.permissions, p.key],
                                  });
                                }}
                                className="rounded border-neutral-700 text-emerald-500 focus:ring-0"
                              />
                              <span className="truncate">{p.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>

              <div className="p-4 border-t border-neutral-800 flex justify-end gap-2 shrink-0 bg-neutral-950">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submittingCreate}
                  className="bg-white hover:bg-neutral-200 text-black font-bold"
                >
                  {submittingCreate ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    'Simpan Karyawan'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: TERBITKAN SURAT PERINGATAN (SP)                  */}
      {/* ======================================================== */}
      {spTargetAccount && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-neutral-900 border-neutral-800 text-white shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <FileWarning className="w-4 h-4 text-amber-400" />
                  Terbitkan Surat Peringatan (SP)
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400">
                  Untuk: <span className="font-bold text-white">{spTargetAccount.name}</span> ({spTargetAccount.email})
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setSpTargetAccount(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </CardHeader>

            <form onSubmit={handleIssueSpSubmit}>
              <CardContent className="space-y-4 pt-4 text-xs">
                <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Tingkat Peringatan yang akan Diterbitkan: SP #{spTargetAccount.warningCount + 1}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {spTargetAccount.warningCount + 1 >= 3
                      ? '⚠️ PERHATIAN: Ini adalah SP ke-3! Dasbor akan menyarankan penonaktifan (SUSPEND) akun setelah diterbitkan.'
                      : 'Catatan ini akan tersimpan permanen pada audit trail database sebagai rekam jejak indisipliner.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-neutral-300 font-semibold">
                    Alasan Pelanggaran / Indisipliner
                  </Label>
                  <textarea
                    required
                    rows={4}
                    value={spReason}
                    onChange={(e) => setSpReason(e.target.value)}
                    placeholder="Contoh: Selisih uang kas fisik di laci kasir selama 3 hari berturut-turut pada penutupan shift..."
                    className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-white placeholder:text-neutral-600"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSpTargetAccount(null)}
                    className="bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingSp}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
                  >
                    {submittingSp ? (
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                    ) : (
                      `Terbitkan SP #${spTargetAccount.warningCount + 1}`
                    )}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: HISTORI SURAT PERINGATAN LENGKAP                 */}
      {/* ======================================================== */}
      {viewHistoryAccount && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-neutral-900 border-neutral-800 text-white shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400" />
                  Rekam Jejak SP: {viewHistoryAccount.name}
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400 font-mono">
                  {viewHistoryAccount.email} • Total {viewHistoryAccount.warningCount} SP
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setViewHistoryAccount(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </CardHeader>

            <CardContent className="space-y-3 pt-4 text-xs max-h-96 overflow-y-auto">
              {viewHistoryAccount.receivedWarnings?.length === 0 ? (
                <p className="text-neutral-500 text-center py-6 font-mono">
                  Tidak ada histori surat peringatan.
                </p>
              ) : (
                viewHistoryAccount.receivedWarnings?.map((warning, idx) => (
                  <div
                    key={warning.id}
                    className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[10px] font-mono">
                        SP #{viewHistoryAccount.receivedWarnings.length - idx}
                      </Badge>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {new Date(warning.createdAt).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    <p className="text-neutral-200 text-xs bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800 whitespace-pre-wrap">
                      {warning.reason}
                    </p>

                    <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between pt-1">
                      <span>
                        Diterbitkan oleh:{' '}
                        <span className="text-neutral-300 font-bold">
                          {warning.issuedBy?.name || 'Owner'}
                        </span>
                      </span>
                    </div>
                  </div>
                ))
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewHistoryAccount(null)}
                  className="bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white"
                >
                  Tutup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold border transition-all animate-in fade-in slide-in-from-bottom-4 ${
            toast.type === 'success'
              ? 'bg-neutral-900 border-emerald-500/50 text-emerald-300 shadow-emerald-950/40'
              : 'bg-neutral-900 border-red-500/50 text-red-300 shadow-red-950/40'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-neutral-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
