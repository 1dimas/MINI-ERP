'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Scale,
  TrendingUp,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileCheck,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function FinanceDashboardPage() {
  const [activeMenu, setActiveMenu] = useState<
    'overview' | 'cashflow' | 'journal' | 'tb' | 'pl' | 'ledger'
  >('overview');

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('110');
  const [journalStatusFilter, setJournalStatusFilter] = useState('');

  // Data states
  const [tbData, setTbData] = useState<any>(null);
  const [plData, setPlData] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [journalList, setJournalList] = useState<any[]>([]);
  const [isDraftMinimized, setIsDraftMinimized] = useState(false);
  const [isPostedMinimized, setIsPostedMinimized] = useState(false);

  // Cashflow Form State (Otomatis DRAFT)
  const [cfType, setCfType] = useState<'CASHFLOW_OUT' | 'CASHFLOW_IN' | 'CASHFLOW_MUTATION'>('CASHFLOW_OUT');
  const [cfKeterangan, setCfKeterangan] = useState('');
  const [cfSourceAccount, setCfSourceAccount] = useState('110');
  const [cfTargetAccount, setCfTargetAccount] = useState('520');
  const [cfNominal, setCfNominal] = useState<number>(0);

  // Manual Journal Form State
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [journalKeterangan, setJournalKeterangan] = useState('');
  const [journalLines, setJournalLines] = useState([
    { accountCode: '110', side: 'DEBIT', nominal: 0 },
    { accountCode: '410', side: 'KREDIT', nominal: 0 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Load all finance data
  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      const qStr = query.toString() ? `?${query.toString()}` : '';

      const [tbRes, plRes] = await Promise.all([
        fetch(`/api/accounting/trial-balance${qStr}`),
        fetch(`/api/accounting/profit-loss${qStr}`),
      ]);

      const tb = await tbRes.json();
      const pl = await plRes.json();

      if (tbRes.ok) setTbData(tb);
      if (plRes.ok) setPlData(pl);

      if (activeMenu === 'journal') {
        const jQ = new URLSearchParams();
        if (startDate) jQ.append('startDate', startDate);
        if (endDate) jQ.append('endDate', endDate);
        if (journalStatusFilter) jQ.append('status', journalStatusFilter);

        const jRes = await fetch(`/api/journal?${jQ.toString()}`);
        const jData = await jRes.json();
        if (jRes.ok && Array.isArray(jData)) setJournalList(jData);
      }

      if (activeMenu === 'ledger') {
        const ledgerRes = await fetch(`/api/accounting/ledger/${selectedAccount}${qStr}`);
        const ledger = await ledgerRes.json();
        if (ledgerRes.ok) setLedgerData(ledger);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data keuangan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeMenu, selectedAccount, journalStatusFilter]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  // Submit Cashflow (Otomatis DRAFT ke Jurnal Umum)
  const handleCreateCashflow = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/cashflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'FINANCE',
        },
        body: JSON.stringify({
          type: cfType,
          keterangan: cfKeterangan,
          sourceAccountCode: cfSourceAccount,
          targetAccountCode: cfTargetAccount,
          nominal: Number(cfNominal),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan arus kas');

      setMessage(`Transaksi Arus Kas berhasil dibuat (Status: ${data.status} - Masuk Draf Jurnal Umum)`);
      setCfKeterangan('');
      setCfNominal(0);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Open Edit Modal
  const handleStartEditJournal = (j: any) => {
    setEditingJournalId(j.id);
    setJournalKeterangan(j.keterangan);
    if (j.lines && j.lines.length >= 2) {
      setJournalLines(
        j.lines.map((l: any) => ({
          accountCode: l.accountCode,
          side: l.side,
          nominal: Number(l.nominal),
        }))
      );
    }
    setShowManualModal(true);
  };

  // Submit Jurnal Manual (CREATE / EDIT)
  const handleSaveManualJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const url = editingJournalId ? `/api/journal/${editingJournalId}` : '/api/journal';
      const method = editingJournalId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'FINANCE',
        },
        body: JSON.stringify({
          keterangan: journalKeterangan,
          lines: journalLines.map((l) => ({ ...l, nominal: Number(l.nominal) })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan jurnal');

      setMessage(
        editingJournalId
          ? `Jurnal berhasil diperbarui!`
          : `Jurnal Manual Dibuat! (Status: ${data.status})`
      );
      setShowManualModal(false);
      setEditingJournalId(null);
      setJournalKeterangan('');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Audit Jurnal (APPROVE / REJECT) -> DRAFT menjadi POSTED di Jurnal Umum & Laporan
  const handleAuditJournal = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/journal/audit/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mengaudit jurnal');

      setMessage(`Jurnal berhasil di-audit (Status: ${data.status} - Resmi masuk Jurnal Umum & Laporan)`);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const pendingJournals = journalList.filter((j) => j.status === 'DRAFT');

  return (
    <div className="min-h-screen md:h-screen bg-black text-white flex flex-col md:flex-row font-sans md:overflow-hidden">
      {/* SIDEBAR NAVIGATION (STRICT B&W) */}
      <aside className="w-full md:w-64 border-r border-neutral-800 bg-neutral-950 flex flex-col justify-between shrink-0 md:h-screen md:sticky md:top-0 z-30 select-none">
        <div className="p-5 space-y-6 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#262626_transparent]">
          <div className="pb-4 border-b border-neutral-800">
            <h2 className="text-lg font-bold tracking-tight">Finance Portal</h2>
            <p className="text-xs text-neutral-400">Modul Keuangan & Akuntansi</p>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveMenu('overview')}
              className={`w-full flex items-center px-3 py-2 text-sm rounded font-medium cursor-pointer transition ${
                activeMenu === 'overview'
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 mr-2 shrink-0" />
              Dashboard Ringkasan
            </button>

            <button
              onClick={() => setActiveMenu('cashflow')}
              className={`w-full flex items-center px-3 py-2 text-sm rounded font-medium cursor-pointer transition ${
                activeMenu === 'cashflow'
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4 mr-2 shrink-0" />
              Arus Kas (Input DRAFT)
            </button>

            <button
              onClick={() => setActiveMenu('journal')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded font-medium cursor-pointer transition ${
                activeMenu === 'journal'
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
              }`}
            >
              <span className="flex items-center">
                <FileText className="w-4 h-4 mr-2 shrink-0" />
                Jurnal Umum & Audit
              </span>
              {pendingJournals.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded border border-neutral-700 bg-neutral-900 text-yellow-300 font-mono">
                  {pendingJournals.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveMenu('tb')}
              className={`w-full flex items-center px-3 py-2 text-sm rounded font-medium cursor-pointer transition ${
                activeMenu === 'tb'
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
              }`}
            >
              <Scale className="w-4 h-4 mr-2 shrink-0" />
              Neraca Saldo
            </button>

            <button
              onClick={() => setActiveMenu('pl')}
              className={`w-full flex items-center px-3 py-2 text-sm rounded font-medium cursor-pointer transition ${
                activeMenu === 'pl'
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-2 shrink-0" />
              Laporan Laba Rugi
            </button>

            <button
              onClick={() => setActiveMenu('ledger')}
              className={`w-full flex items-center px-3 py-2 text-sm rounded font-medium cursor-pointer transition ${
                activeMenu === 'ledger'
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4 mr-2 shrink-0" />
              Buku Besar (Ledger)
            </button>
          </nav>
        </div>

        <div className="p-5 border-t border-neutral-800 shrink-0 bg-neutral-950">
          <Link href="/dashboard" className="block w-full">
            <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              Ke Dashboard Utama
            </Button>
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-6 space-y-6 overflow-y-auto">
        {/* Top Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-neutral-800 bg-neutral-950 rounded-lg">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <Label htmlFor="startDate" className="text-xs">Dari Tanggal</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-xs">Sampai Tanggal</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            <Button size="sm" onClick={loadData} className="mt-4 sm:mt-0" disabled={loading}>
              {loading ? '...' : 'Filter'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 border border-red-800 bg-red-950/40 text-red-400 text-xs rounded">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 border border-neutral-700 bg-neutral-900 text-neutral-300 text-xs rounded">
            {message}
          </div>
        )}

        {/* MENU OVERVIEW */}
        {activeMenu === 'overview' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white mb-1">Dashboard Keuangan (Overview)</h2>
              <p className="text-xs text-neutral-400">Ringkasan cepat performa finansial toko</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Total Pendapatan (Sales)</CardDescription>
                  <CardTitle className="text-lg font-mono">
                    {formatRupiah(plData?.summary?.totalPendapatan)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Total HPP</CardDescription>
                  <CardTitle className="text-lg font-mono">
                    {formatRupiah(plData?.summary?.totalHpp)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Laba Kotor (Gross Profit)</CardDescription>
                  <CardTitle className="text-lg font-mono">
                    {formatRupiah(plData?.summary?.labaKotor)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Beban Operasional</CardDescription>
                  <CardTitle className="text-lg font-mono">
                    {formatRupiah(plData?.summary?.totalBebanOperasional)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-white">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-white font-bold">Laba Bersih Final (Net Profit)</CardDescription>
                  <CardTitle className="text-xl font-mono">
                    {formatRupiah(plData?.summary?.labaBersih)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Status Audit & Balance</CardDescription>
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    {tbData?.summary?.isBalanced ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                        NERACA SALDO BALANCE 100%
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        TIDAK BALANCE
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {/* MENU ARUS KAS (CASHFLOW -> DRAFT TO JOURNAL) */}
        {activeMenu === 'cashflow' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Input Transaksi Arus Kas (Step 1: Input Cashflow)</CardTitle>
                <CardDescription className="text-xs">
                  Semua transaksi Cashflow otomatis masuk ke database sebagai DRAFT di Draf Jurnal Umum untuk selanjutnya diaudit/disetujui.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCashflow} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cfType">Jenis Arus Kas</Label>
                    <select
                      id="cfType"
                      value={cfType}
                      onChange={(e) => {
                        const t = e.target.value as any;
                        setCfType(t);
                        if (t === 'CASHFLOW_OUT') {
                          setCfSourceAccount('110');
                          setCfTargetAccount('520');
                        } else if (t === 'CASHFLOW_IN') {
                          setCfSourceAccount('310');
                          setCfTargetAccount('110');
                        } else if (t === 'CASHFLOW_MUTATION') {
                          setCfSourceAccount('110');
                          setCfTargetAccount('120');
                        }
                      }}
                      className="h-10 w-full rounded border border-neutral-800 bg-neutral-900 px-3 text-sm text-white"
                    >
                      <option value="CASHFLOW_OUT">Cash Out (Pengeluaran / Restock)</option>
                      <option value="CASHFLOW_IN">Cash In (Suntikan Modal / Inflow)</option>
                      <option value="CASHFLOW_MUTATION">Mutasi Kas (Transfer Internal)</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="cfSource">Akun Sumber (Kredit / Saldo)</Label>
                    <select
                      id="cfSource"
                      value={cfSourceAccount}
                      onChange={(e) => setCfSourceAccount(e.target.value)}
                      className="h-10 w-full rounded border border-neutral-800 bg-neutral-900 px-3 text-sm text-white"
                    >
                      <option value="110">110 - Kas Toko / Laci</option>
                      <option value="120">120 - Bank BCA</option>
                      <option value="310">310 - Modal Pemilik</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="cfTarget">Akun Tujuan (Debit / Peruntukan)</Label>
                    <select
                      id="cfTarget"
                      value={cfTargetAccount}
                      onChange={(e) => setCfTargetAccount(e.target.value)}
                      className="h-10 w-full rounded border border-neutral-800 bg-neutral-900 px-3 text-sm text-white"
                    >
                      <option value="110">110 - Kas Toko / Laci</option>
                      <option value="120">120 - Bank BCA</option>
                      <option value="130">130 - Persediaan Barang (Restock)</option>
                      <option value="510">510 - Beban Gaji</option>
                      <option value="520">520 - Beban Listrik & Air</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="cfKet">Keterangan Transaksi</Label>
                    <Input
                      id="cfKet"
                      placeholder="Contoh: Bayar Listrik PLN / Setoran Bank BCA"
                      value={cfKeterangan}
                      onChange={(e) => setCfKeterangan(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="cfNominal">Nominal (Rp)</Label>
                    <Input
                      id="cfNominal"
                      type="number"
                      placeholder="500000"
                      value={cfNominal || ''}
                      onChange={(e) => setCfNominal(Number(e.target.value))}
                      required
                      className="font-mono"
                    />
                  </div>

                  <div className="sm:col-span-3 flex justify-end">
                    <Button type="submit">Submit Arus Kas (Ke Draf Jurnal)</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MENU JURNAL UMUM & AUDIT (STEP 2 & 3: DRAFT -> EDIT / AUDIT -> POSTED TO JURNAL UMUM) */}
        {activeMenu === 'journal' && (() => {
          const draftList = journalList.filter((j) => j.status === 'DRAFT');
          const postedList = journalList.filter((j) => j.status !== 'DRAFT');

          return (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white">Jurnal Umum & Audit (Step 2 & 3)</h2>
                  <p className="text-xs text-neutral-400">
                    Draf Jurnal dipisahkan dari Jurnal Umum Resmi. Anda dapat meminimalkan / menyembunyikan masing-masing seksi.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={journalStatusFilter}
                    onChange={(e) => setJournalStatusFilter(e.target.value)}
                    className="h-9 rounded border border-neutral-800 bg-neutral-900 px-3 text-xs text-white"
                  >
                    <option value="">Semua Status</option>
                    <option value="DRAFT">Status DRAFT (Pending Audit)</option>
                    <option value="POSTED">Status POSTED (Resmi Jurnal Umum)</option>
                    <option value="REJECTED">Status REJECTED (Ditolak)</option>
                  </select>

                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingJournalId(null);
                      setJournalKeterangan('');
                      setShowManualModal(!showManualModal);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Buat Jurnal Manual
                  </Button>
                </div>
              </div>

              {/* Modal Form Jurnal Manual (CREATE / EDIT) */}
              {showManualModal && (
                <Card className="border-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {editingJournalId ? `Edit Jurnal (${editingJournalId})` : 'Buat Jurnal Manual Baru'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {editingJournalId
                        ? 'Mengedit entri jurnal akan mengeset flag isEdited menjadi true.'
                        : 'Entri jurnal berstatus DRAFT dan dapat diaudit oleh Finance maupun Owner.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveManualJournal} className="space-y-4">
                      <div>
                        <Label htmlFor="jKet">Keterangan Transaksi</Label>
                        <Input
                          id="jKet"
                          placeholder="Keterangan penyesuaian / jurnal manual"
                          value={journalKeterangan}
                          onChange={(e) => setJournalKeterangan(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Baris Transaksi Double-Entry:</Label>
                        {journalLines.map((line, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <select
                              value={line.accountCode}
                              onChange={(e) => {
                                const newLines = [...journalLines];
                                newLines[idx].accountCode = e.target.value;
                                setJournalLines(newLines);
                              }}
                              className="h-9 rounded border border-neutral-800 bg-neutral-900 px-2 text-xs text-white"
                            >
                              <option value="110">110 - Kas Toko</option>
                              <option value="120">120 - Bank BCA</option>
                              <option value="130">130 - Persediaan Barang</option>
                              <option value="210">210 - Hutang Usaha</option>
                              <option value="310">310 - Modal Pemilik</option>
                              <option value="410">410 - Penjualan POS</option>
                              <option value="440">440 - HPP Penjualan</option>
                              <option value="520">520 - Beban Listrik & Air</option>
                            </select>

                            <select
                              value={line.side}
                              onChange={(e) => {
                                const newLines = [...journalLines];
                                newLines[idx].side = e.target.value as any;
                                setJournalLines(newLines);
                              }}
                              className="h-9 rounded border border-neutral-800 bg-neutral-900 px-2 text-xs text-white"
                            >
                              <option value="DEBIT">DEBIT</option>
                              <option value="KREDIT">KREDIT</option>
                            </select>

                            <Input
                              type="number"
                              placeholder="Nominal"
                              value={line.nominal}
                              onChange={(e) => {
                                const newLines = [...journalLines];
                                newLines[idx].nominal = Number(e.target.value);
                                setJournalLines(newLines);
                              }}
                              className="h-9 w-32 text-xs font-mono"
                              required
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowManualModal(false);
                            setEditingJournalId(null);
                          }}
                        >
                          Batal
                        </Button>
                        <Button type="submit" size="sm">
                          {editingJournalId ? 'Simpan Perubahan Edit' : 'Simpan Jurnal DRAFT'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* SECTION 1: DRAF JURNAL (MINIMIZABLE) */}
              <Card className="border-yellow-900/50 bg-neutral-950">
                <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-neutral-900">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base text-yellow-400 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
                        Draf Jurnal (Pending Audit)
                      </CardTitle>
                      <span className="px-2 py-0.5 text-[10px] font-mono border border-yellow-800 bg-yellow-950/60 text-yellow-300 rounded font-bold">
                        {draftList.length} Draf Memerlukan Audit
                      </span>
                    </div>
                    <CardDescription className="text-xs">
                      Transaksi di bawah ini belum mempengaruhi laporan keuangan. Lakukan Edit atau Audit (Approve / Reject).
                    </CardDescription>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsDraftMinimized(!isDraftMinimized)}
                    className="text-xs border-neutral-700 flex items-center gap-1"
                  >
                    {isDraftMinimized ? (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        Tampilkan Draf
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        Minimize Draf
                      </>
                    )}
                  </Button>
                </CardHeader>

                {!isDraftMinimized && (
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse border border-neutral-800">
                        <thead>
                          <tr className="bg-neutral-900 border-b border-neutral-800 text-neutral-300 text-xs">
                            <th className="p-3 border-r border-neutral-800">Tanggal</th>
                            <th className="p-3 border-r border-neutral-800">Sumber</th>
                            <th className="p-3 border-r border-neutral-800">Keterangan</th>
                            <th className="p-3 border-r border-neutral-800 text-right">Total</th>
                            <th className="p-3 border-r border-neutral-800 text-center">Status</th>
                            <th className="p-3 text-center">Aksi (Edit & Audit)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {draftList.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-xs text-neutral-500">
                                tidak ada draf jurnal yang menunggu audit.
                              </td>
                            </tr>
                          ) : (
                            draftList.map((j) => (
                              <tr key={j.id} className="border-b border-neutral-800 hover:bg-neutral-900/50">
                                <td className="p-3 border-r border-neutral-800 font-mono text-xs">
                                  {new Date(j.tanggal).toLocaleDateString('id-ID')}
                                </td>
                                <td className="p-3 border-r border-neutral-800 text-xs font-mono">{j.sourceType}</td>
                                <td className="p-3 border-r border-neutral-800 font-medium">
                                  {j.keterangan}
                                  {j.isEdited && (
                                    <span className="ml-2 text-[10px] text-neutral-400 border border-neutral-700 px-1 py-0.2 rounded font-mono">
                                      EDITED
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 border-r border-neutral-800 text-right font-mono font-bold">
                                  {formatRupiah(Number(j.total))}
                                </td>
                                <td className="p-3 border-r border-neutral-800 text-center">
                                  <span className="px-2 py-0.5 text-[10px] font-mono border rounded border-yellow-800 bg-yellow-950 text-yellow-300">
                                    {j.status}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Button size="sm" variant="outline" onClick={() => handleStartEditJournal(j)}>
                                      Edit
                                    </Button>
                                    <Button size="sm" onClick={() => handleAuditJournal(j.id, 'APPROVE')}>
                                      Approve
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleAuditJournal(j.id, 'REJECT')}>
                                      Reject
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* SECTION 2: JURNAL UMUM RESMI (POSTED / REJECTED) (MINIMIZABLE) */}
              <Card className="border-neutral-800 bg-neutral-950">
                <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-neutral-900">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base text-white flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-white shrink-0" />
                        Jurnal Umum Resmi (POSTED)
                      </CardTitle>
                      <span className="px-2 py-0.5 text-[10px] font-mono border border-neutral-700 bg-neutral-900 text-white rounded font-bold">
                        {postedList.length} Transaksi Terverifikasi
                      </span>
                    </div>
                    <CardDescription className="text-xs">
                      Riwayat jurnal umum resmi yang telah di-posting dan dihitung dalam laporan keuangan.
                    </CardDescription>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsPostedMinimized(!isPostedMinimized)}
                    className="text-xs border-neutral-700 flex items-center gap-1"
                  >
                    {isPostedMinimized ? (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        Tampilkan Jurnal Resmi
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        Minimize Jurnal Resmi
                      </>
                    )}
                  </Button>
                </CardHeader>

                {!isPostedMinimized && (
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse border border-neutral-800">
                        <thead>
                          <tr className="bg-neutral-900 border-b border-neutral-800 text-neutral-300 text-xs">
                            <th className="p-3 border-r border-neutral-800">Tanggal</th>
                            <th className="p-3 border-r border-neutral-800">Sumber</th>
                            <th className="p-3 border-r border-neutral-800">Keterangan</th>
                            <th className="p-3 border-r border-neutral-800 text-right">Total</th>
                            <th className="p-3 border-r border-neutral-800 text-center">Status</th>
                            <th className="p-3 text-center">Aksi (Edit)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {postedList.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-xs text-neutral-500">
                                Belum ada transaksi jurnal umum yang di-POSTED.
                              </td>
                            </tr>
                          ) : (
                            postedList.map((j) => (
                              <tr key={j.id} className="border-b border-neutral-800 hover:bg-neutral-900/50">
                                <td className="p-3 border-r border-neutral-800 font-mono text-xs">
                                  {new Date(j.tanggal).toLocaleDateString('id-ID')}
                                </td>
                                <td className="p-3 border-r border-neutral-800 text-xs font-mono">{j.sourceType}</td>
                                <td className="p-3 border-r border-neutral-800 font-medium">
                                  {j.keterangan}
                                  {j.isEdited && (
                                    <span className="ml-2 text-[10px] text-neutral-400 border border-neutral-700 px-1 py-0.2 rounded font-mono">
                                      EDITED
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 border-r border-neutral-800 text-right font-mono font-bold">
                                  {formatRupiah(Number(j.total))}
                                </td>
                                <td className="p-3 border-r border-neutral-800 text-center">
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-mono border rounded ${
                                      j.status === 'POSTED'
                                        ? 'border-neutral-700 bg-neutral-900 text-white font-bold'
                                        : 'border-red-800 bg-red-950 text-red-400'
                                    }`}
                                  >
                                    {j.status}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <Button size="sm" variant="outline" onClick={() => handleStartEditJournal(j)}>
                                    Edit
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          );
        })()}

        {/* MENU NERACA SALDO */}
        {activeMenu === 'tb' && tbData && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Neraca Saldo (Trial Balance)</CardTitle>
                  <CardDescription>Hanya menghitung jurnal berstatus POSTED</CardDescription>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded text-xs font-bold border border-neutral-700 bg-neutral-900 text-white">
                    {tbData.summary.isBalanced ? 'BALANCE 100%' : 'TIDAK BALANCE'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse border border-neutral-800">
                  <thead>
                    <tr className="bg-neutral-900 border-b border-neutral-800 text-neutral-300">
                      <th className="p-3 border-r border-neutral-800">Kode</th>
                      <th className="p-3 border-r border-neutral-800">Nama Akun</th>
                      <th className="p-3 border-r border-neutral-800">Tipe</th>
                      <th className="p-3 border-r border-neutral-800 text-right">Debit</th>
                      <th className="p-3 border-r border-neutral-800 text-right">Kredit</th>
                      <th className="p-3 text-right">Saldo Akhir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tbData.accounts.map((acc: any) => (
                      <tr key={acc.code} className="border-b border-neutral-800 hover:bg-neutral-900/50">
                        <td className="p-3 border-r border-neutral-800 font-mono text-xs">{acc.code}</td>
                        <td className="p-3 border-r border-neutral-800 font-medium">{acc.name}</td>
                        <td className="p-3 border-r border-neutral-800 text-xs text-neutral-400">{acc.type}</td>
                        <td className="p-3 border-r border-neutral-800 text-right font-mono">{formatRupiah(acc.debit)}</td>
                        <td className="p-3 border-r border-neutral-800 text-right font-mono">{formatRupiah(acc.kredit)}</td>
                        <td className="p-3 text-right font-mono font-bold">{formatRupiah(acc.endingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-neutral-900 font-bold border-t-2 border-neutral-700">
                      <td colSpan={3} className="p-3 text-right border-r border-neutral-800">TOTAL:</td>
                      <td className="p-3 text-right border-r border-neutral-800 font-mono">{formatRupiah(tbData.summary.totalDebit)}</td>
                      <td className="p-3 text-right border-r border-neutral-800 font-mono">{formatRupiah(tbData.summary.totalKredit)}</td>
                      <td className="p-3 text-right font-mono text-xs text-neutral-400">
                        {tbData.summary.isBalanced ? 'BALANCE' : 'SELISIH'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MENU LABA RUGI */}
        {activeMenu === 'pl' && plData && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Laporan Laba Rugi (Profit & Loss)</CardTitle>
              <CardDescription>Rincian Pendapatan vs Beban Periode</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 border border-neutral-800 bg-neutral-900 rounded">
                  <p className="text-xs text-neutral-400">Total Pendapatan</p>
                  <p className="text-base font-bold font-mono text-white mt-1">{formatRupiah(plData.summary.totalPendapatan)}</p>
                </div>
                <div className="p-3 border border-neutral-800 bg-neutral-900 rounded">
                  <p className="text-xs text-neutral-400">Total HPP</p>
                  <p className="text-base font-bold font-mono text-white mt-1">{formatRupiah(plData.summary.totalHpp)}</p>
                </div>
                <div className="p-3 border border-neutral-800 bg-neutral-900 rounded">
                  <p className="text-xs text-neutral-400">Total Beban Operasional</p>
                  <p className="text-base font-bold font-mono text-white mt-1">{formatRupiah(plData.summary.totalBebanOperasional)}</p>
                </div>
                <div className="p-3 border border-white bg-neutral-900 rounded">
                  <p className="text-xs text-white font-bold">Laba Bersih Final</p>
                  <p className="text-base font-bold font-mono text-white mt-1">{formatRupiah(plData.summary.labaBersih)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MENU BUKU BESAR */}
        {activeMenu === 'ledger' && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Buku Besar (Ledger)</CardTitle>
                  <CardDescription>Pilih akun untuk melihat rincian mutasi & running balance</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="selAcc" className="text-xs">Pilih Akun:</Label>
                  <select
                    id="selAcc"
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="h-9 rounded border border-neutral-800 bg-neutral-900 px-3 text-xs text-white"
                  >
                    <option value="110">110 - Kas Toko</option>
                    <option value="120">120 - Bank BCA</option>
                    <option value="130">130 - Persediaan Barang</option>
                    <option value="210">210 - Hutang Usaha</option>
                    <option value="310">310 - Modal Pemilik</option>
                    <option value="410">410 - Penjualan POS</option>
                    <option value="440">440 - HPP Penjualan</option>
                    <option value="520">520 - Beban Listrik & Air</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {ledgerData && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse border border-neutral-800">
                    <thead>
                      <tr className="bg-neutral-900 border-b border-neutral-800 text-neutral-300">
                        <th className="p-3 border-r border-neutral-800">Tanggal</th>
                        <th className="p-3 border-r border-neutral-800">Keterangan</th>
                        <th className="p-3 border-r border-neutral-800">Sumber</th>
                        <th className="p-3 border-r border-neutral-800 text-right">Debit</th>
                        <th className="p-3 border-r border-neutral-800 text-right">Kredit</th>
                        <th className="p-3 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData.transactions?.map((tx: any) => (
                        <tr key={tx.lineId} className="border-b border-neutral-800 hover:bg-neutral-900/50">
                          <td className="p-3 border-r border-neutral-800 text-xs font-mono">
                            {new Date(tx.tanggal).toLocaleDateString('id-ID')}
                          </td>
                          <td className="p-3 border-r border-neutral-800">{tx.keterangan}</td>
                          <td className="p-3 border-r border-neutral-800 text-xs text-neutral-400">{tx.sourceType}</td>
                          <td className="p-3 border-r border-neutral-800 text-right font-mono">{formatRupiah(tx.debit)}</td>
                          <td className="p-3 border-r border-neutral-800 text-right font-mono">{formatRupiah(tx.kredit)}</td>
                          <td className="p-3 text-right font-mono font-bold">{formatRupiah(tx.runningBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
