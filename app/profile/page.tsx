'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  User,
  KeyRound,
  Mail,
  ShieldCheck,
  ShieldOff,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  History,
  FileWarning,
  Loader2,
  X,
} from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-neutral-950 text-white">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [submittingEmail, setSubmittingEmail] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/account/me');
      if (res.status === 401 || res.status === 403) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        throw new Error('Gagal memuat profil akun');
      }
      const data = await res.json();
      setProfile(data);
      setNewEmail(data.email);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat profil', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Submit Ganti Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      showToast('Password lama wajib diisi', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('Password baru minimal 6 karakter', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password baru tidak cocok', 'error');
      return;
    }

    setSubmittingPassword(true);
    try {
      const res = await fetch('/api/account/me/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memperbarui password');
      }
      showToast('Password berhasil diperbarui! Silakan gunakan password baru saat login berikutnya.', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah password', 'error');
    } finally {
      setSubmittingPassword(false);
    }
  };

  // Submit Ganti Email
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      showToast('Password lama wajib dimasukkan untuk verifikasi keamanan', 'error');
      return;
    }
    if (!newEmail || newEmail === profile?.email) {
      showToast('Masukkan alamat email baru yang berbeda', 'error');
      return;
    }

    setSubmittingEmail(true);
    try {
      const res = await fetch('/api/account/me/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword,
          newEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memperbarui email');
      }
      showToast('Email berhasil diperbarui!', 'success');
      // Update local storage
      const saved = localStorage.getItem('user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.email = newEmail;
          localStorage.setItem('user', JSON.stringify(parsed));
        } catch (e) {}
      }
      setOldPassword('');
      fetchProfile();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah email', 'error');
    } finally {
      setSubmittingEmail(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#262626_transparent]">
        {/* HEADER */}
        <header className="sticky top-0 z-20 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-800 border border-neutral-700 text-white rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-wide uppercase">
                Profil & Keamanan Akun
              </h1>
              <p className="text-xs text-neutral-400">
                Pembaruan mandiri kata sandi, email, dan pengelolaan autentikasi dua faktor (2FA).
              </p>
            </div>
          </div>
        </header>

        {/* BODY */}
        <div className="p-6 space-y-6 max-w-4xl">
          {/* PROFILE CARD */}
          <Card className="bg-neutral-900/60 border-neutral-800/80">
            <CardHeader className="pb-3 border-b border-neutral-800/60">
              <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                <span>Informasi Akun Anda</span>
                {profile && (
                  <Badge
                    className={`text-[10px] font-mono ${
                      profile.role === 'OWNER'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : profile.role === 'FINANCE'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    ROLE: {profile.role}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex items-center gap-2 text-neutral-500 text-xs py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memuat informasi akun...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1">
                    <span className="text-neutral-500 text-[10px] uppercase">Nama Lengkap</span>
                    <p className="font-bold text-white text-sm">{profile?.name}</p>
                  </div>
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1">
                    <span className="text-neutral-500 text-[10px] uppercase">Alamat Email</span>
                    <p className="font-bold text-white text-sm truncate">{profile?.email}</p>
                  </div>
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1">
                    <span className="text-neutral-500 text-[10px] uppercase">Status 2FA</span>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {profile?.isTwoFactorEnabled ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-4 h-4" /> Aktif
                        </span>
                      ) : (
                        <span className="text-neutral-400 font-bold flex items-center gap-1">
                          <ShieldOff className="w-4 h-4" /> Belum Aktif
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2FA SETUP PROMPT */}
          <Card className="bg-neutral-900/40 border-neutral-800/80">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-xs">Autentikasi Dua Faktor (2FA)</h3>
                  <p className="text-[11px] text-neutral-400">
                    {profile?.isTwoFactorEnabled
                      ? 'Akun Anda telah diamankan dengan Google Authenticator / TOTP. Setiap login akan meminta kode 6 digit.'
                      : 'Amankan akun Anda dari akses ilegal dengan menghubungkan Google Authenticator.'}
                  </p>
                </div>
              </div>

              <Link href="/2fa-setup" className="shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800 text-xs gap-1.5"
                >
                  {profile?.isTwoFactorEnabled ? 'Konfigurasi Ulang 2FA' : 'Aktifkan 2FA Sekarang'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* FORMS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GANTI PASSWORD */}
            <Card className="bg-neutral-900/60 border-neutral-800/80">
              <CardHeader className="pb-3 border-b border-neutral-800/60">
                <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Ganti Password
                </CardTitle>
                <CardDescription className="text-[11px] text-neutral-400">
                  Wajib memasukkan password lama untuk verifikasi identitas.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleUpdatePassword}>
                <CardContent className="space-y-3.5 pt-4 text-xs">
                  <div className="space-y-1">
                    <Label className="text-neutral-300 font-semibold">Password Saat Ini (Lama)</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        required
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Masukkan password saat ini..."
                        className="pl-9 bg-neutral-950 border-neutral-800 text-xs h-9 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-neutral-300 font-semibold">Password Baru</Label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        required
                        type="password"
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 6 karakter..."
                        className="pl-9 bg-neutral-950 border-neutral-800 text-xs h-9 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-neutral-300 font-semibold">Konfirmasi Password Baru</Label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        required
                        type="password"
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi password baru..."
                        className="pl-9 bg-neutral-950 border-neutral-800 text-xs h-9 text-white"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={submittingPassword}
                      className="w-full bg-white hover:bg-neutral-200 text-black font-bold text-xs"
                    >
                      {submittingPassword ? (
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                      ) : (
                        'Simpan Password Baru'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </form>
            </Card>

            {/* GANTI EMAIL */}
            <Card className="bg-neutral-900/60 border-neutral-800/80">
              <CardHeader className="pb-3 border-b border-neutral-800/60">
                <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  Ganti Alamat Email
                </CardTitle>
                <CardDescription className="text-[11px] text-neutral-400">
                  Email baru akan digunakan sebagai username login Anda.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleUpdateEmail}>
                <CardContent className="space-y-3.5 pt-4 text-xs">
                  <div className="space-y-1">
                    <Label className="text-neutral-300 font-semibold">Alamat Email Baru</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        required
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="emailbaru@solitpos.com"
                        className="pl-9 bg-neutral-950 border-neutral-800 text-xs h-9 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-neutral-300 font-semibold">Password Saat Ini (Untuk Konfirmasi)</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        required
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Masukkan password saat ini..."
                        className="pl-9 bg-neutral-950 border-neutral-800 text-xs h-9 text-white"
                      />
                    </div>
                    <p className="text-[10px] text-neutral-400 font-mono">
                      Wajib untuk memverifikasi bahwa perubahan ini sah.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={submittingEmail}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                    >
                      {submittingEmail ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        'Simpan Email Baru'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </form>
            </Card>
          </div>

          {/* RIWAYAT SURAT PERINGATAN (JIKA ADA) */}
          {profile?.warningCount > 0 && (
            <Card className="bg-neutral-900/60 border-amber-900/40">
              <CardHeader className="pb-3 border-b border-neutral-800/60">
                <CardTitle className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <FileWarning className="w-4 h-4 text-amber-400" />
                  Catatan Surat Peringatan (SP) Anda
                  <Badge className="bg-amber-950 text-amber-300 border-amber-700 text-[10px] font-mono">
                    Total: {profile.warningCount} SP
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[11px] text-neutral-400">
                  Berikut adalah catatan resmi indisipliner yang diterbitkan oleh manajemen Owner.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 text-xs">
                {profile.receivedWarnings?.map((warning: any, idx: number) => (
                  <div
                    key={warning.id}
                    className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400 font-mono text-[11px]">
                        SP #{profile.receivedWarnings.length - idx}
                      </span>
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
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* FLOATING TOAST */}
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
