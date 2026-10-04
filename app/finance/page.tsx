'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Scale,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Wallet,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Layers,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Store,
  Boxes,
  HelpCircle,
} from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function FinanceDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab');

  // Month & Year state (Default Oktober 2026 / bulan saat ini)
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // 0-indexed: 9 = Oktober
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [useCustomRange, setUseCustomRange] = useState<boolean>(false);

  // Date filter state (YYYY-MM-DD)
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');

  // Quick Filter Akun Buku Besar dalam satu tabel terpadu
  // 'ALL' = Semua transaksi & arus uang
  // '110' = Kas Toko
  // '120' = Bank BCA
  // '130' = Persediaan Barang
  // '310' = Modal Pemilik
  // '410' = Penjualan POS
  // '5xx' = Seluruh Beban Operasional
  const [ledgerAccountFilter, setLedgerAccountFilter] = useState<string>('ALL');
  const [journalStatusFilter, setJournalStatusFilter] = useState<string>('');

  // Expand / collapse Neraca Saldo lengkap
  const [showFullTrialBalance, setShowFullTrialBalance] = useState<boolean>(false);

  // Data states
  const [tbData, setTbData] = useState<any>(null);
  const [plData, setPlData] = useState<any>(null);
  const [journalList, setJournalList] = useState<any[]>([]);

  // Cashflow Quick Form Modal State
  const [showCashflowModal, setShowCashflowModal] = useState(false);
  const [cfType, setCfType] = useState<'CASHFLOW_OUT' | 'CASHFLOW_IN' | 'CASHFLOW_MUTATION'>('CASHFLOW_OUT');
  const [cfKeterangan, setCfKeterangan] = useState('');
  const [cfSourceAccount, setCfSourceAccount] = useState('110');
  const [cfTargetAccount, setCfTargetAccount] = useState('520');
  const [cfNominal, setCfNominal] = useState<number>(0);

  // Manual Journal Form Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [journalKeterangan, setJournalKeterangan] = useState('');
  const [journalDate, setJournalDate] = useState('2026-10-04');
  const [journalLines, setJournalLines] = useState([
    { accountCode: '110', side: 'DEBIT', nominal: 0 },
    { accountCode: '410', side: 'KREDIT', nominal: 0 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Auto open cashflow modal if opened with ?tab=cashflow
  useEffect(() => {
    if (tabParam === 'cashflow') {
      setShowCashflowModal(true);
    }
  }, [tabParam]);

  // Update date range when selectedMonth or selectedYear changes
  useEffect(() => {
    if (!useCustomRange) {
      const year = selectedYear;
      const month = selectedMonth;
      const end = new Date(year, month + 1, 0); // Last day of month

      const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

      setStartDate(startStr);
      setEndDate(endStr);
    }
  }, [selectedMonth, selectedYear, useCustomRange]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setUseCustomRange(false);
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setUseCustomRange(false);
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Load all finance data
  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      const qStr = query.toString() ? `?${query.toString()}` : '';

      const jQ = new URLSearchParams();
      if (startDate) jQ.append('startDate', startDate);
      if (endDate) jQ.append('endDate', endDate);
      if (journalStatusFilter) jQ.append('status', journalStatusFilter);

      const [tbRes, plRes, jRes] = await Promise.all([
        fetch(`/api/accounting/trial-balance${qStr}`),
        fetch(`/api/accounting/profit-loss${qStr}`),
        fetch(`/api/journal?${jQ.toString()}`),
      ]);

      if (tbRes.ok) setTbData(await tbRes.json());
      if (plRes.ok) setPlData(await plRes.json());
      if (jRes.ok) {
        const jData = await jRes.json();
        setJournalList(Array.isArray(jData) ? jData : []);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data keuangan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, journalStatusFilter]);

  const formatRupiah = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  // Posisi Akun Kunci dari Neraca Saldo
  const kasTokoAccount = tbData?.accounts?.find((a: any) => a.code === '110');
  const bankBcaAccount = tbData?.accounts?.find((a: any) => a.code === '120');
  const persediaanAccount = tbData?.accounts?.find((a: any) => a.code === '130');
  const hutangAccount = tbData?.accounts?.find((a: any) => a.code === '210');
  const modalAccount = tbData?.accounts?.find((a: any) => a.code === '310');

  const kasTokoEnding = Number(kasTokoAccount?.endingBalance || 0);
  const bankBcaEnding = Number(bankBcaAccount?.endingBalance || 0);
  const totalLikuiditasUang = kasTokoEnding + bankBcaEnding;

  const kasTokoStarting = Number(kasTokoAccount?.startingBalance || 0);
  const bankBcaStarting = Number(bankBcaAccount?.startingBalance || 0);
  const totalStartingCash = kasTokoStarting + bankBcaStarting;

  const totalPersediaanEnding = Number(persediaanAccount?.endingBalance || 0);
  const totalHutangEnding = Number(hutangAccount?.endingBalance || 0);
  const totalModalEnding = Number(modalAccount?.endingBalance || 0);

  // Total Aktiva & Pasiva
  const totalAktiva = totalLikuiditasUang + totalPersediaanEnding;
  const netProfit = Number(plData?.netProfit || 0);
  const totalPasiva = totalHutangEnding + totalModalEnding + netProfit;

  // Submit Cashflow Cepat
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
      setShowCashflowModal(false);
      setCfKeterangan('');
      setCfNominal(0);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Audit Jurnal
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

      setMessage(`Jurnal berhasil di-audit (Status: ${data.status} - Saldo uang & buku besar diperbarui)`);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Open Edit Modal
  const handleStartEditJournal = (j: any) => {
    setEditingJournalId(j.id);
    setJournalKeterangan(j.keterangan);
    setJournalDate(j.tanggal ? new Date(j.tanggal).toISOString().split('T')[0] : '2026-10-04');
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

  // Submit Jurnal Manual
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
          tanggal: journalDate,
          lines: journalLines.map((l) => ({ ...l, nominal: Number(l.nominal) })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan jurnal');

      setMessage(editingJournalId ? 'Jurnal berhasil diperbarui!' : `Jurnal Manual Berhasil Dibuat!`);
      setShowManualModal(false);
      setEditingJournalId(null);
      setJournalKeterangan('');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // =========================================================================
  // LOGIKA UTAMA: PENYATUAN JURNAL UMUM + BUKU BESAR + NERACA PER TANGGAL
  // SETIAP TRANSAKSI LANGSUNG MENGALIR KE UANG (KAS & BANK) + RUNNING BALANCE
  // =========================================================================
  const { processedEntries, groupedByDate, totalCashIn, totalCashOut } = useMemo(() => {
    // 1. Urutkan jurnal secara kronologis menaik (ascending) agar running balance akurat
    const sorted = [...journalList].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    let runningKas = kasTokoStarting;
    let runningBank = bankBcaStarting;
    let runningTotal = totalStartingCash;

    let runningAccountBalance = 0; // Jika filter buku besar spesifik aktif
    if (ledgerAccountFilter !== 'ALL') {
      const filteredAcc = tbData?.accounts?.find((a: any) => a.code === ledgerAccountFilter);
      runningAccountBalance = Number(filteredAcc?.startingBalance || 0);
    }

    let sumCashIn = 0;
    let sumCashOut = 0;

    const enriched = sorted.map((entry) => {
      // Hitung dampak ke Uang Kas (110) dan Bank (120)
      let kasIn = 0;
      let kasOut = 0;
      let bankIn = 0;
      let bankOut = 0;

      // Akun lawan (non-cash atau penyeimbang)
      const offsettingLines: any[] = [];
      let accountLine: any = null;

      entry.lines?.forEach((line: any) => {
        const nom = Number(line.nominal);

        if (line.accountCode === '110') {
          if (line.side === 'DEBIT') kasIn += nom;
          if (line.side === 'KREDIT') kasOut += nom;
        } else if (line.accountCode === '120') {
          if (line.side === 'DEBIT') bankIn += nom;
          if (line.side === 'KREDIT') bankOut += nom;
        } else {
          offsettingLines.push(line);
        }

        // Cek jika mencocoki filter buku besar spesifik
        if (ledgerAccountFilter !== 'ALL') {
          if (ledgerAccountFilter === '5xx') {
            if (line.accountCode.startsWith('5')) accountLine = line;
          } else if (line.accountCode === ledgerAccountFilter) {
            accountLine = line;
          }
        }
      });

      const entryCashIn = kasIn + bankIn;
      const entryCashOut = kasOut + bankOut;

      // Update akumulasi jika jurnal POSTED
      if (entry.status === 'POSTED') {
        runningKas += (kasIn - kasOut);
        runningBank += (bankIn - bankOut);
        runningTotal += (entryCashIn - entryCashOut);
        sumCashIn += entryCashIn;
        sumCashOut += entryCashOut;

        if (accountLine) {
          const nom = Number(accountLine.nominal);
          const isDebit = accountLine.side === 'DEBIT';
          const accNormal = accountLine.account?.normalBalance || 'DEBIT';
          if (accNormal === 'DEBIT') {
            runningAccountBalance += isDebit ? nom : -nom;
          } else {
            runningAccountBalance += isDebit ? -nom : nom;
          }
        }
      }

      // Deteksi akun uang yang terpengaruh
      let moneyAccountLabel = 'Non-Kas (Jurnal Akun)';
      if (kasIn > 0 || kasOut > 0) {
        moneyAccountLabel = bankIn > 0 || bankOut > 0 ? 'Kas & Bank' : '110 Kas Toko';
      } else if (bankIn > 0 || bankOut > 0) {
        moneyAccountLabel = '120 Bank BCA';
      }

      return {
        ...entry,
        kasIn,
        kasOut,
        bankIn,
        bankOut,
        entryCashIn,
        entryCashOut,
        netCashFlow: entryCashIn - entryCashOut,
        runningKas,
        runningBank,
        runningTotal,
        runningAccountBalance,
        moneyAccountLabel,
        offsettingLines,
        matchedAccountLine: accountLine,
      };
    });

    // 2. Filter akun jika ada filter buku besar aktif
    let filtered = enriched;
    if (ledgerAccountFilter !== 'ALL') {
      filtered = enriched.filter((e) => {
        if (ledgerAccountFilter === '110') return e.kasIn > 0 || e.kasOut > 0;
        if (ledgerAccountFilter === '120') return e.bankIn > 0 || e.bankOut > 0;
        if (ledgerAccountFilter === '5xx') return e.lines?.some((l: any) => l.accountCode.startsWith('5'));
        return e.lines?.some((l: any) => l.accountCode === ledgerAccountFilter);
      });
    }

    // 3. Kelompokkan per tanggal (Grouped by Date)
    // Urutkan tanggal terbaru di atas untuk kemudahan membaca operasional harian
    const groups: { [dateStr: string]: typeof filtered } = {};
    const reversed = [...filtered].reverse();

    reversed.forEach((item) => {
      const dateKey = item.tanggal ? item.tanggal.slice(0, 10) : 'Tanpa Tanggal';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });

    return {
      processedEntries: filtered,
      groupedByDate: groups,
      totalCashIn: sumCashIn,
      totalCashOut: sumCashOut,
    };
  }, [journalList, kasTokoStarting, bankBcaStarting, totalStartingCash, ledgerAccountFilter, tbData]);

  const pendingJournals = journalList.filter((j) => j.status === 'DRAFT');

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      {/* GLOBAL SYSTEM UNIFIED SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-6 lg:p-8 space-y-6 overflow-y-auto">
        {/* TOAST FEEDBACK */}
        {(message || error) && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
              error
                ? 'bg-red-950 border-red-600 text-red-300'
                : 'bg-emerald-950 border-emerald-600 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {error ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              <span>{error || message}</span>
            </div>
            <button
              onClick={() => {
                setError('');
                setMessage('');
              }}
              className="text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* HEADER UTAMA & SELECTOR PERIODE BULAN / TANGGAL */}
        <header className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-white text-black rounded-xl shadow-sm">
                <Wallet className="w-5 h-5 text-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-white tracking-tight">
                    Buku Kas & Akuntansi Terpadu
                  </h1>
                  <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 text-[10px] font-mono">
                    JURNAL + LEDGER + NERACA
                  </Badge>
                </div>
                <p className="text-xs text-neutral-400">
                  Pencatatan harian per tanggal otomatis mengalir ke posisi uang kas toko, rekening bank, dan neraca bulanan.
                </p>
              </div>
            </div>
          </div>

          {/* PERIODE SELECTOR (BULAN & TANGGAL) + QUICK ACTIONS */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Month Switcher */}
            <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-xl p-1">
              <button
                onClick={handlePrevMonth}
                title="Bulan Sebelumnya"
                className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white cursor-pointer transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-3 py-1 text-xs font-mono font-bold text-white flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </span>
              </div>

              <button
                onClick={handleNextMonth}
                title="Bulan Berikutnya"
                className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white cursor-pointer transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Date Range Toggle */}
            <button
              onClick={() => setUseCustomRange(!useCustomRange)}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                useCustomRange
                  ? 'bg-neutral-800 text-white border-neutral-600'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-900 border-neutral-800'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{useCustomRange ? 'Rentang Kustom' : 'Filter Tanggal'}</span>
            </button>

            {useCustomRange && (
              <div className="flex items-center gap-2 text-xs bg-neutral-950 border border-neutral-800 p-1.5 rounded-xl">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-7 w-32 bg-black border-neutral-700 text-xs"
                />
                <span className="text-neutral-500 text-xs">s/d</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-7 w-32 bg-black border-neutral-700 text-xs"
                />
              </div>
            )}

            {/* Quick Action: Arus Kas Modal */}
            <Button
              onClick={() => setShowCashflowModal(true)}
              size="sm"
              variant="outline"
              className="h-9 bg-neutral-900 border-neutral-700 hover:bg-neutral-800 text-white text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
              <span>+ Arus Kas</span>
            </Button>

            {/* Quick Action: Jurnal Manual */}
            <Button
              onClick={() => {
                setEditingJournalId(null);
                setJournalKeterangan('');
                setJournalLines([
                  { accountCode: '110', side: 'DEBIT', nominal: 0 },
                  { accountCode: '410', side: 'KREDIT', nominal: 0 },
                ]);
                setShowManualModal(true);
              }}
              size="sm"
              className="h-9 bg-white hover:bg-neutral-200 text-black text-xs font-bold gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Jurnal Manual</span>
            </Button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* SECTION 1: RINGKASAN POSISI UANG & NERACA BULANAN                         */}
        {/* SEMUA TRANSAKSI OTOMATIS BERAKHIR KE UANG RIIL DAN NERACA SEIMBANG         */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {/* 1. Kas Toko (Tunai) */}
            <Card className="border-neutral-800 bg-neutral-950 hover:border-neutral-700 transition">
              <CardHeader className="p-3 pb-1">
                <CardDescription className="text-[11px] text-neutral-400 flex items-center justify-between">
                  <span>Kas Fisik (110)</span>
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                </CardDescription>
                <CardTitle className="text-xs xl:text-sm font-mono font-bold text-emerald-400 whitespace-nowrap">
                  {formatRupiah(kasTokoEnding)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-[10px] text-neutral-500 truncate">
                  Awal: {formatRupiah(kasTokoStarting)}
                </p>
              </CardContent>
            </Card>

            {/* 2. Rekening Bank (BCA) */}
            <Card className="border-neutral-800 bg-neutral-950 hover:border-neutral-700 transition">
              <CardHeader className="p-3 pb-1">
                <CardDescription className="text-[11px] text-neutral-400 flex items-center justify-between">
                  <span>Bank BCA (120)</span>
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                </CardDescription>
                <CardTitle className="text-xs xl:text-sm font-mono font-bold text-blue-400 whitespace-nowrap">
                  {formatRupiah(bankBcaEnding)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-[10px] text-neutral-500 truncate">
                  Awal: {formatRupiah(bankBcaStarting)}
                </p>
              </CardContent>
            </Card>

            {/* 3. Total Uang Likuid Toko */}
            <Card className="border-neutral-800 bg-neutral-950 hover:border-neutral-700 transition">
              <CardHeader className="p-3 pb-1">
                <CardDescription className="text-[11px] text-neutral-400 flex items-center justify-between">
                  <span>Total Likuiditas</span>
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                </CardDescription>
                <CardTitle className="text-xs xl:text-sm font-mono font-bold text-white whitespace-nowrap">
                  {formatRupiah(totalLikuiditasUang)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-[10px] text-neutral-500 truncate">Kas + Bank</p>
              </CardContent>
            </Card>

            {/* 4. Persediaan Laptop (Stok Barang) */}
            <Card className="border-neutral-800 bg-neutral-950 hover:border-neutral-700 transition">
              <CardHeader className="p-3 pb-1">
                <CardDescription className="text-[11px] text-neutral-400 flex items-center justify-between">
                  <span>Stok Laptop (130)</span>
                  <Boxes className="w-3.5 h-3.5 text-purple-400" />
                </CardDescription>
                <CardTitle className="text-xs xl:text-sm font-mono font-bold text-purple-400 whitespace-nowrap">
                  {formatRupiah(totalPersediaanEnding)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-[10px] text-neutral-500 truncate">Modal di etalase</p>
              </CardContent>
            </Card>

            {/* 5. Omzet & Laba Bersih Bulan Ini */}
            <Card className="border-neutral-800 bg-neutral-950 hover:border-neutral-700 transition">
              <CardHeader className="p-3 pb-1">
                <CardDescription className="text-[11px] text-neutral-400 flex items-center justify-between">
                  <span>Laba Bersih</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </CardDescription>
                <CardTitle
                  className={`text-xs xl:text-sm font-mono font-bold whitespace-nowrap ${
                    netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatRupiah(netProfit)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-[10px] text-neutral-500 truncate">
                  Omzet: {formatRupiah(plData?.totalRevenue || 0)}
                </p>
              </CardContent>
            </Card>

            {/* 6. Status Neraca Double-Entry */}
            <Card className="border-neutral-800 bg-neutral-950 hover:border-neutral-700 transition">
              <CardHeader className="p-3.5 pb-1">
                <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                  <span>Status Neraca Saldo</span>
                  <Scale className="w-4 h-4 text-emerald-400" />
                </CardDescription>
                <CardTitle className="text-sm font-bold text-white pt-1">
                  {(tbData?.summary?.isBalanced ?? tbData?.isBalanced) ? (
                    <span className="text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 inline" /> 100% BALANCE
                    </span>
                  ) : (
                    <span className="text-red-400 font-mono flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 inline" /> UNBALANCED
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-0">
                <button
                  onClick={() => setShowFullTrialBalance(!showFullTrialBalance)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-1 font-semibold"
                >
                  <span>{showFullTrialBalance ? 'Sembunyikan Neraca' : 'Rincian Neraca COA'}</span>
                  {showFullTrialBalance ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </CardContent>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* PANEL RINCIAN NERACA SALDO & LABA RUGI (TOGGLE EXPANDABLE)                 */}
          {/* ========================================================================= */}
          {showFullTrialBalance && tbData && (
            <div className="border border-neutral-800 bg-neutral-950 rounded-xl p-4 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    Neraca Saldo (Trial Balance) & Posisi Keuangan Toko
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Akumulasi saldo awal, mutasi debit/kredit, dan saldo akhir seluruh kode akun pada periode {startDate} s/d {endDate}.
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-neutral-400">
                    Total Debit: {formatRupiah(tbData.summary?.totalDebit ?? tbData.totalDebit ?? 0)}
                  </span>
                  <span className="text-neutral-500">|</span>
                  <span className="text-neutral-400">
                    Total Kredit: {formatRupiah(tbData.summary?.totalKredit ?? tbData.totalKredit ?? 0)}
                  </span>
                </div>
              </div>

              {/* Grid 2 Kolom: Neraca Keuangan (Aktiva vs Pasiva) & Laba Rugi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kolom Kiri: Neraca Posisi Keuangan */}
                <div className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-lg space-y-2.5 text-xs font-mono">
                  <p className="font-bold text-white uppercase text-[11px] border-b border-neutral-800 pb-1 flex justify-between">
                    <span>1. AKTIVA (ASET)</span>
                    <span className="text-emerald-400">{formatRupiah(totalAktiva)}</span>
                  </p>
                  <div className="space-y-1 text-neutral-300">
                    <div className="flex justify-between">
                      <span>• Kas Toko (110):</span>
                      <span className="text-white font-bold">{formatRupiah(kasTokoEnding)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Bank BCA (120):</span>
                      <span className="text-white font-bold">{formatRupiah(bankBcaEnding)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Persediaan Laptop (130):</span>
                      <span className="text-white font-bold">{formatRupiah(totalPersediaanEnding)}</span>
                    </div>
                  </div>

                  <p className="font-bold text-white uppercase text-[11px] border-b border-neutral-800 pt-2 pb-1 flex justify-between">
                    <span>2. PASIVA (KEWAJIBAN & EKUITAS)</span>
                    <span className="text-blue-400">{formatRupiah(totalPasiva)}</span>
                  </p>
                  <div className="space-y-1 text-neutral-300">
                    <div className="flex justify-between">
                      <span>• Hutang Usaha (210):</span>
                      <span className="text-white font-bold">{formatRupiah(totalHutangEnding)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Modal Pemilik (310):</span>
                      <span className="text-white font-bold">{formatRupiah(totalModalEnding)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Laba Bersih Berjalan:</span>
                      <span className={`font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatRupiah(netProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Kolom Kanan: Rincian Seluruh Akun Bagan Akun (COA Table) */}
                <div className="overflow-x-auto max-h-56 overflow-y-auto border border-neutral-800 rounded-lg">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="sticky top-0 bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                      <tr>
                        <th className="p-2">Kode & Nama</th>
                        <th className="p-2 text-right">Debit</th>
                        <th className="p-2 text-right">Kredit</th>
                        <th className="p-2 text-right">Saldo Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {tbData?.accounts?.map((acc: any) => (
                        <tr key={acc.code} className="hover:bg-neutral-800/40">
                          <td className="p-2 text-neutral-200">
                            <span className="font-bold text-white">[{acc.code}]</span> {acc.name}
                          </td>
                          <td className="p-2 text-right text-emerald-400/90">{formatRupiah(acc.debit)}</td>
                          <td className="p-2 text-right text-blue-400/90">{formatRupiah(acc.kredit)}</td>
                          <td className="p-2 text-right font-bold text-white">{formatRupiah(acc.endingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: BUKU KAS, JURNAL UMUM & BESAR TERPADU PER TANGGAL             */}
        {/* MENYATUKAN SELURUH ALIRAN TRANSAKSI, MUTASI KAS & LAWAN DOUBLE ENTRY     */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          {/* TOOLBAR FILTER & STATISTIK MUTASI PERIODE INI */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl">
            {/* Quick Filter Akun Buku Besar (Tanpa ganti halaman) */}
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] w-full md:w-auto">
              <span className="text-xs text-neutral-400 font-semibold whitespace-nowrap mr-1">
                Filter Akun:
              </span>

              {[
                { key: 'ALL', label: 'Semua Transaksi' },
                { key: '110', label: '💵 110 Kas Toko' },
                { key: '120', label: '🏦 120 Bank BCA' },
                { key: '130', label: '📦 130 Persediaan' },
                { key: '310', label: '💼 310 Modal' },
                { key: '410', label: '🛒 410 Penjualan' },
                { key: '5xx', label: '📉 5xx Beban Operasional' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setLedgerAccountFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition cursor-pointer whitespace-nowrap ${
                    ledgerAccountFilter === tab.key
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filter Status Jurnal & Ringkasan Cash In / Out */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end text-xs">
              <div className="flex items-center gap-2 font-mono">
                <span className="text-emerald-400 font-bold">
                  +Masuk: {formatRupiah(totalCashIn)}
                </span>
                <span className="text-neutral-500">|</span>
                <span className="text-red-400 font-bold">
                  -Keluar: {formatRupiah(totalCashOut)}
                </span>
              </div>

              <select
                value={journalStatusFilter}
                onChange={(e) => setJournalStatusFilter(e.target.value)}
                className="h-8 px-2.5 bg-black border border-neutral-700 rounded-lg text-xs text-white"
              >
                <option value="">Semua Status</option>
                <option value="DRAFT">Hanya DRAFT ({pendingJournals.length})</option>
                <option value="POSTED">Hanya POSTED</option>
              </select>
            </div>
          </div>

          {/* TABEL TERPADU PER TANGGAL (BUKU KAS & JURNAL UMUM BESAR) */}
          <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/80 text-neutral-400 font-mono text-[11px]">
                    <th className="p-3.5 whitespace-nowrap">Tanggal & Jam</th>
                    <th className="p-3.5 whitespace-nowrap">No. Jurnal / Sumber</th>
                    <th className="p-3.5">Keterangan Transaksi</th>
                    <th className="p-3.5 text-right whitespace-nowrap text-emerald-400">Uang Masuk (+)</th>
                    <th className="p-3.5 text-right whitespace-nowrap text-red-400">Uang Keluar (-)</th>
                    <th className="p-3.5 whitespace-nowrap">Akun Kas / Bank</th>
                    <th className="p-3.5 text-right whitespace-nowrap text-white">Saldo Uang Berjalan</th>
                    <th className="p-3.5">Jurnal Akuntansi Lawan (Double-Entry)</th>
                    <th className="p-3.5 text-center">Status & Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-800/70">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-neutral-500 font-mono">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-400" />
                        Memuat pembukuan dan mutasi kas...
                      </td>
                    </tr>
                  ) : Object.keys(groupedByDate).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-neutral-500 font-mono">
                        Tidak ada transaksi pada periode {startDate} s/d {endDate}.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedByDate).map(([dateStr, dateEntries]) => {
                      // Subtotal harian untuk uang masuk & keluar
                      const dayCashIn = dateEntries.reduce((sum, e) => (e.status === 'POSTED' ? sum + e.entryCashIn : sum), 0);
                      const dayCashOut = dateEntries.reduce((sum, e) => (e.status === 'POSTED' ? sum + e.entryCashOut : sum), 0);

                      const formattedDateHeader = new Date(dateStr).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      });

                      return (
                        <React.Fragment key={dateStr}>
                          {/* HEADER PEMBATAS TANGGAL (GROUP HEADER PER TANGGAL) */}
                          <tr className="bg-neutral-900/60 border-t-2 border-neutral-800 text-xs font-mono font-bold">
                            <td colSpan={3} className="p-2.5 px-3.5 text-white flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-blue-400" />
                              <span>{formattedDateHeader}</span>
                              <span className="text-[10px] text-neutral-400 font-normal">
                                ({dateEntries.length} transaksi)
                              </span>
                            </td>
                            <td className="p-2.5 text-right text-emerald-400 font-bold whitespace-nowrap">
                              {dayCashIn > 0 ? `+${formatRupiah(dayCashIn)}` : '-'}
                            </td>
                            <td className="p-2.5 text-right text-red-400 font-bold whitespace-nowrap">
                              {dayCashOut > 0 ? `-${formatRupiah(dayCashOut)}` : '-'}
                            </td>
                            <td colSpan={4} className="p-2.5 text-right text-neutral-400 text-[10px] pr-4">
                              Subtotal Kas Masuk/Keluar Hari Ini
                            </td>
                          </tr>

                          {/* BARIS TRANSAKSI PADA TANGGAL INI */}
                          {dateEntries.map((j) => (
                            <tr
                              key={j.id}
                              className={`hover:bg-neutral-900/50 transition ${
                                j.status === 'DRAFT' ? 'bg-yellow-950/10' : ''
                              }`}
                            >
                              {/* 1. Jam Transaksi */}
                              <td className="p-3.5 font-mono text-neutral-400 whitespace-nowrap">
                                {j.tanggal
                                  ? new Date(j.tanggal).toLocaleTimeString('id-ID', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '-'}
                              </td>

                              {/* 2. No. Jurnal / Sumber */}
                              <td className="p-3.5 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-700 text-neutral-300">
                                  {j.sourceType}
                                </span>
                              </td>

                              {/* 3. Keterangan */}
                              <td className="p-3.5 font-medium text-white max-w-[260px]">
                                {j.keterangan}
                              </td>

                              {/* 4. Uang Masuk (+) */}
                              <td className="p-3.5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                                {j.entryCashIn > 0 ? `+${formatRupiah(j.entryCashIn)}` : '-'}
                              </td>

                              {/* 5. Uang Keluar (-) */}
                              <td className="p-3.5 text-right font-mono font-bold text-red-400 whitespace-nowrap">
                                {j.entryCashOut > 0 ? `-${formatRupiah(j.entryCashOut)}` : '-'}
                              </td>

                              {/* 6. Akun Uang Kas / Bank */}
                              <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                                <span
                                  className={`px-2 py-0.5 rounded font-semibold ${
                                    j.moneyAccountLabel.includes('110')
                                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                      : j.moneyAccountLabel.includes('120')
                                      ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                                      : 'bg-neutral-900 text-neutral-400 border border-neutral-700'
                                  }`}
                                >
                                  {j.moneyAccountLabel}
                                </span>
                              </td>

                              {/* 7. Saldo Uang Berjalan */}
                              <td className="p-3.5 text-right font-mono font-bold text-white whitespace-nowrap">
                                {j.status === 'POSTED' ? (
                                  ledgerAccountFilter !== 'ALL' ? (
                                    formatRupiah(j.runningAccountBalance)
                                  ) : (
                                    formatRupiah(j.runningTotal)
                                  )
                                ) : (
                                  <span className="text-[10px] text-yellow-500 font-mono italic">
                                    (Menunggu Audit)
                                  </span>
                                )}
                              </td>

                              {/* 8. Akun Lawan Jurnal (Double Entry) */}
                              <td className="p-3.5">
                                <div className="space-y-1 font-mono text-[11px]">
                                  {j.offsettingLines?.length > 0 ? (
                                    j.offsettingLines.map((line: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className={`flex items-center gap-1.5 ${
                                          line.side === 'DEBIT' ? 'text-emerald-400' : 'text-blue-400'
                                        }`}
                                      >
                                        <span className="font-bold">[{line.accountCode}]</span>
                                        <span className="truncate max-w-[130px]">{line.account?.name || ''}</span>
                                        <span className="text-neutral-400 text-[10px]">({line.side})</span>
                                        <span className="text-white font-semibold">
                                          {formatRupiah(line.nominal)}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="space-y-1">
                                      {j.lines?.map((line: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className={`flex items-center gap-1.5 ${
                                            line.side === 'DEBIT' ? 'text-emerald-400' : 'text-blue-400'
                                          }`}
                                        >
                                          <span className="font-bold">[{line.accountCode}]</span>
                                          <span>{line.account?.name || ''}</span>
                                          <span className="text-white font-semibold">{formatRupiah(line.nominal)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 9. Status & Tombol Aksi */}
                              <td className="p-3.5 text-center whitespace-nowrap">
                                {j.status === 'DRAFT' ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Button
                                      onClick={() => handleAuditJournal(j.id, 'APPROVE')}
                                      size="sm"
                                      className="h-6 text-[10px] bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-2 cursor-pointer shadow-sm"
                                    >
                                      Setujui (POST)
                                    </Button>
                                    <Button
                                      onClick={() => handleAuditJournal(j.id, 'REJECT')}
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[10px] border-red-800 text-red-400 hover:bg-red-950 px-2 cursor-pointer"
                                    >
                                      Tolak
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                      POSTED
                                    </span>
                                    <Button
                                      onClick={() => handleStartEditJournal(j)}
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] border-neutral-700 bg-neutral-900 hover:bg-neutral-800 font-semibold px-2 cursor-pointer"
                                    >
                                      Koreksi
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* MODAL 1: INPUT ARUS KAS CEPAT (CASHFLOW MODAL)                            */}
        {/* ========================================================================= */}
        {showCashflowModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg border-neutral-800 bg-neutral-950 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                    Input Mutasi Arus Kas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Catat pengeluaran operasional atau penerimaan kas toko.
                  </CardDescription>
                </div>
                <button
                  onClick={() => setShowCashflowModal(false)}
                  className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCashflow} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Jenis Arus Kas</Label>
                    <select
                      value={cfType}
                      onChange={(e) => setCfType(e.target.value as any)}
                      className="w-full h-9 px-3 bg-black border border-neutral-700 rounded-md text-xs text-white"
                    >
                      <option value="CASHFLOW_OUT">Cash Out (Pengeluaran Beban Toko)</option>
                      <option value="CASHFLOW_IN">Cash In (Penerimaan Kas Lainnya)</option>
                      <option value="CASHFLOW_MUTATION">Mutasi Kas (Toko ke Bank BCA / Sebaliknya)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Akun Sumber (Kredit / Keluar)</Label>
                      <select
                        value={cfSourceAccount}
                        onChange={(e) => setCfSourceAccount(e.target.value)}
                        className="w-full h-9 px-3 bg-black border border-neutral-700 rounded-md text-xs text-white font-mono"
                      >
                        <option value="110">110 - Kas Toko / Laci</option>
                        <option value="120">120 - Bank BCA Transfer</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Akun Peruntukan (Debit / Beban)</Label>
                      <select
                        value={cfTargetAccount}
                        onChange={(e) => setCfTargetAccount(e.target.value)}
                        className="w-full h-9 px-3 bg-black border border-neutral-700 rounded-md text-xs text-white font-mono"
                      >
                        <option value="520">520 - Beban Listrik & Air</option>
                        <option value="510">510 - Beban Gaji Karyawan</option>
                        <option value="530">530 - Beban Selisih Kas</option>
                        <option value="120">120 - Bank BCA (Setor Tunai)</option>
                        <option value="110">110 - Kas Toko (Tarik Tunai)</option>
                        <option value="130">130 - Persediaan Laptop</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Keterangan Transaksi</Label>
                    <Input
                      required
                      placeholder="Contoh: Beli token listrik toko / Konsumsi kasir"
                      value={cfKeterangan}
                      onChange={(e) => setCfKeterangan(e.target.value)}
                      className="h-9 bg-black border-neutral-700 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Nominal (Rp)</Label>
                    <Input
                      required
                      type="number"
                      placeholder="250000"
                      value={cfNominal || ''}
                      onChange={(e) => setCfNominal(Number(e.target.value))}
                      className="h-9 bg-black border-neutral-700 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCashflowModal(false)}
                      className="h-9 text-xs border-neutral-700"
                    >
                      Batal
                    </Button>
                    <Button type="submit" className="h-9 text-xs bg-white text-black font-bold">
                      Simpan Mutasi Kas
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: INPUT / EDIT JURNAL MANUAL                                       */}
        {/* ========================================================================= */}
        {showManualModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-xl border-neutral-800 bg-neutral-950 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    {editingJournalId ? 'Koreksi Jurnal Transaksi' : 'Buat Jurnal Umum Manual'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Entri double-entry manual (Debit & Kredit harus seimbang).
                  </CardDescription>
                </div>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveManualJournal} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs">Keterangan Jurnal</Label>
                      <Input
                        required
                        placeholder="Contoh: Setoran Modal Tambahan Pemilik"
                        value={journalKeterangan}
                        onChange={(e) => setJournalKeterangan(e.target.value)}
                        className="h-9 bg-black border-neutral-700 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Tanggal</Label>
                      <Input
                        type="date"
                        value={journalDate}
                        onChange={(e) => setJournalDate(e.target.value)}
                        className="h-9 bg-black border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 border border-neutral-800 p-3 rounded-xl bg-black">
                    <Label className="text-xs text-neutral-400 font-mono">Baris Double-Entry (Debit / Kredit)</Label>
                    {journalLines.map((line, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                        <div className="col-span-5">
                          <select
                            value={line.accountCode}
                            onChange={(e) => {
                              const updated = [...journalLines];
                              updated[idx].accountCode = e.target.value;
                              setJournalLines(updated);
                            }}
                            className="w-full h-8 px-2 bg-neutral-900 border border-neutral-700 rounded text-xs text-white font-mono"
                          >
                            <option value="110">110 - Kas Toko (Tunai)</option>
                            <option value="120">120 - Bank BCA (Transfer)</option>
                            <option value="130">130 - Persediaan Laptop</option>
                            <option value="210">210 - Hutang Usaha</option>
                            <option value="310">310 - Modal Pemilik</option>
                            <option value="410">410 - Penjualan POS</option>
                            <option value="440">440 - HPP Penjualan</option>
                            <option value="510">510 - Beban Gaji</option>
                            <option value="520">520 - Beban Listrik & Air</option>
                          </select>
                        </div>

                        <div className="col-span-3">
                          <select
                            value={line.side}
                            onChange={(e) => {
                              const updated = [...journalLines];
                              updated[idx].side = e.target.value as any;
                              setJournalLines(updated);
                            }}
                            className="w-full h-8 px-2 bg-neutral-900 border border-neutral-700 rounded text-xs text-white font-mono"
                          >
                            <option value="DEBIT">DEBIT (+)</option>
                            <option value="KREDIT">KREDIT (-)</option>
                          </select>
                        </div>

                        <div className="col-span-4">
                          <Input
                            type="number"
                            required
                            placeholder="Nominal"
                            value={line.nominal || ''}
                            onChange={(e) => {
                              const updated = [...journalLines];
                              updated[idx].nominal = Number(e.target.value);
                              setJournalLines(updated);
                            }}
                            className="h-8 bg-neutral-900 border-neutral-700 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowManualModal(false)}
                      className="h-9 text-xs border-neutral-700"
                    >
                      Batal
                    </Button>
                    <Button type="submit" className="h-9 text-xs bg-white text-black font-bold">
                      {editingJournalId ? 'Simpan Koreksi' : 'Posting Jurnal'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default function FinanceDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-black text-white font-mono text-sm">
          Memuat portal keuangan...
        </div>
      }
    >
      <FinanceDashboardContent />
    </Suspense>
  );
}
