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
  FileText,
  BookOpen,
  Scale,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Wallet,
  DollarSign,
  Building2,
  Filter,
  RefreshCw,
  Search,
  Store,
  Package,
  Briefcase,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  X,
  ShieldCheck,
  CheckSquare,
  AlertCircle,
  Eye,
  Edit,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

type FinanceTab = 'jurnal' | 'buku-besar' | 'neraca' | 'cashflow';

function FinanceDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab');

  // Tab Utama yang Aktif:
  // 'jurnal' = Jurnal Umum
  // 'buku-besar' = Buku Besar (General Ledger)
  // 'neraca' = Neraca & Laporan Keuangan (Trial Balance & Balance Sheet)
  // 'cashflow' = Arus Kas (Cashflow)
  const [activeTab, setActiveTab] = useState<FinanceTab>('jurnal');

  useEffect(() => {
    if (tabParam === 'buku-besar') {
      setActiveTab('buku-besar');
    } else if (tabParam === 'neraca') {
      setActiveTab('neraca');
    } else if (tabParam === 'cashflow') {
      setActiveTab('cashflow');
    } else if (tabParam === 'jurnal' || tabParam === 'accounting' || !tabParam) {
      setActiveTab('jurnal');
    }
  }, [tabParam]);

  const switchTab = (tab: FinanceTab) => {
    setActiveTab(tab);
    router.push(`/finance?tab=${tab}`);
  };

  // Month & Year state (Default Oktober 2026)
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // 0-indexed: 9 = Oktober
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [useCustomRange, setUseCustomRange] = useState<boolean>(false);

  // Date filter state (YYYY-MM-DD)
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');

  // Filter khusus Tab Jurnal Umum
  const [journalViewTab, setJournalViewTab] = useState<'posted' | 'draft' | 'rejected'>('posted');
  const [journalSourceFilter, setJournalSourceFilter] = useState<string>('');
  const [journalSearchQuery, setJournalSearchQuery] = useState<string>('');
  const [correctionFilter, setCorrectionFilter] = useState<'ALL' | 'UNCORRECTED' | 'CORRECTED'>('ALL');

  // Akun Buku Besar yang sedang dipilih
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>('110');
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [ledgerLoading, setLedgerLoading] = useState<boolean>(false);

  // Sub-tab untuk Neraca & Laporan
  const [reportSubTab, setReportSubTab] = useState<'neraca-posisi' | 'trial-balance' | 'laba-rugi'>('neraca-posisi');

  // Data states
  const [tbData, setTbData] = useState<any>(null);
  const [plData, setPlData] = useState<any>(null);
  const [journalList, setJournalList] = useState<any[]>([]);

  // Audit Modal State
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [selectedAuditJournal, setSelectedAuditJournal] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  // Cashflow Quick Form Modal State
  const [showCashflowModal, setShowCashflowModal] = useState<boolean>(false);
  const [cfType, setCfType] = useState<'CASHFLOW_OUT' | 'CASHFLOW_IN' | 'CASHFLOW_MUTATION'>('CASHFLOW_OUT');
  const [cfKeterangan, setCfKeterangan] = useState('');
  const [cfSourceAccount, setCfSourceAccount] = useState('110');
  const [cfTargetAccount, setCfTargetAccount] = useState('520');
  const [cfNominal, setCfNominal] = useState<number>(0);

  // Manual Journal Form Modal State
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
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

  // Helper untuk token auth
  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Update rentang tanggal saat bulan atau tahun berubah
  useEffect(() => {
    if (!useCustomRange) {
      const year = selectedYear;
      const month = selectedMonth;
      const end = new Date(year, month + 1, 0); // Hari terakhir bulan

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

  // Auto-dismiss message notification
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(''), 3500);
      return () => clearTimeout(t);
    }
  }, [message]);

  // Load Trial Balance, Profit Loss, and Journals
  // isSilent: jika true, tidak memicu loading spinner sehingga scroll tidak meloncat
  const loadData = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    setError('');

    try {
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      const qStr = query.toString() ? `?${query.toString()}` : '';

      const jQ = new URLSearchParams();
      if (startDate) jQ.append('startDate', startDate);
      if (endDate) jQ.append('endDate', endDate);
      if (journalSourceFilter) jQ.append('sourceType', journalSourceFilter);

      const [tbRes, plRes, jRes] = await Promise.all([
        fetch(`/api/accounting/trial-balance${qStr}`, { headers: getAuthHeaders() }),
        fetch(`/api/accounting/profit-loss${qStr}`, { headers: getAuthHeaders() }),
        fetch(`/api/journal?${jQ.toString()}`, { headers: getAuthHeaders() }),
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
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, journalSourceFilter]);

  // Load Ledger untuk akun terpilih
  const loadLedger = async (accountCode: string) => {
    setLedgerLoading(true);
    try {
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      const res = await fetch(`/api/accounting/ledger/${accountCode}?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setLedgerData(data);
      } else {
        setLedgerData(null);
      }
    } catch (e) {
      console.error(e);
      setLedgerData(null);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'buku-besar') {
      loadLedger(selectedLedgerAccount);
    }
  }, [activeTab, selectedLedgerAccount, startDate, endDate]);

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

  const totalPersediaanEnding = Number(persediaanAccount?.endingBalance || 0);
  const totalHutangEnding = Number(hutangAccount?.endingBalance || 0);
  const totalModalEnding = Number(modalAccount?.endingBalance || 0);

  // Total Aktiva & Pasiva
  const totalAktiva = totalLikuiditasUang + totalPersediaanEnding;
  const netProfit = Number(plData?.netProfit || 0);
  const totalPasiva = totalHutangEnding + totalModalEnding + netProfit;

  // Audit Eksekusi (DRAFT -> POSTED / REJECTED)
  const handleAuditJournal = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setAuditLoading(true);
    setError('');

    // 1. Optimistic Update: Langsung ubah status di UI lokal agar tidak jumping
    setJournalList((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: action === 'APPROVE' ? 'POSTED' : 'REJECTED',
              approvedBy: 'User (Terkonfirmasi)',
              approvedAt: new Date().toISOString(),
            }
          : item
      )
    );

    try {
      const res = await fetch(`/api/journal/audit/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mengaudit jurnal');

      setMessage(
        action === 'APPROVE'
          ? `Jurnal berhasil disetujui (POSTED)! Transaksi resmi dibukukan ke Buku Besar dan Neraca Saldo.`
          : `Jurnal berhasil ditolak (REJECTED). Transaksi dibatalkan dari pembukuan.`
      );
      setShowAuditModal(false);
      setSelectedAuditJournal(null);

      // Silent sync di background tanpa loading spinner & tanpa pindah scroll posisi
      await loadData(true);
      if (activeTab === 'buku-besar') {
        await loadLedger(selectedLedgerAccount);
      }
    } catch (err: any) {
      setError(err.message);
      // Revert data jika server error
      await loadData(true);
    } finally {
      setAuditLoading(false);
    }
  };

  // Submit Cashflow Cepat
  const handleCreateCashflow = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/cashflow', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
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

      setMessage(`Transaksi Arus Kas berhasil dicatat (Status: ${data.status} - Masuk Draf Jurnal Umum).`);
      setShowCashflowModal(false);
      setCfKeterangan('');
      setCfNominal(0);
      await loadData(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Toggle status sudah/belum dikoreksi langsung dari baris (Optimistic & Tanpa Reload)
  const handleToggleCorrectionStatus = async (journal: any, newStatus: boolean) => {
    setError('');

    // 1. Optimistic Update: langsung ubah status lokal tanpa memicu spinner
    setJournalList((prev) =>
      prev.map((item) => (item.id === journal.id ? { ...item, isEdited: newStatus } : item))
    );
    if (selectedAuditJournal && selectedAuditJournal.id === journal.id) {
      setSelectedAuditJournal((prev: any) => (prev ? { ...prev, isEdited: newStatus } : null));
    }

    try {
      const res = await fetch(`/api/journal/${journal.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          isEdited: newStatus,
          keterangan: journal.keterangan,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mengubah status koreksi');

      setMessage(
        newStatus
          ? `Jurnal #${journal.id.slice(0, 8)} berhasil ditandai SUDAH DIKOREKSI & DIAUDIT.`
          : `Jurnal #${journal.id.slice(0, 8)} dikembalikan ke status BELUM DIKOREKSI.`
      );

      // Silent sync di background agar sinkron dengan database tanpa scroll jump
      await loadData(true);
    } catch (err: any) {
      setError(err.message);
      // Rollback jika gagal
      await loadData(true);
    }
  };

  // Open Edit/Audit Modal untuk mengoreksi rincian jurnal
  const handleStartAuditCorrection = (j: any) => {
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
    setShowAuditModal(false);
    setShowManualModal(true);
  };

  // Submit Jurnal (Baru atau Koreksi Hasil Audit)
  const handleSaveManualJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingJournalId ? `/api/journal/${editingJournalId}` : '/api/journal';
      const method = editingJournalId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          'x-user-role': 'FINANCE',
        },
        body: JSON.stringify({
          keterangan: journalKeterangan,
          tanggal: journalDate,
          lines: journalLines.map((l) => ({ ...l, nominal: Number(l.nominal) })),
          ...(editingJournalId ? { isEdited: true } : {}), // Otomatis tandai SUDAH DIKOREKSI
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan jurnal');

      setMessage(
        editingJournalId
          ? 'Koreksi jurnal berhasil disimpan dan ditandai SUDAH DIKOREKSI!'
          : 'Jurnal manual berhasil dibuat (berstatus DRAFT jika role Finance atau POSTED jika Owner).'
      );
      setShowManualModal(false);
      setEditingJournalId(null);
      setJournalKeterangan('');
      // Silent sync agar posisi halaman tidak meloncat
      await loadData(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Hitung jumlah pending audit (DRAFT)
  const pendingDraftCount = useMemo(() => {
    return journalList.filter((j) => j.status === 'DRAFT').length;
  }, [journalList]);

  // Filtered Journals dengan Search Query
  const filteredJournals = useMemo(() => {
    let list = journalList;
    if (journalSearchQuery.trim()) {
      const q = journalSearchQuery.toLowerCase();
      list = list.filter(
        (j) =>
          j.keterangan?.toLowerCase().includes(q) ||
          j.sourceType?.toLowerCase().includes(q) ||
          j.id?.toLowerCase().includes(q) ||
          j.lines?.some((l: any) => l.accountCode?.includes(q) || l.account?.name?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [journalList, journalSearchQuery]);

  // PEMISAHAN TEGAS: JURNAL MASUK (POSTED) VS DRAF (DRAFT) VS DITOLAK (REJECTED)
  const postedJournals = useMemo(() => {
    return filteredJournals.filter((j) => j.status === 'POSTED');
  }, [filteredJournals]);

  const correctedCount = useMemo(() => {
    return postedJournals.filter((j) => j.isEdited).length;
  }, [postedJournals]);

  const uncorrectedCount = useMemo(() => {
    return postedJournals.filter((j) => !j.isEdited).length;
  }, [postedJournals]);

  const filteredPostedJournals = useMemo(() => {
    if (correctionFilter === 'CORRECTED') {
      return postedJournals.filter((j) => j.isEdited);
    }
    if (correctionFilter === 'UNCORRECTED') {
      return postedJournals.filter((j) => !j.isEdited);
    }
    return postedJournals;
  }, [postedJournals, correctionFilter]);

  const draftJournals = useMemo(() => {
    return filteredJournals.filter((j) => j.status === 'DRAFT');
  }, [filteredJournals]);

  const rejectedJournals = useMemo(() => {
    return filteredJournals.filter((j) => j.status === 'REJECTED');
  }, [filteredJournals]);

  // List of accounts available
  const availableAccounts = useMemo(() => {
    if (tbData?.accounts && tbData.accounts.length > 0) {
      return tbData.accounts;
    }
    return [
      { code: '110', name: 'Kas Toko', type: 'ASET', normalBalance: 'DEBIT' },
      { code: '120', name: 'Bank BCA', type: 'ASET', normalBalance: 'DEBIT' },
      { code: '130', name: 'Persediaan Barang', type: 'ASET', normalBalance: 'DEBIT' },
      { code: '210', name: 'Hutang Usaha', type: 'KEWAJIBAN', normalBalance: 'KREDIT' },
      { code: '310', name: 'Modal Pemilik', type: 'EKUITAS', normalBalance: 'KREDIT' },
      { code: '410', name: 'Penjualan POS', type: 'PENDAPATAN', normalBalance: 'KREDIT' },
      { code: '440', name: 'HPP Penjualan', type: 'BEBAN', normalBalance: 'DEBIT' },
      { code: '510', name: 'Beban Gaji', type: 'BEBAN', normalBalance: 'DEBIT' },
      { code: '520', name: 'Beban Listrik & Air', type: 'BEBAN', normalBalance: 'DEBIT' },
      { code: '530', name: 'Beban Selisih Kas', type: 'BEBAN', normalBalance: 'DEBIT' },
    ];
  }, [tbData]);

  return (
    <div className="flex h-screen bg-black text-white font-sans antialiased overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* ========================================================================= */}
        {/* HEADER UTAMA: JUDUL + PERIODE WAKTU + TOMBOL AKSI CEPAT                   */}
        {/* ========================================================================= */}
        <header className="p-4 sm:p-6 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur sticky top-0 z-20 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Sistem Akuntansi & Keuangan (ERP)
                </h1>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Pemisahan terstruktur: Jurnal Umum, Buku Besar (Ledger), Neraca Saldo, dan Arus Kas dengan alur verifikasi audit.
              </p>
            </div>

            {/* Tombol Aksi Cepat */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  setEditingJournalId(null);
                  setJournalKeterangan('');
                  setShowManualModal(true);
                }}
                size="sm"
                className="bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs border border-neutral-700 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5 text-neutral-300" />
                + Jurnal Penyesuaian
              </Button>

              <Button
                onClick={() => setShowCashflowModal(true)}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs cursor-pointer shadow-sm"
              >
                <ArrowLeftRight className="w-4 h-4 mr-1.5 text-black" />
                + Input Mutasi Kas
              </Button>

              <Button
                type="button"
                onClick={() => loadData(false)}
                disabled={loading}
                variant="outline"
                size="sm"
                className="border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white text-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Muat Ulang
              </Button>
            </div>
          </div>

          {/* DATE & PERIOD TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800/80">
            {/* Month & Year Navigator */}
            <div className="flex items-center gap-2 bg-neutral-900/80 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2 font-mono text-xs font-bold text-white">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </span>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setSelectedMonth(9);
                  setSelectedYear(2026);
                  setUseCustomRange(false);
                }}
                className="text-[10px] font-mono text-neutral-400 hover:text-white px-2 py-0.5 rounded bg-neutral-800/70 border border-neutral-700 ml-1 cursor-pointer"
              >
                Bulan Ini
              </button>
            </div>

            {/* Custom Date Range Picker */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-neutral-500">Rentang:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setUseCustomRange(true);
                  setStartDate(e.target.value);
                }}
                className="bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-neutral-600"
              />
              <span className="text-neutral-500">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setUseCustomRange(true);
                  setEndDate(e.target.value);
                }}
                className="bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-neutral-600"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB NAVIGASI UTAMA (PEMISAHAN JURNAL UMUM, BUKU BESAR, NERACA, ARUS KAS)  */}
          {/* ========================================================================= */}
          <nav className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] pt-1">
            {/* 1. TAB JURNAL UMUM */}
            <button
              onClick={() => switchTab('jurnal')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'jurnal'
                  ? 'bg-white text-black shadow-md shadow-white/5 font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800/80'
              }`}
            >
              <FileText className={`w-4 h-4 ${activeTab === 'jurnal' ? 'text-black' : 'text-neutral-400'}`} />
              <span>Jurnal Umum</span>
              {pendingDraftCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-black">
                  {pendingDraftCount} DRAFT
                </span>
              )}
            </button>

            {/* 2. TAB BUKU BESAR (LEDGER) */}
            <button
              onClick={() => switchTab('buku-besar')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'buku-besar'
                  ? 'bg-white text-black shadow-md shadow-white/5 font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800/80'
              }`}
            >
              <BookOpen className={`w-4 h-4 ${activeTab === 'buku-besar' ? 'text-black' : 'text-neutral-400'}`} />
              <span>Buku Besar (General Ledger)</span>
            </button>

            {/* 3. TAB NERACA & LAPORAN KEUANGAN */}
            <button
              onClick={() => switchTab('neraca')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'neraca'
                  ? 'bg-white text-black shadow-md shadow-white/5 font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800/80'
              }`}
            >
              <Scale className={`w-4 h-4 ${activeTab === 'neraca' ? 'text-black' : 'text-neutral-400'}`} />
              <span>Neraca & Laporan Keuangan</span>
              {tbData && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                    (tbData.summary?.isBalanced ?? tbData.isBalanced)
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {(tbData.summary?.isBalanced ?? tbData.isBalanced) ? 'BALANCE' : 'UNBALANCED'}
                </span>
              )}
            </button>

            {/* 4. TAB ARUS KAS (CASHFLOW) */}
            <button
              onClick={() => switchTab('cashflow')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'cashflow'
                  ? 'bg-white text-black shadow-md shadow-white/5 font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800/80'
              }`}
            >
              <ArrowLeftRight className={`w-4 h-4 ${activeTab === 'cashflow' ? 'text-black' : 'text-neutral-400'}`} />
              <span>Arus Kas (Cashflow)</span>
            </button>
          </nav>
        </header>

        {/* FLOATING TOAST NOTIFICATION (TIDAK MENGGESER POSISI LAYOUT ATAU SCROLL) */}
        {(message || error) && (
          <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
            {message && (
              <div className="p-3 bg-neutral-900/95 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs flex items-center justify-between shadow-2xl backdrop-blur-md gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="font-medium">{message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMessage('')}
                  className="p-1 hover:text-white cursor-pointer text-neutral-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {error && (
              <div className="p-3 bg-neutral-900/95 border border-red-500/50 text-red-300 rounded-xl text-xs flex items-center justify-between shadow-2xl backdrop-blur-md gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span className="font-medium">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="p-1 hover:text-white cursor-pointer text-neutral-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* KONTEN UTAMA BERDASARKAN TAB AKTIF                                        */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* ========================================================================= */}
          {/* TAB 1: JURNAL UMUM (GENERAL JOURNAL)                                      */}
          {/* ========================================================================= */}
          {activeTab === 'jurnal' && (
            <div className="space-y-4">
              {/* BANNER EDUKASI AUDIT AKUNTANSI */}
              <div className="p-4 bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Pemisahan Standar Akuntansi: Jurnal Umum Sah vs Draf Audit</span>
                  </div>
                  <p className="text-neutral-400 max-w-2xl leading-relaxed">
                    Transaksi berstatus <span className="text-amber-300 font-bold bg-amber-950/60 px-1 py-0.5 rounded border border-amber-800/60">DRAFT</span> berada di antrean terpisah dan <strong>belum masuk ke Buku Besar & Neraca Saldo</strong> sampai diverifikasi melalui tombol <strong>Audit</strong>. Transaksi berstatus <span className="text-emerald-300 font-bold bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-800/60">POSTED</span> resmi masuk ke Jurnal Umum dan mengalir ke laporan keuangan.
                  </p>
                </div>

                {pendingDraftCount > 0 && (
                  <button
                    onClick={() => setJournalViewTab('draft')}
                    className="p-2.5 px-3 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-800/80 rounded-xl text-amber-300 flex items-center gap-2.5 shrink-0 font-mono transition cursor-pointer text-left"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">{pendingDraftCount} Draf Perlu Audit</p>
                      <p className="text-[10px] text-amber-400/80">Klik untuk buka antrean draf &rarr;</p>
                    </div>
                  </button>
                )}
              </div>

              {/* SUB-TABS PEMISAHAN TEGAS: JURNAL UMUM SAH (POSTED) VS DRAF MENUNGGU AUDIT (DRAFT) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl">
                {/* Switcher Tab */}
                <div className="flex items-center gap-1.5 p-1 bg-neutral-900 rounded-xl border border-neutral-800 overflow-x-auto [scrollbar-width:none]">
                  {/* 1. Tab Jurnal Umum Masuk (POSTED) */}
                  <button
                    onClick={() => setJournalViewTab('posted')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      journalViewTab === 'posted'
                        ? 'bg-white text-black font-bold shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${journalViewTab === 'posted' ? 'text-emerald-600' : 'text-emerald-400'}`} />
                    <span>Jurnal Umum Sah (POSTED)</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      journalViewTab === 'posted' ? 'bg-neutral-200 text-black font-bold' : 'bg-neutral-800 text-neutral-300'
                    }`}>
                      {postedJournals.length}
                    </span>
                  </button>

                  {/* 2. Tab Antrean Draf Menunggu Audit (DRAFT) */}
                  <button
                    onClick={() => setJournalViewTab('draft')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      journalViewTab === 'draft'
                        ? 'bg-amber-400 text-black font-bold shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <AlertCircle className={`w-3.5 h-3.5 ${journalViewTab === 'draft' ? 'text-black' : 'text-amber-400'}`} />
                    <span>Draf Menunggu Audit</span>
                    {pendingDraftCount > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        journalViewTab === 'draft'
                          ? 'bg-black text-amber-300'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-600/50'
                      }`}>
                        {pendingDraftCount} DRAFT
                      </span>
                    )}
                  </button>

                  {/* 3. Tab Ditolak (REJECTED) */}
                  {rejectedJournals.length > 0 && (
                    <button
                      onClick={() => setJournalViewTab('rejected')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                        journalViewTab === 'rejected'
                          ? 'bg-red-500 text-white font-bold shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Ditolak ({rejectedJournals.length})</span>
                    </button>
                  )}
                </div>

                {/* Filter Sumber & Pencarian */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
                    <Input
                      placeholder="Cari transaksi / akun..."
                      value={journalSearchQuery}
                      onChange={(e) => setJournalSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs bg-neutral-900 border-neutral-800 text-white w-full"
                    />
                  </div>

                  <select
                    value={journalSourceFilter}
                    onChange={(e) => setJournalSourceFilter(e.target.value)}
                    className="h-8 px-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white shrink-0"
                  >
                    <option value="">Semua Sumber</option>
                    <option value="POS">POS (Kasir)</option>
                    <option value="CASHFLOW">CASHFLOW</option>
                    <option value="PURCHASE_UNIT">PURCHASE_UNIT</option>
                    <option value="RESTOCK">RESTOCK</option>
                    <option value="MANUAL">MANUAL</option>
                    <option value="SERVICE">SERVICE</option>
                  </select>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* VIEW 1: JURNAL UMUM SAH (POSTED) - HANYA MEMUAT TRANSAKSI SAH            */}
              {/* ========================================================================= */}
              {journalViewTab === 'posted' && (
                <div className="space-y-3">
                  {/* Notifikasi jika ada Draf yang tertunda */}
                  {pendingDraftCount > 0 && (
                    <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-xl text-amber-300 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          Perhatian: Terdapat <strong>{pendingDraftCount} draf transaksi baru</strong> yang menunggu audit sebelum dapat masuk ke Jurnal Umum.
                        </span>
                      </div>
                      <Button
                        onClick={() => setJournalViewTab('draft')}
                        size="sm"
                        className="bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs h-7 px-3 cursor-pointer shrink-0"
                      >
                        Buka Antrean Draf &rarr;
                      </Button>
                    </div>
                  )}

                  {/* Toolbar Filter Koreksi & Ringkasan */}
                  <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-neutral-400 font-sans font-semibold">Status Audit & Koreksi:</span>
                      <div className="flex items-center gap-1 bg-black p-0.5 rounded-lg border border-neutral-800">
                        <button
                          onClick={() => setCorrectionFilter('ALL')}
                          className={`px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer ${
                            correctionFilter === 'ALL'
                              ? 'bg-neutral-800 text-white font-bold'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Semua ({postedJournals.length})
                        </button>
                        <button
                          onClick={() => setCorrectionFilter('UNCORRECTED')}
                          className={`px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer flex items-center gap-1.5 ${
                            correctionFilter === 'UNCORRECTED'
                              ? 'bg-amber-400 text-black font-bold shadow-sm'
                              : 'text-amber-400 hover:text-amber-300'
                          }`}
                        >
                          <span>Belum Dikoreksi</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                            correctionFilter === 'UNCORRECTED' ? 'bg-black text-amber-300' : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {uncorrectedCount}
                          </span>
                        </button>
                        <button
                          onClick={() => setCorrectionFilter('CORRECTED')}
                          className={`px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer flex items-center gap-1.5 ${
                            correctionFilter === 'CORRECTED'
                              ? 'bg-emerald-500 text-black font-bold shadow-sm'
                              : 'text-emerald-400 hover:text-emerald-300'
                          }`}
                        >
                          <span>Sudah Dikoreksi</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                            correctionFilter === 'CORRECTED' ? 'bg-black text-emerald-300' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {correctedCount}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="text-neutral-400 text-[11px]">
                      Menampilkan <strong className="text-white">{filteredPostedJournals.length}</strong> transaksi jurnal sah
                    </div>
                  </div>

                  {/* Header Tabel Jurnal Sah */}
                  <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <div>
                          <span className="text-xs font-bold text-white">Buku Jurnal Umum Resmi (POSTED)</span>
                          <p className="text-[10px] text-neutral-400">
                            Seluruh ayat jurnal di bawah ini sah dan telah dibukukan ke Buku Besar serta Neraca Saldo.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                        {postedJournals.length} Entri Sah
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-neutral-800 bg-neutral-900/80 text-neutral-400 text-[11px]">
                            <th className="p-3 whitespace-nowrap">Tanggal & Jam</th>
                            <th className="p-3 whitespace-nowrap">No. Ref & Sumber</th>
                            <th className="p-3">Keterangan Transaksi</th>
                            <th className="p-3">Rincian Ayat Jurnal (Debit & Kredit)</th>
                            <th className="p-3 text-right whitespace-nowrap">Total Nilai</th>
                            <th className="p-3 text-center whitespace-nowrap">Status Koreksi / Audit</th>
                            <th className="p-3 text-center whitespace-nowrap">Aksi Audit</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-neutral-800/60">
                          {loading ? (
                            <tr>
                              <td colSpan={7} className="p-12 text-center text-neutral-500 font-mono">
                                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-400" />
                                Memuat jurnal umum sah...
                              </td>
                            </tr>
                          ) : filteredPostedJournals.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-12 text-center text-neutral-500 font-mono">
                                Tidak ada transaksi yang sesuai dengan filter koreksi pada periode {startDate} s/d {endDate}.
                              </td>
                            </tr>
                          ) : (
                            filteredPostedJournals.map((j) => (
                              <tr key={j.id} className="hover:bg-neutral-900/40 transition">
                                {/* 1. Tanggal */}
                                <td className="p-3 whitespace-nowrap text-neutral-300">
                                  <div>
                                    {j.tanggal
                                      ? new Date(j.tanggal).toLocaleDateString('id-ID', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                        })
                                      : '-'}
                                  </div>
                                  <div className="text-[10px] text-neutral-500">
                                    {j.tanggal
                                      ? new Date(j.tanggal).toLocaleTimeString('id-ID', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : ''}
                                  </div>
                                </td>

                                {/* 2. Ref & Sumber */}
                                <td className="p-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 border border-neutral-700 text-neutral-300">
                                    {j.sourceType}
                                  </span>
                                  <div className="text-[10px] text-neutral-500 truncate max-w-[90px] mt-0.5">
                                    #{j.id.slice(0, 8)}
                                  </div>
                                </td>

                                {/* 3. Keterangan */}
                                <td className="p-3 font-sans font-medium text-white max-w-[240px]">
                                  <div>{j.keterangan}</div>
                                </td>

                                {/* 4. Rincian Ayat Jurnal (Debit & Kredit) */}
                                <td className="p-3">
                                  <div className="space-y-1 text-[11px]">
                                    {j.lines?.map((line: any, idx: number) => {
                                      const isDebit = line.side === 'DEBIT';
                                      return (
                                        <div
                                          key={idx}
                                          className={`flex items-center justify-between gap-3 ${
                                            isDebit ? 'text-emerald-400 pl-0' : 'text-blue-400 pl-3'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                                            <span className="font-bold">[{line.accountCode}]</span>
                                            <span className="truncate">{line.account?.name || ''}</span>
                                            <span className="text-[9px] text-neutral-500">({line.side})</span>
                                          </div>
                                          <div className="font-bold text-white shrink-0">
                                            {formatRupiah(line.nominal)}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>

                                {/* 5. Total */}
                                <td className="p-3 text-right font-bold text-white whitespace-nowrap">
                                  {formatRupiah(j.total)}
                                </td>

                                {/* 6. Status Koreksi / Audit (PENANDA SUDAH/BELUM DIKOREKSI) */}
                                <td className="p-3 text-center whitespace-nowrap">
                                  {j.isEdited ? (
                                    <div className="inline-flex flex-col items-center">
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 inline-flex items-center gap-1 shadow-sm">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        SUDAH DIKOREKSI
                                      </span>
                                      <span className="text-[9px] text-neutral-400 mt-0.5">
                                        {j.approvedBy ? `Diaudit: ${j.approvedBy.slice(0, 8)}` : 'Telah diverifikasi'}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="inline-flex flex-col items-center">
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-600/40 inline-flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3 text-amber-400" />
                                        BELUM DIKOREKSI
                                      </span>
                                      <span className="text-[9px] text-neutral-500 mt-0.5">
                                        Transaksi Asli
                                      </span>
                                    </div>
                                  )}
                                </td>

                                {/* 7. Tindakan Audit & Koreksi */}
                                <td className="p-3 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {/* Tombol Audit - Periksa & Verifikasi Status Koreksi */}
                                    <Button
                                      type="button"
                                      onClick={() => {
                                        setSelectedAuditJournal(j);
                                        setShowAuditModal(true);
                                      }}
                                      size="sm"
                                      className="h-7 px-2.5 text-[11px] font-bold bg-neutral-850 hover:bg-neutral-800 text-white border border-neutral-700 cursor-pointer shadow-sm flex items-center gap-1"
                                      title="Buka panel audit untuk memeriksa rincian & menandai status koreksi"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Audit</span>
                                    </Button>

                                    {/* Tombol Koreksi Rincian Jurnal */}
                                    <Button
                                      type="button"
                                      onClick={() => handleStartAuditCorrection(j)}
                                      size="sm"
                                      className="h-7 px-2.5 text-[11px] font-bold bg-amber-400 hover:bg-amber-300 text-black cursor-pointer shadow-sm flex items-center gap-1"
                                      title="Koreksi rincian akun atau nominal jurnal ini"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                      <span>Koreksi</span>
                                    </Button>

                                    {/* Tombol Cepat Tandai Sudah Dikoreksi / Reset */}
                                    {j.isEdited ? (
                                      <Button
                                        type="button"
                                        onClick={() => handleToggleCorrectionStatus(j, false)}
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-[10px] border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                                        title="Kembalikan penanda ke 'Belum Dikoreksi'"
                                      >
                                        <RotateCcw className="w-3 h-3 mr-1" />
                                        Reset
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        onClick={() => handleToggleCorrectionStatus(j, true)}
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-[10px] border-emerald-800/80 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 cursor-pointer font-bold"
                                        title="Tandai langsung bahwa entri ini sudah diperiksa / sesuai"
                                      >
                                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                                        Tandai Selesai
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* VIEW 2: ANTREAN DRAF MENUNGGU AUDIT (DRAFT) - KHUSUS UNTUK AUDITOR        */}
              {/* ========================================================================= */}
              {journalViewTab === 'draft' && (
                <div className="space-y-3">
                  <div className="border border-amber-800/60 bg-neutral-950 rounded-xl overflow-hidden shadow-sm">
                    {/* Header Khusus Antrean Draf */}
                    <div className="p-3.5 border-b border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-950/20">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="text-xs font-bold text-white">Antrean Draf Jurnal Menunggu Audit (Unposted Drafts)</span>
                          <p className="text-[10px] text-amber-400/90">
                            Draf transaksi di bawah ini <strong>BELUM</strong> masuk ke Jurnal Umum resmi dan <strong>BELUM</strong> mempengaruhi saldo Buku Besar maupun Neraca.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-amber-300 font-bold bg-amber-950 px-2.5 py-0.5 rounded border border-amber-700/80 shrink-0">
                        {draftJournals.length} Draf Menunggu Persetujuan
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-neutral-800 bg-neutral-900/80 text-neutral-400 text-[11px]">
                            <th className="p-3 whitespace-nowrap">Tanggal Input</th>
                            <th className="p-3 whitespace-nowrap">No. Ref & Sumber</th>
                            <th className="p-3">Keterangan Draf Transaksi</th>
                            <th className="p-3">Usulan Ayat Jurnal (Debit & Kredit)</th>
                            <th className="p-3 text-right whitespace-nowrap">Total Nilai</th>
                            <th className="p-3 text-center whitespace-nowrap">Status</th>
                            <th className="p-3 text-center whitespace-nowrap">Tindakan Audit</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-neutral-800/60">
                          {loading ? (
                            <tr>
                              <td colSpan={7} className="p-12 text-center text-neutral-500 font-mono">
                                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-400" />
                                Memuat antrean draf jurnal...
                              </td>
                            </tr>
                          ) : draftJournals.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-12 text-center font-mono">
                                <div className="max-w-md mx-auto space-y-2">
                                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                                  <p className="text-sm font-bold text-white">Semua Transaksi Telah Diaudit!</p>
                                  <p className="text-xs text-neutral-400">
                                    Tidak ada antrean draf yang tertunda saat ini. Seluruh transaksi telah sah masuk ke Jurnal Umum resmi.
                                  </p>
                                  <Button
                                    onClick={() => setJournalViewTab('posted')}
                                    size="sm"
                                    variant="outline"
                                    className="border-neutral-700 text-xs mt-2"
                                  >
                                    Lihat Jurnal Umum Sah &rarr;
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            draftJournals.map((j) => (
                              <tr key={j.id} className="bg-amber-950/15 hover:bg-amber-900/25 transition">
                                {/* 1. Tanggal */}
                                <td className="p-3 whitespace-nowrap text-neutral-300">
                                  <div>
                                    {j.tanggal
                                      ? new Date(j.tanggal).toLocaleDateString('id-ID', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                        })
                                      : '-'}
                                  </div>
                                  <div className="text-[10px] text-neutral-500">
                                    {j.tanggal
                                      ? new Date(j.tanggal).toLocaleTimeString('id-ID', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : ''}
                                  </div>
                                </td>

                                {/* 2. Ref & Sumber */}
                                <td className="p-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 border border-neutral-700 text-amber-300">
                                    {j.sourceType}
                                  </span>
                                  <div className="text-[10px] text-neutral-500 truncate max-w-[90px] mt-0.5">
                                    #{j.id.slice(0, 8)}
                                  </div>
                                </td>

                                {/* 3. Keterangan */}
                                <td className="p-3 font-sans font-medium text-white max-w-[240px]">
                                  <div>{j.keterangan}</div>
                                  <span className="text-[10px] text-amber-400 font-mono">
                                    (Menunggu Audit)
                                  </span>
                                </td>

                                {/* 4. Rincian Ayat Jurnal */}
                                <td className="p-3">
                                  <div className="space-y-1 text-[11px]">
                                    {j.lines?.map((line: any, idx: number) => {
                                      const isDebit = line.side === 'DEBIT';
                                      return (
                                        <div
                                          key={idx}
                                          className={`flex items-center justify-between gap-3 ${
                                            isDebit ? 'text-emerald-400 pl-0' : 'text-blue-400 pl-3'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                                            <span className="font-bold">[{line.accountCode}]</span>
                                            <span className="truncate">{line.account?.name || ''}</span>
                                            <span className="text-[9px] text-neutral-500">({line.side})</span>
                                          </div>
                                          <div className="font-bold text-white shrink-0">
                                            {formatRupiah(line.nominal)}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>

                                {/* 5. Total */}
                                <td className="p-3 text-right font-bold text-white whitespace-nowrap">
                                  {formatRupiah(j.total)}
                                </td>

                                {/* 6. Status Badge */}
                                <td className="p-3 text-center whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-600/50 inline-flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-amber-400" />
                                    DRAFT
                                  </span>
                                </td>

                                {/* 7. Tindakan Audit */}
                                <td className="p-3 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Button
                                      type="button"
                                      onClick={() => {
                                        setSelectedAuditJournal(j);
                                        setShowAuditModal(true);
                                      }}
                                      size="sm"
                                      className="h-7 px-2.5 text-[11px] font-bold bg-amber-400 hover:bg-amber-300 text-black cursor-pointer shadow-sm flex items-center gap-1"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      <span>Audit</span>
                                    </Button>

                                    <Button
                                      type="button"
                                      onClick={() => handleAuditJournal(j.id, 'APPROVE')}
                                      size="sm"
                                      className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-black font-bold cursor-pointer"
                                      title="Langsung Setujui & Posting ke Jurnal Umum"
                                    >
                                      Setujui
                                    </Button>

                                    <Button
                                      type="button"
                                      onClick={() => handleAuditJournal(j.id, 'REJECT')}
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[10px] border-red-800 text-red-400 hover:bg-red-950 cursor-pointer"
                                      title="Tolak Transaksi"
                                    >
                                      Tolak
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* VIEW 3: DRAF DITOLAK (REJECTED)                                           */}
              {/* ========================================================================= */}
              {journalViewTab === 'rejected' && (
                <div className="space-y-3">
                  <div className="border border-red-900/60 bg-neutral-950 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-3.5 border-b border-red-900/60 flex items-center justify-between bg-red-950/20">
                      <div className="flex items-center gap-2">
                        <X className="w-4 h-4 text-red-400" />
                        <div>
                          <span className="text-xs font-bold text-white">Riwayat Transaksi Ditolak (REJECTED)</span>
                          <p className="text-[10px] text-red-400/90">
                            Transaksi di bawah ini ditolak saat verifikasi audit dan tidak dibukukan ke pembukuan.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-red-300 font-bold bg-red-950 px-2 py-0.5 rounded border border-red-800">
                        {rejectedJournals.length} Ditolak
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-neutral-800 bg-neutral-900/80 text-neutral-400 text-[11px]">
                            <th className="p-3">Tanggal Input</th>
                            <th className="p-3">No. Ref & Sumber</th>
                            <th className="p-3">Keterangan</th>
                            <th className="p-3">Ayat Jurnal</th>
                            <th className="p-3 text-right">Total</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-neutral-800/60">
                          {rejectedJournals.map((j) => (
                            <tr key={j.id} className="opacity-70">
                              <td className="p-3 text-neutral-400">
                                {j.tanggal ? new Date(j.tanggal).toLocaleDateString('id-ID') : '-'}
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-900 border border-neutral-700 text-neutral-400">
                                  {j.sourceType}
                                </span>
                              </td>
                              <td className="p-3 text-neutral-300 font-sans">{j.keterangan}</td>
                              <td className="p-3 text-[11px]">
                                {j.lines?.map((l: any, i: number) => (
                                  <span key={i} className="mr-2">
                                    [{l.accountCode}] {formatRupiah(l.nominal)}
                                  </span>
                                ))}
                              </td>
                              <td className="p-3 text-right text-white font-bold">{formatRupiah(j.total)}</td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-600/40">
                                  REJECTED
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: BUKU BESAR (GENERAL LEDGER)                                        */}
          {/* ========================================================================= */}
          {activeTab === 'buku-besar' && (
            <div className="space-y-4">
              {/* PENJELASAN PRINSIP BUKU BESAR */}
              <div className="p-4 bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <span>Buku Besar Akuntansi (General Ledger)</span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed max-w-3xl">
                    Buku Besar merinci seluruh pergerakan debit, kredit, dan saldo berjalan (running balance) per kode akun.
                    Sesuai kaidah akuntansi baku, Buku Besar <strong>hanya memproses transaksi yang sudah disetujui (POSTED)</strong>.
                    Seluruh draf transaksi tidak diperhitungkan guna menjamin kebenaran saldo buku.
                  </p>
                </div>
              </div>

              {/* SELECTOR AKUN BUKU BESAR */}
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <Label className="text-xs text-neutral-400 font-semibold">Pilih Akun Buku Besar:</Label>
                  <span className="text-[11px] font-mono text-neutral-500">
                    Periode: {startDate} s/d {endDate}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] pb-1">
                  {availableAccounts.map((acc: any) => {
                    const isSelected = selectedLedgerAccount === acc.code;
                    return (
                      <button
                        key={acc.code}
                        onClick={() => setSelectedLedgerAccount(acc.code)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-white text-black font-bold shadow-sm'
                            : 'bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                        }`}
                      >
                        <span className="font-bold">[{acc.code}]</span>
                        <span>{acc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* KARTU METRIK AKUN BUKU BESAR TERPILIH */}
              {ledgerData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 1. Saldo Awal */}
                  <Card className="border-neutral-800 bg-neutral-950">
                    <CardHeader className="p-3.5 pb-1">
                      <CardDescription className="text-xs text-neutral-400">Saldo Awal (Carry-Forward)</CardDescription>
                      <CardTitle className="text-base sm:text-lg font-bold text-neutral-200 font-mono">
                        {formatRupiah(ledgerData.startingBalance)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3.5 pt-1 text-[10px] text-neutral-500">
                      Saldo sebelum {startDate}
                    </CardContent>
                  </Card>

                  {/* 2. Total Debit */}
                  <Card className="border-neutral-800 bg-neutral-950">
                    <CardHeader className="p-3.5 pb-1">
                      <CardDescription className="text-xs text-emerald-400 flex items-center justify-between">
                        <span>Total Debit Periode Ini</span>
                        <TrendingUp className="w-3.5 h-3.5" />
                      </CardDescription>
                      <CardTitle className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
                        +{formatRupiah(ledgerData.totalDebit)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3.5 pt-1 text-[10px] text-neutral-500 font-mono">
                      Posisi Debit Akun {ledgerData.account?.code}
                    </CardContent>
                  </Card>

                  {/* 3. Total Kredit */}
                  <Card className="border-neutral-800 bg-neutral-950">
                    <CardHeader className="p-3.5 pb-1">
                      <CardDescription className="text-xs text-blue-400 flex items-center justify-between">
                        <span>Total Kredit Periode Ini</span>
                        <TrendingDown className="w-3.5 h-3.5" />
                      </CardDescription>
                      <CardTitle className="text-base sm:text-lg font-bold text-blue-400 font-mono">
                        -{formatRupiah(ledgerData.totalKredit)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3.5 pt-1 text-[10px] text-neutral-500 font-mono">
                      Posisi Kredit Akun {ledgerData.account?.code}
                    </CardContent>
                  </Card>

                  {/* 4. Saldo Akhir */}
                  <Card className="border-neutral-800 bg-neutral-950">
                    <CardHeader className="p-3.5 pb-1">
                      <CardDescription className="text-xs text-white flex items-center justify-between">
                        <span>Saldo Akhir Berjalan</span>
                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      </CardDescription>
                      <CardTitle className="text-base sm:text-lg font-bold text-white font-mono">
                        {formatRupiah(ledgerData.endingBalance)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3.5 pt-1 text-[10px] text-neutral-400 font-mono">
                      Saldo Normal: <strong>{ledgerData.account?.normalBalance}</strong>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TABEL MUTASI BUKU BESAR */}
              <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden shadow-sm">
                <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white font-mono">
                      Mutasi Akun [{ledgerData?.account?.code || selectedLedgerAccount}] -{' '}
                      {ledgerData?.account?.name || 'Memuat...'}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-neutral-400">
                    {ledgerData?.transactions?.length || 0} Transaksi Terposting
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-neutral-800 bg-neutral-900/80 text-neutral-400 text-[11px]">
                        <th className="p-3 whitespace-nowrap">Tanggal & Jam</th>
                        <th className="p-3 whitespace-nowrap">No. Ref & Sumber</th>
                        <th className="p-3">Keterangan Transaksi</th>
                        <th className="p-3 text-right whitespace-nowrap text-emerald-400">Debit (+)</th>
                        <th className="p-3 text-right whitespace-nowrap text-blue-400">Kredit (-)</th>
                        <th className="p-3 text-right whitespace-nowrap text-white">Saldo Berjalan</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-neutral-800/60">
                      {ledgerLoading ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-neutral-500">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-400" />
                            Memuat data buku besar akun...
                          </td>
                        </tr>
                      ) : !ledgerData || ledgerData.transactions?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-neutral-500">
                            Tidak ada transaksi terposting untuk akun ini pada periode {startDate} s/d {endDate}.
                            <br />
                            <span className="text-[11px] text-neutral-600 mt-1 inline-block">
                              (Saldo Awal akun: {formatRupiah(ledgerData?.startingBalance || 0)})
                            </span>
                          </td>
                        </tr>
                      ) : (
                        ledgerData.transactions.map((tx: any, idx: number) => (
                          <tr key={idx} className="hover:bg-neutral-900/40 transition">
                            <td className="p-3 whitespace-nowrap text-neutral-300">
                              {tx.tanggal
                                ? new Date(tx.tanggal).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-900 border border-neutral-700 text-neutral-300">
                                {tx.sourceType}
                              </span>
                              <span className="text-[10px] text-neutral-500 ml-1">
                                #{tx.entryId?.slice(0, 6)}
                              </span>
                            </td>

                            <td className="p-3 font-sans text-white max-w-[280px]">
                              {tx.keterangan}
                            </td>

                            <td className="p-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                              {tx.debit > 0 ? formatRupiah(tx.debit) : '-'}
                            </td>

                            <td className="p-3 text-right font-bold text-blue-400 whitespace-nowrap">
                              {tx.kredit > 0 ? formatRupiah(tx.kredit) : '-'}
                            </td>

                            <td className="p-3 text-right font-bold text-white whitespace-nowrap">
                              {formatRupiah(tx.runningBalance)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: NERACA & LAPORAN KEUANGAN (BALANCE SHEET, TRIAL BALANCE, LABA RUGI) */}
          {/* ========================================================================= */}
          {activeTab === 'neraca' && (
            <div className="space-y-6">
              {/* STATUS RINGKASAN NERACA SALDO DOUBLE-ENTRY */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Keseimbangan Double-Entry */}
                <Card className="border-neutral-800 bg-neutral-950">
                  <CardHeader className="p-3.5 pb-1">
                    <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                      <span>Status Neraca Saldo</span>
                      <Scale className="w-4 h-4 text-emerald-400" />
                    </CardDescription>
                    <CardTitle className="text-base sm:text-lg font-bold pt-1">
                      {(tbData?.summary?.isBalanced ?? tbData?.isBalanced) ? (
                        <span className="text-emerald-400 font-mono flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 inline" /> 100% BALANCE
                        </span>
                      ) : (
                        <span className="text-red-400 font-mono flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 inline" /> UNBALANCED
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-1 text-[11px] font-mono text-neutral-400 flex justify-between">
                    <span>Total Debit: {formatRupiah(tbData?.summary?.totalDebit ?? tbData?.totalDebit ?? 0)}</span>
                    <span>|</span>
                    <span>Total Kredit: {formatRupiah(tbData?.summary?.totalKredit ?? tbData?.totalKredit ?? 0)}</span>
                  </CardContent>
                </Card>

                {/* 2. Total Aktiva (Aset) */}
                <Card className="border-neutral-800 bg-neutral-950">
                  <CardHeader className="p-3.5 pb-1">
                    <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                      <span>Total Aktiva (Aset Toko)</span>
                      <Building2 className="w-4 h-4 text-blue-400" />
                    </CardDescription>
                    <CardTitle className="text-base sm:text-lg font-bold text-white font-mono pt-1">
                      {formatRupiah(totalAktiva)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-1 text-[11px] font-mono text-neutral-400">
                    Kas & Bank: {formatRupiah(totalLikuiditasUang)} • Stok: {formatRupiah(totalPersediaanEnding)}
                  </CardContent>
                </Card>

                {/* 3. Laba Bersih Berjalan */}
                <Card className="border-neutral-800 bg-neutral-950">
                  <CardHeader className="p-3.5 pb-1">
                    <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                      <span>Laba Bersih Berjalan</span>
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </CardDescription>
                    <CardTitle
                      className={`text-base sm:text-lg font-bold font-mono pt-1 ${
                        netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {formatRupiah(netProfit)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-1 text-[11px] font-mono text-neutral-400">
                    Omzet: {formatRupiah(plData?.totalRevenue || 0)}
                  </CardContent>
                </Card>
              </div>

              {/* SUB-TABS LAPORAN KEUANGAN */}
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
                <button
                  onClick={() => setReportSubTab('neraca-posisi')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    reportSubTab === 'neraca-posisi'
                      ? 'bg-neutral-800 text-white font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  1. Posisi Keuangan (Aktiva vs Pasiva)
                </button>
                <button
                  onClick={() => setReportSubTab('trial-balance')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    reportSubTab === 'trial-balance'
                      ? 'bg-neutral-800 text-white font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  2. Neraca Saldo Lengkap (COA)
                </button>
                <button
                  onClick={() => setReportSubTab('laba-rugi')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    reportSubTab === 'laba-rugi'
                      ? 'bg-neutral-800 text-white font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  3. Laba Rugi Komprehensif
                </button>
              </div>

              {/* 1. LAPORAN POSISI KEUANGAN (NERACA AKTIVA VS PASIVA) */}
              {reportSubTab === 'neraca-posisi' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kolom Kiri: AKTIVA (ASET) */}
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2 font-bold text-white text-sm">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-emerald-400" />
                        1. AKTIVA (ASET)
                      </span>
                      <span className="text-emerald-400">{formatRupiah(totalAktiva)}</span>
                    </div>

                    <div className="space-y-2 text-neutral-300">
                      <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                        <span>• Kas Toko (110):</span>
                        <span className="text-white font-bold">{formatRupiah(kasTokoEnding)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                        <span>• Bank BCA (120):</span>
                        <span className="text-white font-bold">{formatRupiah(bankBcaEnding)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                        <span>• Persediaan Laptop (130):</span>
                        <span className="text-white font-bold">{formatRupiah(totalPersediaanEnding)}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between font-bold text-emerald-400 border-t border-neutral-800">
                      <span>TOTAL AKTIVA:</span>
                      <span>{formatRupiah(totalAktiva)}</span>
                    </div>
                  </div>

                  {/* Kolom Kanan: PASIVA (KEWAJIBAN & EKUITAS) */}
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2 font-bold text-white text-sm">
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-blue-400" />
                        2. PASIVA (KEWAJIBAN & EKUITAS)
                      </span>
                      <span className="text-blue-400">{formatRupiah(totalPasiva)}</span>
                    </div>

                    <div className="space-y-2 text-neutral-300">
                      <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                        <span>• Hutang Usaha (210):</span>
                        <span className="text-white font-bold">{formatRupiah(totalHutangEnding)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                        <span>• Modal Pemilik (310):</span>
                        <span className="text-white font-bold">{formatRupiah(totalModalEnding)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                        <span>• Laba Bersih Berjalan:</span>
                        <span className={`font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatRupiah(netProfit)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between font-bold text-blue-400 border-t border-neutral-800">
                      <span>TOTAL PASIVA:</span>
                      <span>{formatRupiah(totalPasiva)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. NERACA SALDO LENGKAP (TRIAL BALANCE COA) */}
              {reportSubTab === 'trial-balance' && (
                <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">Neraca Saldo Seluruh Bagan Akun (COA)</span>
                    </div>
                    <span className="text-xs font-mono text-neutral-400">
                      Total Akun: {tbData?.accounts?.length || 0}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-neutral-800 bg-neutral-900/80 text-neutral-400 text-[11px]">
                          <th className="p-3">Kode & Nama Akun</th>
                          <th className="p-3">Kategori</th>
                          <th className="p-3 text-right">Saldo Awal</th>
                          <th className="p-3 text-right text-emerald-400">Debit Mutasi</th>
                          <th className="p-3 text-right text-blue-400">Kredit Mutasi</th>
                          <th className="p-3 text-right text-white">Saldo Akhir</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-neutral-800/60">
                        {tbData?.accounts?.map((acc: any) => (
                          <tr key={acc.code} className="hover:bg-neutral-900/40 transition">
                            <td className="p-3 text-neutral-200">
                              <span className="font-bold text-white">[{acc.code}]</span> {acc.name}
                            </td>
                            <td className="p-3 text-neutral-400 text-[10px]">{acc.type}</td>
                            <td className="p-3 text-right text-neutral-400">{formatRupiah(acc.startingBalance)}</td>
                            <td className="p-3 text-right text-emerald-400">{formatRupiah(acc.debit)}</td>
                            <td className="p-3 text-right text-blue-400">{formatRupiah(acc.kredit)}</td>
                            <td className="p-3 text-right font-bold text-white">{formatRupiah(acc.endingBalance)}</td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot className="border-t-2 border-neutral-800 bg-neutral-900/90 font-bold">
                        <tr>
                          <td colSpan={3} className="p-3 text-white text-right">
                            TOTAL NERACA SALDO:
                          </td>
                          <td className="p-3 text-right text-emerald-400">
                            {formatRupiah(tbData?.summary?.totalDebit ?? tbData?.totalDebit ?? 0)}
                          </td>
                          <td className="p-3 text-right text-blue-400">
                            {formatRupiah(tbData?.summary?.totalKredit ?? tbData?.totalKredit ?? 0)}
                          </td>
                          <td className="p-3 text-right text-white">
                            {(tbData?.summary?.isBalanced ?? tbData?.isBalanced) ? 'SEIMBANG' : 'SELISIH'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. LABA RUGI KOMPREHENSIF */}
              {reportSubTab === 'laba-rugi' && (
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-4 font-mono text-xs max-w-3xl">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-neutral-800 pb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Laporan Laba Rugi (Profit & Loss Statement)
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-900">
                      <span className="font-bold text-white">A. Pendapatan Penjualan (Revenue):</span>
                      <span className="font-bold text-emerald-400">{formatRupiah(plData?.totalRevenue || 0)}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-900 pl-4 text-neutral-300">
                      <span>• Harga Pokok Penjualan (HPP 440):</span>
                      <span className="text-red-400">-{formatRupiah(plData?.cogs || 0)}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-800 font-bold text-white bg-neutral-900/40 px-2 rounded">
                      <span>B. Laba Kotor (Gross Profit):</span>
                      <span className="text-emerald-400">{formatRupiah(plData?.grossProfit || 0)}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-900 pl-4 text-neutral-300">
                      <span>• Total Beban Operasional:</span>
                      <span className="text-red-400">-{formatRupiah(plData?.totalOperatingExpenses || 0)}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-lg border border-neutral-800 bg-neutral-900 font-bold text-sm">
                      <span className="text-white">LABA BERSIH (NET PROFIT):</span>
                      <span className={netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {formatRupiah(netProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: ARUS KAS (CASHFLOW)                                                */}
          {/* ========================================================================= */}
          {activeTab === 'cashflow' && (
            <div className="space-y-6">
              {/* PENJELASAN ARUS KAS */}
              <div className="p-4 bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                    <span>Manajemen Arus Kas & Likuiditas Toko</span>
                  </div>
                  <p className="text-neutral-400 max-w-2xl">
                    Pencatatan pengeluaran operasional (listrik, gaji, ATK) dan penerimaan kas non-POS.
                    Setiap transaksi otomatis membuat draf jurnal umum double-entry untuk diaudit.
                  </p>
                </div>

                <Button
                  onClick={() => setShowCashflowModal(true)}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs cursor-pointer shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  + Input Arus Kas Baru
                </Button>
              </div>

              {/* KARTU SALDO KAS & BANK */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-neutral-800 bg-neutral-950">
                  <CardHeader className="p-3.5 pb-1">
                    <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                      <span>110 Kas Toko (Tunai)</span>
                      <Wallet className="w-4 h-4 text-emerald-400" />
                    </CardDescription>
                    <CardTitle className="text-base sm:text-lg font-bold text-white font-mono pt-1">
                      {formatRupiah(kasTokoEnding)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-1 text-[10px] text-neutral-500 font-mono">
                    Uang fisik kasir & brankas
                  </CardContent>
                </Card>

                <Card className="border-neutral-800 bg-neutral-950">
                  <CardHeader className="p-3.5 pb-1">
                    <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                      <span>120 Bank BCA (Rekening)</span>
                      <Building2 className="w-4 h-4 text-blue-400" />
                    </CardDescription>
                    <CardTitle className="text-base sm:text-lg font-bold text-white font-mono pt-1">
                      {formatRupiah(bankBcaEnding)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-1 text-[10px] text-neutral-500 font-mono">
                    Rekening transaksi resmi
                  </CardContent>
                </Card>

                <Card className="border-neutral-800 bg-neutral-950">
                  <CardHeader className="p-3.5 pb-1">
                    <CardDescription className="text-xs text-white flex items-center justify-between">
                      <span>Total Likuiditas Toko</span>
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                    </CardDescription>
                    <CardTitle className="text-base sm:text-lg font-bold text-emerald-400 font-mono pt-1">
                      {formatRupiah(totalLikuiditasUang)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-1 text-[10px] text-neutral-400 font-mono">
                    Kas Fisik + Saldo Rekening
                  </CardContent>
                </Card>
              </div>

              {/* DAFTAR TRANSAKSI ARUS KAS DARI JURNAL */}
              <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden shadow-sm">
                <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">Riwayat Mutasi Arus Kas (CASHFLOW)</span>
                  </div>
                  <span className="text-xs font-mono text-neutral-400">
                    Periode: {startDate} s/d {endDate}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-neutral-800 bg-neutral-900/80 text-neutral-400 text-[11px]">
                        <th className="p-3 whitespace-nowrap">Tanggal & Jam</th>
                        <th className="p-3">Keterangan</th>
                        <th className="p-3 text-right">Nominal</th>
                        <th className="p-3">Akun Kas / Bank</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Audit</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-neutral-800/60">
                      {journalList
                        .filter((j) => j.sourceType === 'CASHFLOW')
                        .map((j) => (
                          <tr key={j.id} className="hover:bg-neutral-900/40 transition">
                            <td className="p-3 whitespace-nowrap text-neutral-300">
                              {j.tanggal
                                ? new Date(j.tanggal).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </td>

                            <td className="p-3 font-sans text-white max-w-[280px]">
                              {j.keterangan}
                            </td>

                            <td className="p-3 text-right font-bold text-white whitespace-nowrap">
                              {formatRupiah(j.total)}
                            </td>

                            <td className="p-3 text-neutral-300">
                              {j.lines?.map((l: any, i: number) => (
                                <span key={i} className="mr-2 text-[10px]">
                                  [{l.accountCode}] {l.side}
                                </span>
                              ))}
                            </td>

                            <td className="p-3 text-center whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  j.status === 'POSTED'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}
                              >
                                {j.status}
                              </span>
                            </td>

                            <td className="p-3 text-center whitespace-nowrap">
                              <Button
                                onClick={() => {
                                  setSelectedAuditJournal(j);
                                  setShowAuditModal(true);
                                }}
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px] border-neutral-700 text-neutral-200 cursor-pointer"
                              >
                                Audit
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL 1: AUDIT & VERIFIKASI JURNAL (AUDIT MODAL DI SETIAP ENTRY)          */}
        {/* ========================================================================= */}
        {showAuditModal && selectedAuditJournal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-xl border-neutral-800 bg-neutral-950 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-neutral-800">
                <div className="space-y-0.5">
                  <CardTitle className="text-base flex items-center gap-2 text-white">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    Audit & Verifikasi Ayat Jurnal
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-400 font-mono">
                    ID: #{selectedAuditJournal.id} • Sumber: {selectedAuditJournal.sourceType}
                  </CardDescription>
                </div>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-4 font-mono text-xs">
                {/* Rincian Transaksi */}
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
                  <div className="flex justify-between text-neutral-400">
                    <span>Waktu:</span>
                    <span className="text-white">
                      {selectedAuditJournal.tanggal
                        ? new Date(selectedAuditJournal.tanggal).toLocaleString('id-ID')
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Keterangan:</span>
                    <span className="text-white font-sans font-medium text-right max-w-[300px]">
                      {selectedAuditJournal.keterangan}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-400 border-t border-neutral-800 pt-2">
                    <span>Status Saat Ini:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        selectedAuditJournal.status === 'POSTED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : selectedAuditJournal.status === 'DRAFT'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-red-950 text-red-300 border border-red-800'
                      }`}
                    >
                      {selectedAuditJournal.status}
                    </span>
                  </div>
                </div>

                {/* Ayat Jurnal Debit & Kredit */}
                <div className="space-y-2">
                  <Label className="text-xs text-neutral-400 font-semibold font-sans">
                    Rincian Double-Entry (Debit vs Kredit):
                  </Label>
                  <div className="border border-neutral-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-900 text-neutral-400 text-[10px]">
                        <tr>
                          <th className="p-2">Kode & Nama Akun</th>
                          <th className="p-2 text-center">Posisi</th>
                          <th className="p-2 text-right">Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {selectedAuditJournal.lines?.map((line: any, idx: number) => (
                          <tr key={idx} className="hover:bg-neutral-900/30">
                            <td className="p-2 text-neutral-200">
                              <span className="font-bold text-white">[{line.accountCode}]</span>{' '}
                              {line.account?.name || ''}
                            </td>
                            <td className="p-2 text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  line.side === 'DEBIT'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-blue-950 text-blue-300 border border-blue-800'
                                }`}
                              >
                                {line.side}
                              </span>
                            </td>
                            <td className="p-2 text-right font-bold text-white">{formatRupiah(line.nominal)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-neutral-800 bg-neutral-900/50 font-bold">
                        <tr>
                          <td colSpan={2} className="p-2 text-neutral-400 text-right">
                            Total Transaksi:
                          </td>
                          <td className="p-2 text-right text-emerald-400">
                            {formatRupiah(selectedAuditJournal.total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Audit Actions & Notes */}
                {selectedAuditJournal.status === 'DRAFT' ? (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-amber-950/20 border border-amber-800/60 rounded-xl text-amber-300 text-[11px] font-sans flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Peringatan Verifikasi:</strong> Menyetujui jurnal ini akan mengubah statusnya menjadi{' '}
                        <strong>POSTED</strong> dan secara otomatis membukukannya ke <strong>Buku Besar</strong> serta{' '}
                        <strong>Neraca Saldo</strong> toko.
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        onClick={() => handleAuditJournal(selectedAuditJournal.id, 'APPROVE')}
                        disabled={auditLoading}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs h-9 cursor-pointer"
                      >
                        <CheckSquare className="w-4 h-4 mr-1.5" />
                        Setujui & Posting (POST)
                      </Button>

                      <Button
                        onClick={() => handleAuditJournal(selectedAuditJournal.id, 'REJECT')}
                        disabled={auditLoading}
                        variant="outline"
                        className="border-red-800 text-red-400 hover:bg-red-950 font-bold text-xs h-9 cursor-pointer px-4"
                      >
                        Tolak (REJECT)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 pt-2">
                    {/* Panel Status Pemeriksaan / Audit Koreksi */}
                    <div
                      className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                        selectedAuditJournal.isEdited
                          ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
                          : 'bg-amber-950/30 border-amber-800/80 text-amber-300'
                      }`}
                    >
                      {selectedAuditJournal.isEdited ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">
                            Status Audit: {selectedAuditJournal.isEdited ? 'SUDAH DIKOREKSI' : 'BELUM DIKOREKSI'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              selectedAuditJournal.isEdited
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-600/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-600/40'
                            }`}
                          >
                            {selectedAuditJournal.isEdited ? 'SUDAH DIKOREKSI' : 'BELUM DIKOREKSI'}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-90 leading-relaxed font-sans">
                          {selectedAuditJournal.isEdited
                            ? 'Ayat jurnal ini telah diaudit dan ditandai sebagai entri yang sudah dikoreksi / diverifikasi.'
                            : 'Ayat jurnal ini belum ditandai koreksi. Gunakan tombol di bawah untuk menandai sebagai sudah dikoreksi, atau lakukan koreksi rincian bila ada kesalahan pencatatan.'}
                        </p>
                        {selectedAuditJournal.approvedBy && (
                          <div className="text-[10px] text-neutral-400 pt-1">
                            Disetujui oleh: {selectedAuditJournal.approvedBy} pada{' '}
                            {selectedAuditJournal.approvedAt
                              ? new Date(selectedAuditJournal.approvedAt).toLocaleString('id-ID')
                              : '-'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tombol Aksi Audit: Menandai Koreksi & Membuka Koreksi Rincian */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                      {selectedAuditJournal.isEdited ? (
                        <Button
                          type="button"
                          onClick={async () => {
                            await handleToggleCorrectionStatus(selectedAuditJournal, false);
                            setSelectedAuditJournal((prev: any) =>
                              prev ? { ...prev, isEdited: false } : null
                            );
                          }}
                          variant="outline"
                          className="w-full sm:w-1/2 border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white text-xs h-9 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          Tandai Belum Dikoreksi
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={async () => {
                            await handleToggleCorrectionStatus(selectedAuditJournal, true);
                            setSelectedAuditJournal((prev: any) =>
                              prev ? { ...prev, isEdited: true } : null
                            );
                          }}
                          className="w-full sm:w-1/2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs h-9 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          Tandai Sudah Dikoreksi
                        </Button>
                      )}

                      <Button
                        type="button"
                        onClick={() => handleStartAuditCorrection(selectedAuditJournal)}
                        className="w-full sm:w-1/2 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs h-9 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        Koreksi Rincian Jurnal
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: INPUT MUTASI ARUS KAS CEPAT                                      */}
        {/* ========================================================================= */}
        {showCashflowModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg border-neutral-800 bg-neutral-950 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-neutral-800">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-white">
                    <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
                    Input Mutasi Arus Kas
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-400">
                    Catat pengeluaran beban operasional atau penerimaan kas non-POS.
                  </CardDescription>
                </div>
                <button
                  onClick={() => setShowCashflowModal(false)}
                  className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </CardHeader>

              <form onSubmit={handleCreateCashflow}>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs font-sans">
                  {/* Tipe Transaksi */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-300">Jenis Mutasi</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCfType('CASHFLOW_OUT');
                          setCfSourceAccount('110');
                          setCfTargetAccount('520');
                        }}
                        className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                          cfType === 'CASHFLOW_OUT'
                            ? 'bg-red-950/40 border-red-800 text-red-300 font-bold'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Kas Keluar (Beban)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCfType('CASHFLOW_IN');
                          setCfSourceAccount('310');
                          setCfTargetAccount('110');
                        }}
                        className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                          cfType === 'CASHFLOW_IN'
                            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 font-bold'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Kas Masuk (Modal/Lain)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCfType('CASHFLOW_MUTATION');
                          setCfSourceAccount('110');
                          setCfTargetAccount('120');
                        }}
                        className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                          cfType === 'CASHFLOW_MUTATION'
                            ? 'bg-blue-950/40 border-blue-800 text-blue-300 font-bold'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Mutasi Antar Kas
                      </button>
                    </div>
                  </div>

                  {/* Keterangan */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-300">Keterangan Transaksi</Label>
                    <Input
                      placeholder="Contoh: Bayar Listrik & Air PLN Toko Bulan Oktober"
                      value={cfKeterangan}
                      onChange={(e) => setCfKeterangan(e.target.value)}
                      required
                      className="bg-neutral-900 border-neutral-800 text-white text-xs h-9"
                    />
                  </div>

                  {/* Nominal */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-300">Nominal Uang (Rp)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={cfNominal || ''}
                      onChange={(e) => setCfNominal(Number(e.target.value))}
                      required
                      min={100}
                      className="bg-neutral-900 border-neutral-800 text-white text-xs font-mono h-9"
                    />
                  </div>

                  {/* Akun Sumber & Target */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-neutral-400">Akun Sumber (Kredit)</Label>
                      <select
                        value={cfSourceAccount}
                        onChange={(e) => setCfSourceAccount(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 text-white text-xs rounded-lg p-2 font-mono"
                      >
                        {availableAccounts.map((a: any) => (
                          <option key={a.code} value={a.code}>
                            [{a.code}] {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-neutral-400">Akun Tujuan (Debit)</Label>
                      <select
                        value={cfTargetAccount}
                        onChange={(e) => setCfTargetAccount(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 text-white text-xs rounded-lg p-2 font-mono"
                      >
                        {availableAccounts.map((a: any) => (
                          <option key={a.code} value={a.code}>
                            [{a.code}] {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-[11px] text-neutral-400">
                    Setiap mutasi kas akan langsung membuat <strong>Draf Jurnal Umum</strong> untuk diaudit sebelum
                    mempengaruhi Neraca Saldo resmi.
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCashflowModal(false)}
                      className="border-neutral-800 text-neutral-300 hover:text-white text-xs cursor-pointer"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs cursor-pointer"
                    >
                      Simpan Mutasi Kas
                    </Button>
                  </div>
                </CardContent>
              </form>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: INPUT JURNAL PENYESUAIAN / MANUAL (DOUBLE ENTRY)                 */}
        {/* ========================================================================= */}
        {showManualModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-xl border-neutral-800 bg-neutral-950 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-neutral-800">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-white">
                    {editingJournalId ? (
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-blue-400" />
                    )}
                    {editingJournalId ? 'Audit & Koreksi Ayat Jurnal' : 'Buat Jurnal Penyesuaian Manual'}
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-400">
                    {editingJournalId
                      ? 'Revisi kode akun, posisi debit/kredit, atau nominal. Jurnal ini akan otomatis ditandai [SUDAH DIKOREKSI].'
                      : 'Pastikan total nilai Debit sama persis dengan total Kredit (Balance).'}
                  </CardDescription>
                </div>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </CardHeader>

              <form onSubmit={handleSaveManualJournal}>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs font-sans">
                  {editingJournalId && (
                    <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-xl text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        <strong>Audit Mode:</strong> Setelah Anda menyimpan revisi ayat jurnal ini, sistem akan otomatis menetapkan penanda status <strong>SUDAH DIKOREKSI</strong>.
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-neutral-300">Tanggal Jurnal</Label>
                      <Input
                        type="date"
                        value={journalDate}
                        onChange={(e) => setJournalDate(e.target.value)}
                        required
                        className="bg-neutral-900 border-neutral-800 text-white text-xs font-mono h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-neutral-300">Keterangan / Memo</Label>
                      <Input
                        placeholder="Contoh: Penyesuaian Selisih Kasir Toko"
                        value={journalKeterangan}
                        onChange={(e) => setJournalKeterangan(e.target.value)}
                        required
                        className="bg-neutral-900 border-neutral-800 text-white text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Lines Editor */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-neutral-300 font-semibold">Ayat Jurnal (Akun & Posisi):</Label>
                      <button
                        type="button"
                        onClick={() =>
                          setJournalLines([...journalLines, { accountCode: '110', side: 'DEBIT', nominal: 0 }])
                        }
                        className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer font-bold"
                      >
                        + Tambah Baris
                      </button>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {journalLines.map((line, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-neutral-900/60 p-2 rounded-xl border border-neutral-800">
                          <select
                            value={line.accountCode}
                            onChange={(e) => {
                              const updated = [...journalLines];
                              updated[idx].accountCode = e.target.value;
                              setJournalLines(updated);
                            }}
                            className="bg-neutral-900 border border-neutral-700 text-white text-xs rounded-lg p-1.5 font-mono flex-1"
                          >
                            {availableAccounts.map((a: any) => (
                              <option key={a.code} value={a.code}>
                                [{a.code}] {a.name}
                              </option>
                            ))}
                          </select>

                          <select
                            value={line.side}
                            onChange={(e) => {
                              const updated = [...journalLines];
                              updated[idx].side = e.target.value;
                              setJournalLines(updated);
                            }}
                            className={`border text-xs rounded-lg p-1.5 font-mono font-bold ${
                              line.side === 'DEBIT'
                                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                                : 'bg-blue-950/60 border-blue-800 text-blue-300'
                            }`}
                          >
                            <option value="DEBIT">DEBIT</option>
                            <option value="KREDIT">KREDIT</option>
                          </select>

                          <Input
                            type="number"
                            placeholder="Nominal"
                            value={line.nominal || ''}
                            onChange={(e) => {
                              const updated = [...journalLines];
                              updated[idx].nominal = Number(e.target.value);
                              setJournalLines(updated);
                            }}
                            min={0}
                            className="w-28 bg-neutral-900 border-neutral-700 text-white text-xs font-mono h-8"
                          />

                          {journalLines.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setJournalLines(journalLines.filter((_, i) => i !== idx))}
                              className="text-neutral-500 hover:text-red-400 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Total & Balance Indicator */}
                    <div className="flex items-center justify-between p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono font-bold">
                      {(() => {
                        const deb = journalLines
                          .filter((l) => l.side === 'DEBIT')
                          .reduce((s, l) => s + Number(l.nominal), 0);
                        const kre = journalLines
                          .filter((l) => l.side === 'KREDIT')
                          .reduce((s, l) => s + Number(l.nominal), 0);
                        const isBalanced = deb === kre && deb > 0;

                        return (
                          <>
                            <div className="space-x-2">
                              <span className="text-emerald-400">Debit: {formatRupiah(deb)}</span>
                              <span className="text-neutral-500">|</span>
                              <span className="text-blue-400">Kredit: {formatRupiah(kre)}</span>
                            </div>
                            <div>
                              {isBalanced ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> SEIMBANG
                                </span>
                              ) : (
                                <span className="text-red-400 flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" /> BELUM SEIMBANG
                                </span>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowManualModal(false)}
                      className="border-neutral-800 text-neutral-300 hover:text-white text-xs cursor-pointer"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs cursor-pointer"
                    >
                      {editingJournalId ? 'Simpan Koreksi & Tandai Sudah Dikoreksi' : 'Buat Jurnal'}
                    </Button>
                  </div>
                </CardContent>
              </form>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-neutral-500 font-mono text-xs">
          Memuat sistem akuntansi SOLIT POS...
        </div>
      }
    >
      <FinanceDashboardContent />
    </Suspense>
  );
}
