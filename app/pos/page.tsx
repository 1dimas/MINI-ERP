'use client';

import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePosStore, CartItem } from '@/store/usePosStore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Barcode,
  Trash2,
  CheckCircle2,
  Check,
  AlertCircle,
  CreditCard,
  Banknote,
  Receipt,
  Printer,
  RotateCcw,
  LayoutDashboard,
  LogOut,
  ShoppingBag,
  Loader2,
  Laptop,
  Lock,
  Unlock,
  Coins,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  X,
  RefreshCw,
  Search,
} from 'lucide-react';
import Cookies from 'js-cookie';

function PosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, totalAmount, addToCart, removeFromCart, clearCart } =
    usePosStore();

  const [scanInput, setScanInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');

  // Toast / Feedback State
  const [alert, setAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Struk / Receipt Modal State
  const [completedInvoice, setCompletedInvoice] = useState<any>(null);

  // Riwayat Transaksi Modal State (READ-ONLY UNTUK KASIR)
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');

  // Zustand Global POS & Shift Store
  const {
    user,
    setUser,
    currentShift,
    setCurrentShift,
    isLoadingShift,
    isOpenShiftModal,
    setIsOpenShiftModal,
    isCloseShiftModal,
    setIsCloseShiftModal,
    settlementResult,
    setSettlementResult,
    fetchCurrentShift,
  } = usePosStore();

  const [startingCashInput, setStartingCashInput] = useState<number | ''>(200000);
  const [actualEndingCashInput, setActualEndingCashInput] = useState<number | ''>('');
  const [isSubmittingShift, setIsSubmittingShift] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Format Angka ke Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Hitung Kembalian Otomatis
  const numericPaid = typeof amountPaid === 'number' ? amountPaid : 0;
  const change = numericPaid - totalAmount;
  const isPayable = cart.length > 0 && numericPaid >= totalAmount;

  // Ambil Data Riwayat Transaksi (GET /api/pos/transactions - Read-Only untuk Kasir)
  const fetchHistoryTransactions = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/pos/transactions', {
        headers: {
          'x-user-role': user?.role || 'KASIR',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryTransactions(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Gagal mengambil riwayat transaksi kasir:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Dengarkan query tab=history (jika kasir membuka via menu sidebar atau link navbar)
  useEffect(() => {
    if (searchParams.get('tab') === 'history') {
      setShowHistoryModal(true);
      fetchHistoryTransactions();
    }
  }, [searchParams]);

  // Filter riwayat berdasarkan pencarian invoice, kasir, atau serial number
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return historyTransactions;
    const q = historySearch.toLowerCase();
    return historyTransactions.filter((tx: any) => {
      const inv = (tx.invoiceNumber || '').toLowerCase();
      const sn = (tx.serialNumber || '').toLowerCase();
      const cashier = (tx.cashierName || '').toLowerCase();
      const model = (tx.productUnit?.productModel?.name || '').toLowerCase();
      return inv.includes(q) || sn.includes(q) || cashier.includes(q) || model.includes(q);
    });
  }, [historyTransactions, historySearch]);

  // Buka struk transaksi dari riwayat untuk dilihat & dicetak ulang
  const handleViewReceiptFromHistory = (tx: any) => {
    setCompletedInvoice({
      invoiceNumber: tx.invoiceNumber || tx.id,
      items: [
        {
          modelName: tx.productUnit?.productModel?.name || 'Unit Laptop',
          serialNumber: tx.serialNumber,
          price: Number(tx.totalPrice),
          condition: tx.productUnit?.condition || 'READY',
          grade: tx.productUnit?.grade || null,
        },
      ],
      totalPenjualan: Number(tx.totalPrice),
      amountPaid: Number(tx.totalPrice),
      kembalian: 0,
      paymentMethod: tx.paymentMethod || 'CASH',
      cashierName: tx.cashierName || 'Kasir Toko',
      tanggal: tx.tanggal,
      status: tx.status,
    });
  };

  // Initial Load: Ambil identitas user & pasang autoFocus
  useEffect(() => {
    let activeUser: any = null;
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          activeUser = JSON.parse(storedUser);
          setUser(activeUser);
        } catch {
          // ignore
        }
      }
    }
    fetchCurrentShift(activeUser?.id, activeUser?.role);
    inputRef.current?.focus();
  }, []);

  // Autofocus helper
  const focusInput = () => {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  // Handler Buka Shift
  const handleOpenShift = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cashVal = Number(startingCashInput);
    if (isNaN(cashVal) || cashVal < 0) {
      setAlert({
        type: 'error',
        message: 'Modal awal kasir tidak valid!',
      });
      return;
    }

    setIsSubmittingShift(true);
    setAlert(null);

    try {
      const res = await fetch('/api/shift/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'demo-kasir-id',
          'x-user-role': user?.role || 'KASIR',
        },
        body: JSON.stringify({ startingCash: cashVal }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal membuka shift kasir');
      }

      setIsOpenShiftModal(false);
      await fetchCurrentShift();
      setAlert({
        type: 'success',
        message: `Shift kasir berhasil dibuka dengan modal awal ${formatRupiah(cashVal)}!`,
      });
      focusInput();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat membuka shift',
      });
    } finally {
      setIsSubmittingShift(false);
    }
  };

  // Handler Tutup Shift (Cash Settlement)
  const handleCloseShift = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const actualCashVal = Number(actualEndingCashInput);
    if (isNaN(actualCashVal) || actualCashVal < 0) {
      setAlert({
        type: 'error',
        message: 'Masukkan jumlah uang fisik aktual yang valid!',
      });
      return;
    }

    setIsSubmittingShift(true);
    setAlert(null);

    try {
      const res = await fetch('/api/shift/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'demo-kasir-id',
          'x-user-role': user?.role || 'KASIR',
        },
        body: JSON.stringify({ actualEndingCash: actualCashVal }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menutup shift');
      }

      setIsCloseShiftModal(false);
      setCurrentShift(null);
      setSettlementResult(data);
      setAlert({
        type: 'success',
        message: 'Shift harian berhasil ditutup & Jurnal Akuntansi telah dibukukan.',
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat menutup shift',
      });
    } finally {
      setIsSubmittingShift(false);
    }
  };

  // 1. SCAN SERIAL NUMBER
  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sn = scanInput.trim().toUpperCase();
    if (!sn) return;

    setIsScanning(true);
    setAlert(null);

    try {
      const res = await fetch(`/api/pos/scan/${encodeURIComponent(sn)}`, {
        method: 'GET',
        headers: {
          'x-user-role': user?.role || 'KASIR',
          'x-user-name': user?.name || 'Kasir',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Unit [${sn}] tidak ditemukan atau sudah terjual`);
      }

      // Masukkan ke Zustand Cart
      const addResult = addToCart({
        serialNumber: data.serialNumber,
        modelName: data.modelName || 'Laptop Unit',
        price: Number(data.price),
        hpp: Number(data.hpp || 0),
        condition: data.condition,
        grade: data.grade,
        category: data.category,
      });

      if (!addResult.success) {
        throw new Error(addResult.message || 'Unit sudah ada di keranjang');
      }

      setScanInput('');
      setAlert({
        type: 'success',
        message: `Berhasil menambahkan ${data.modelName || data.serialNumber} (${formatRupiah(Number(data.price))})`,
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Gagal memindai Serial Number',
      });
    } finally {
      setIsScanning(false);
      focusInput();
    }
  };

  // 2. PROSES PEMBAYARAN (CHECKOUT)
  const handleCheckout = async () => {
    if (!isPayable) return;

    if (!currentShift) {
      setAlert({
        type: 'error',
        message: 'Shift kasir belum dibuka! Silakan buka shift kasir terlebih dahulu.',
      });
      setIsOpenShiftModal(true);
      return;
    }

    setIsCheckingOut(true);
    setAlert(null);

    try {
      const payload = {
        paymentMethod,
        amountPaid: numericPaid,
        items: cart.map((item) => item.serialNumber),
      };

      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || 'KASIR',
          'x-user-name': user?.name || 'Kasir Toko',
          'x-user-id': user?.id || 'demo-kasir-id',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal memproses pembayaran POS');
      }

      // Simpan invoice untuk struk modal
      setCompletedInvoice(data.invoice || {
        invoiceNumber: 'INV-' + Date.now(),
        items: cart,
        totalPenjualan: totalAmount,
        amountPaid: numericPaid,
        kembalian: change,
        paymentMethod,
        cashierName: user?.name || 'Kasir Toko',
      });

      // Bersihkan keranjang kasir
      clearCart();
      setAmountPaid('');
      setScanInput('');

      // Refresh data shift untuk memperbarui expectedEndingCash
      await fetchCurrentShift();

      setAlert({
        type: 'success',
        message: 'Pembayaran berhasil! Struk siap dicetak & saldo shift diperbarui.',
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat checkout',
      });
    } finally {
      setIsCheckingOut(false);
      focusInput();
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
      {/* ============================================================ */}
      {/* KOLOM KIRI: AREA SCANNER BARCODE & DAFTAR KERANJANG (7 Col) */}
      {/* ============================================================ */}
      <section className="lg:col-span-7 flex flex-col space-y-4">
          {/* Card Scanner Form */}
          <Card className="border-neutral-800 bg-neutral-900/60 shadow-lg">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-emerald-400" />
                  <CardTitle className="text-base font-semibold text-white">
                    Scan Barcode / Serial Number
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowHistoryModal(true);
                      fetchHistoryTransactions();
                    }}
                    className="h-7 text-xs border-neutral-700 bg-neutral-800/80 text-neutral-200 hover:text-white cursor-pointer gap-1.5 shadow-sm"
                  >
                    <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Riwayat Transaksi</span>
                    <Badge variant="outline" className="text-[9px] border-neutral-600 text-neutral-400 px-1 py-0 hidden sm:inline">
                      Read Only
                    </Badge>
                  </Button>
                  <span className="text-[11px] text-neutral-400 hidden md:inline">• Enter untuk input</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {/* Notifikasi Jika Shift Belum Dibuka */}
              {!currentShift && !isLoadingShift && (
                <div className="mb-4 p-3.5 rounded-xl border border-amber-900/60 bg-amber-950/30 text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-amber-300">Shift Kasir Belum Dibuka</div>
                      <div className="text-[11px] text-amber-200/80">
                        Deklarasikan modal kas awal di laci sebelum memulai penjualan POS.
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setStartingCashInput(200000);
                      setIsOpenShiftModal(true);
                    }}
                    className="h-8 px-3 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shrink-0 cursor-pointer"
                  >
                    Buka Shift
                  </Button>
                </div>
              )}

              <form onSubmit={handleScanSubmit} className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    autoFocus
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Scan Serial Number (SN)..."
                    disabled={isScanning}
                    className="h-12 pl-4 pr-10 text-base font-mono bg-black border-neutral-700 text-white placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all rounded-lg"
                  />
                  {isScanning && (
                    <div className="absolute right-3 top-3.5 text-emerald-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={isScanning || !scanInput.trim()}
                  className="h-12 px-6 bg-white text-black hover:bg-neutral-200 font-semibold cursor-pointer"
                >
                  Scan
                </Button>
              </form>

              {/* Alert Feedback (Merah jika error, Hijau jika sukses) */}
              {alert && (
                <div
                  className={`mt-3 p-3 rounded-lg text-xs flex items-start gap-2.5 transition-all animate-in fade-in ${
                    alert.type === 'error'
                      ? 'border border-red-900/70 bg-red-950/40 text-red-200'
                      : 'border border-emerald-900/70 bg-emerald-950/40 text-emerald-200'
                  }`}
                >
                  {alert.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed font-medium">{alert.message}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card Tabel Keranjang Belanja */}
          <Card className="border-neutral-800 bg-neutral-900/60 shadow-lg flex-1 flex flex-col">
            <CardHeader className="py-3 px-5 border-b border-neutral-800/80 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-neutral-400" />
                <CardTitle className="text-sm font-semibold text-white">
                  Keranjang Penjualan
                </CardTitle>
                <Badge variant="secondary" className="bg-neutral-800 text-white text-xs px-2 py-0.5">
                  {cart.length} Unit
                </Badge>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearCart();
                    focusInput();
                  }}
                  className="text-xs text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Kosongkan</span>
                </button>
              )}
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-auto max-h-[380px]">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500">
                  <Laptop className="w-12 h-12 stroke-1 mb-2 opacity-40" />
                  <p className="text-sm font-medium text-neutral-400">Keranjang kasir masih kosong</p>
                  <p className="text-xs mt-1 max-w-xs text-neutral-500">
                    Arahkan scanner ke barcode SN unit fisik atau ketik nomor seri lalu tekan Enter.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-800 hover:bg-transparent">
                      <TableHead className="w-[45%] text-xs font-semibold text-neutral-400">Unit Laptop / SN</TableHead>
                      <TableHead className="text-xs font-semibold text-neutral-400">Kondisi</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-neutral-400">Harga</TableHead>
                      <TableHead className="w-[50px] text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item, idx) => (
                      <TableRow key={item.serialNumber + idx} className="border-neutral-800/80 hover:bg-neutral-800/30">
                        <TableCell className="py-3">
                          <div className="font-semibold text-white text-sm leading-tight">
                            {item.modelName}
                          </div>
                          <div className="font-mono text-xs text-emerald-400 mt-0.5 tracking-wide">
                            SN: {item.serialNumber}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="border-neutral-700 text-neutral-300 text-[10px]">
                              {item.condition || 'SECOND'}
                            </Badge>
                            {item.grade && (
                              <Badge variant="outline" className="border-neutral-700 text-neutral-400 text-[10px]">
                                Grd {item.grade}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-right font-mono font-medium text-white text-sm">
                          {formatRupiah(item.price)}
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              removeFromCart(item.serialNumber);
                              focusInput();
                            }}
                            title="Hapus dari keranjang"
                            className="text-neutral-500 hover:text-red-400 p-1.5 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ============================================================ */}
        {/* KOLOM KANAN: AREA PEMBAYARAN, TOTAL & CHECKOUT (5 Col)       */}
        {/* ============================================================ */}
        <section className="lg:col-span-5 flex flex-col space-y-4">
          <Card className="border-neutral-800 bg-neutral-900/60 shadow-xl flex-1 flex flex-col justify-between">
            <CardHeader className="pb-2 pt-4 px-5 border-b border-neutral-800/80">
              <CardTitle className="text-sm font-semibold text-white flex items-center justify-between">
                <span>Rincian Pembayaran</span>
                <Badge variant="outline" className="border-neutral-700 text-neutral-300 font-mono text-[11px]">
                  {paymentMethod}
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 space-y-5 flex-1">
              {/* Metode Pembayaran (CASH / TRANSFER) */}
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-400 font-medium">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`h-10 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold border transition-all cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                        : 'border-neutral-800 bg-black/40 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>TUNAI (CASH)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TRANSFER')}
                    className={`h-10 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold border transition-all cursor-pointer ${
                      paymentMethod === 'TRANSFER'
                        ? 'border-blue-500 bg-blue-950/40 text-blue-300'
                        : 'border-neutral-800 bg-black/40 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>TRANSFER BCA</span>
                  </button>
                </div>
              </div>

              {/* Total Belanja (Big Text) */}
              <div className="p-4 rounded-xl border border-neutral-800 bg-black/80 flex flex-col space-y-1">
                <span className="text-xs text-neutral-400 font-medium tracking-wide">TOTAL TAGIHAN</span>
                <span className="text-3xl font-black text-white font-mono tracking-tight">
                  {formatRupiah(totalAmount)}
                </span>
                <span className="text-[11px] text-neutral-500">
                  {cart.length > 0 ? `${cart.length} item fisik terdaftar` : 'Belum ada item'}
                </span>
              </div>

              {/* Input Uang Diterima (amountPaid) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="amountPaid" className="text-xs text-neutral-300 font-medium">
                    Uang Diterima Pelanggan
                  </label>
                  {totalAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmountPaid(totalAmount)}
                      className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                    >
                      Uang Pas
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-neutral-400 font-mono text-sm font-semibold">
                    Rp
                  </span>
                  <Input
                    id="amountPaid"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={amountPaid}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAmountPaid(val === '' ? '' : Number(val));
                    }}
                    className="h-11 pl-10 text-lg font-mono font-bold bg-black border-neutral-700 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Quick Presets Uang */}
                {totalAmount > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[50000, 100000, 200000, 500000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          const base = typeof amountPaid === 'number' ? amountPaid : totalAmount;
                          setAmountPaid(base + preset);
                        }}
                        className="px-2 py-1 rounded bg-neutral-800 text-[10px] font-mono text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors cursor-pointer"
                      >
                        +{preset / 1000}rb
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tampilan Kembalian (Auto-Calculate) */}
              <div className="p-3.5 rounded-lg border border-neutral-800/80 bg-neutral-950/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-neutral-400">Kembalian Pelanggan</div>
                  <div className="text-[10px] text-neutral-500">amountPaid - totalAmount</div>
                </div>
                <div
                  className={`text-xl font-bold font-mono tracking-tight ${
                    numericPaid === 0 || cart.length === 0
                      ? 'text-neutral-500'
                      : change >= 0
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  {formatRupiah(Math.max(0, change))}
                </div>
              </div>

              {/* Status Validasi Uang */}
              {cart.length > 0 && numericPaid > 0 && change < 0 && (
                <p className="text-[11px] text-red-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Uang bayar kurang {formatRupiah(Math.abs(change))}</span>
                </p>
              )}
            </CardContent>

            {/* Tombol Besar Proses Pembayaran */}
            <div className="p-5 border-t border-neutral-800/80 bg-black/40">
              <Button
                type="button"
                onClick={handleCheckout}
                disabled={!isPayable || isCheckingOut}
                className={`w-full h-14 text-base font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                  isPayable
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-950/50'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-800'
                }`}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Memproses Transaksi & Auto-Journal...</span>
                  </>
                ) : (
                  <>
                    <Receipt className="w-5 h-5" />
                    <span>Proses Pembayaran ({formatRupiah(totalAmount)})</span>
                  </>
                )}
              </Button>
            </div>
          </Card>
        </section>

      {/* ============================================================ */}
      {/* MODAL DIALOG STRUK DIGITAL SUKSES (Siap Cetak / Thermal)     */}
      {/* ============================================================ */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-emerald-950/60 border-b border-emerald-900/60 p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center mx-auto mb-2">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <h3 className="text-base font-bold text-emerald-200">Transaksi Berhasil!</h3>
              <p className="text-xs text-emerald-400 font-mono mt-0.5">
                {completedInvoice.invoiceNumber || 'INV-SUCCESS'}
              </p>
            </div>

            <div className="p-6 space-y-4 text-xs font-mono">
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-400">Kasir:</span>
                <span className="text-white font-semibold">{completedInvoice.cashierName}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-400">Metode Bayar:</span>
                <span className="text-white font-semibold">{completedInvoice.paymentMethod}</span>
              </div>

              {/* Rincian Barang Terjual */}
              <div className="space-y-2 pt-1">
                <div className="text-neutral-400 font-sans font-semibold text-[11px]">Item Terjual:</div>
                {completedInvoice.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start text-[11px] leading-tight">
                    <div>
                      <div className="text-white">{item.modelName || item.name}</div>
                      <div className="text-neutral-500 text-[10px]">SN: {item.serialNumber}</div>
                    </div>
                    <div className="text-white font-semibold">{formatRupiah(item.price)}</div>
                  </div>
                ))}
              </div>

              {/* Kalkulasi Pembayaran */}
              <div className="pt-2 border-t border-neutral-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total:</span>
                  <span className="text-white font-bold">{formatRupiah(completedInvoice.totalPenjualan)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Uang Diterima:</span>
                  <span className="text-white">{formatRupiah(completedInvoice.amountPaid)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-dashed border-neutral-800 font-bold text-sm">
                  <span className="text-emerald-400">Kembalian:</span>
                  <span className="text-emerald-400">{formatRupiah(completedInvoice.kembalian)}</span>
                </div>
              </div>

              <div className="pt-2 text-[10px] text-neutral-500 text-center border-t border-neutral-800/60 font-sans">
                Jurnal Akuntansi status <strong className="text-emerald-400">POSTED</strong> berhasil dibuat otomatis di Buku Besar.
              </div>
            </div>

            <div className="p-4 bg-black/50 border-t border-neutral-800 flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
                className="flex-1 border-neutral-700 text-white hover:bg-neutral-800 h-10 gap-1.5 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Struk Thermal</span>
              </Button>

              <Button
                onClick={() => {
                  setCompletedInvoice(null);
                  focusInput();
                }}
                className="flex-1 bg-white text-black hover:bg-neutral-200 font-semibold h-10 text-xs"
              >
                <span>Transaksi Baru</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DIALOG BUKA SHIFT KASIR (Modal Awal)                   */}
      {/* ============================================================ */}
      {isOpenShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Unlock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Buka Shift Kasir Baru</h3>
                  <p className="text-[11px] text-neutral-400">Deklarasikan modal kas kecil awal di laci</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpenShiftModal(false)}
                className="w-7 h-7 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleOpenShift} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Modal Awal Uang Fisik (Starting Cash)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-neutral-500 font-mono">Rp</span>
                  <Input
                    autoFocus
                    type="number"
                    value={startingCashInput}
                    onChange={(e) =>
                      setStartingCashInput(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="Contoh: 200000"
                    disabled={isSubmittingShift}
                    className="h-10 pl-9 font-mono bg-black border-neutral-700 text-white placeholder:text-neutral-600 focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-neutral-400">
                  Uang pecahan kembalian yang disiapkan di laci kasir sebelum transaksi dimulai.
                </p>
              </div>

              {/* Tombol Cepat Nominal */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-neutral-400 font-medium">Pilihan Cepat:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[100000, 200000, 300000, 500000].map((val) => (
                    <Button
                      key={val}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStartingCashInput(val)}
                      className={`h-8 text-[11px] border-neutral-800 ${
                        startingCashInput === val
                          ? 'border-emerald-500 text-emerald-400 bg-emerald-950/30 font-bold'
                          : 'bg-black text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      {formatRupiah(val).replace('Rp', '').trim()}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpenShiftModal(false)}
                  disabled={isSubmittingShift}
                  className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800 h-10 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingShift || startingCashInput === '' || Number(startingCashInput) < 0}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-10 text-xs cursor-pointer"
                >
                  {isSubmittingShift ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      <span>Membuka...</span>
                    </>
                  ) : (
                    <span>Konfirmasi Buka Shift</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DIALOG TUTUP SHIFT KASIR (Cash Settlement)             */}
      {/* ============================================================ */}
      {isCloseShiftModal && currentShift && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Tutup Shift Kasir (Cash Settlement)</h3>
                  <p className="text-[11px] text-neutral-400">
                    Rekonsiliasi uang fisik laci dengan pencatatan sistem
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCloseShiftModal(false)}
                className="w-7 h-7 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleCloseShift} className="p-5 space-y-4">
              {/* Ringkasan Saldo Buku Kas */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <div className="text-[10px] text-neutral-400 font-medium">Modal Awal</div>
                  <div className="text-xs sm:text-sm font-bold font-mono text-white mt-1">
                    {formatRupiah(Number(currentShift.shift?.startingCash || 0))}
                  </div>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <div className="text-[10px] text-emerald-400 font-medium">Penjualan Tunai (Cash)</div>
                  <div className="text-xs sm:text-sm font-bold font-mono text-emerald-400 mt-1">
                    +{formatRupiah(Number(currentShift.totalPenjualanCash || 0))}
                  </div>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <div className="text-[10px] text-amber-400 font-medium">Target Fisik (Expected)</div>
                  <div className="text-xs sm:text-sm font-bold font-mono text-amber-400 mt-1">
                    ={formatRupiah(Number(currentShift.expectedEndingCash || 0))}
                  </div>
                </div>
              </div>

              {/* Input Uang Fisik Aktual */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-200 flex items-center justify-between">
                  <span>Uang Fisik Aktual di Laci (Dihitung Kasir)</span>
                  <span className="text-[10px] text-neutral-400 font-normal">Wajib dihitung fisik</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-neutral-500 font-mono">Rp</span>
                  <Input
                    autoFocus
                    type="number"
                    value={actualEndingCashInput}
                    onChange={(e) =>
                      setActualEndingCashInput(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder={`Contoh: ${currentShift.expectedEndingCash}`}
                    disabled={isSubmittingShift}
                    className="h-11 pl-9 text-base font-mono bg-black border-neutral-700 text-white placeholder:text-neutral-600 focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              {/* Perhitungan Selisih Kas Real-Time */}
              {actualEndingCashInput !== '' && (() => {
                const actual = Number(actualEndingCashInput);
                const expected = Number(currentShift.expectedEndingCash || 0);
                const diff = actual - expected;

                if (diff === 0) {
                  return (
                    <div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-200 text-xs flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-emerald-300">Selisih: Rp 0 (Balance Sempurna)</div>
                        <div className="text-[11px] text-emerald-400/90 mt-0.5">
                          Uang fisik di laci cocok 100% dengan pencatatan transaksi kasir di sistem.
                        </div>
                      </div>
                    </div>
                  );
                } else if (diff < 0) {
                  return (
                    <div className="p-3 rounded-xl border border-red-800 bg-red-950/40 text-red-200 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-red-300 flex items-center gap-1.5">
                          <span>Uang Fisik Kurang (Shortage): -{formatRupiah(Math.abs(diff))}</span>
                        </div>
                        <div className="text-[11px] text-red-300/90 mt-0.5 leading-relaxed">
                          Sistem akan otomatis mencatat Jurnal Akuntansi:
                          <br />
                          • <strong className="text-white">DEBIT 530 (Beban Selisih Kas):</strong> {formatRupiah(Math.abs(diff))}
                          <br />
                          • <strong className="text-white">KREDIT 110 (Kas Toko):</strong> {formatRupiah(Math.abs(diff))}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 rounded-xl border border-sky-800 bg-sky-950/40 text-sky-200 text-xs flex items-start gap-2.5">
                      <TrendingUp className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-sky-300">
                          Uang Fisik Lebih (Overage): +{formatRupiah(diff)}
                        </div>
                        <div className="text-[11px] text-sky-300/90 mt-0.5 leading-relaxed">
                          Sistem akan otomatis mencatat Jurnal Akuntansi:
                          <br />
                          • <strong className="text-white">DEBIT 110 (Kas Toko):</strong> {formatRupiah(diff)}
                          <br />
                          • <strong className="text-white">KREDIT 410 (Pendapatan Lain):</strong> {formatRupiah(diff)}
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCloseShiftModal(false)}
                  disabled={isSubmittingShift}
                  className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800 h-10 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingShift || actualEndingCashInput === '' || Number(actualEndingCashInput) < 0}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold h-10 text-xs cursor-pointer"
                >
                  {isSubmittingShift ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      <span>Menyelesaikan...</span>
                    </>
                  ) : (
                    <span>Tutup Shift & Catat Jurnal</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DIALOG HASIL TUTUP SHIFT (Settlement Result)           */}
      {/* ============================================================ */}
      {settlementResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-neutral-950 border-b border-neutral-800 p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <h3 className="text-base font-bold text-white">Shift Kasir Resmi Ditutup</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Buku kas laci telah diselesaikan & neraca tetap seimbang
              </p>
            </div>

            <div className="p-5 space-y-3 text-xs font-mono">
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-400">Modal Awal:</span>
                <span className="text-white">{formatRupiah(Number(settlementResult.shift?.startingCash || 0))}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-400">Expected (Target Sistem):</span>
                <span className="text-white">{formatRupiah(Number(settlementResult.shift?.expectedEndingCash || 0))}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-400">Uang Fisik Dihitung:</span>
                <span className="text-white font-bold">{formatRupiah(Number(settlementResult.shift?.actualEndingCash || 0))}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-400">Selisih Kas:</span>
                <span className={`font-bold ${
                  settlementResult.selisih < 0 ? 'text-red-400' : settlementResult.selisih > 0 ? 'text-sky-400' : 'text-emerald-400'
                }`}>
                  {settlementResult.selisih < 0
                    ? `-${formatRupiah(Math.abs(settlementResult.selisih))}`
                    : settlementResult.selisih > 0
                    ? `+${formatRupiah(settlementResult.selisih)}`
                    : 'Rp 0 (Pas)'}
                </span>
              </div>

              {settlementResult.journalEntry ? (
                <div className="pt-2 text-[11px] text-neutral-400 bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 font-sans">
                  <div className="text-emerald-400 font-bold mb-1">Jurnal Selisih Kas Dibuat:</div>
                  <div>No Entry: <strong className="text-white font-mono">{settlementResult.journalEntry.entryNumber}</strong></div>
                  <div>Deskripsi: <span className="text-neutral-300">{settlementResult.journalEntry.description}</span></div>
                </div>
              ) : (
                <div className="pt-2 text-[11px] text-neutral-400 text-center font-sans">
                  Tidak ada selisih kas. Buku besar kas identik 100% dengan fisik laci.
                </div>
              )}
            </div>

            <div className="p-4 bg-black/50 border-t border-neutral-800 flex">
              <Button
                onClick={() => setSettlementResult(null)}
                className="w-full bg-white text-black hover:bg-neutral-200 font-semibold h-10 text-xs cursor-pointer"
              >
                Selesai
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL RIWAYAT TRANSAKSI PENJUALAN (READ-ONLY UNTUK KASIR)   */}
      {/* ============================================================ */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Riwayat Transaksi Penjualan</h3>
                    <Badge variant="outline" className="text-[10px] bg-neutral-900 border-neutral-700 text-neutral-300 font-mono">
                      READ ONLY
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Akses kasir: Meninjau nota transaksi & cetak ulang struk pelanggan.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchHistoryTransactions}
                  disabled={isLoadingHistory}
                  className="h-8 text-xs border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  Segarkan
                </Button>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Toolbar Pencarian */}
            <div className="p-3 sm:p-4 border-b border-neutral-800/80 bg-neutral-900/30 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Input
                  placeholder="Cari nomor invoice, kasir, atau serial number..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="bg-black border-neutral-800 text-xs h-9 pl-3 text-white font-mono"
                />
              </div>
              <div className="text-[11px] text-neutral-400 hidden sm:block">
                Menampilkan <strong>{filteredHistory.length}</strong> nota transaksi
              </div>
            </div>

            {/* Tabel Riwayat */}
            <div className="flex-1 overflow-auto p-0">
              {isLoadingHistory ? (
                <div className="py-16 text-center text-neutral-500 text-xs flex flex-col items-center justify-center gap-2 font-mono">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span>Memuat riwayat transaksi kasir...</span>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="py-16 text-center text-neutral-500 text-xs font-mono">
                  Tidak ada riwayat transaksi yang cocok dengan pencarian.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-neutral-900/80 sticky top-0 z-10">
                    <TableRow className="border-neutral-800">
                      <TableHead className="text-xs font-semibold text-neutral-400">No. Invoice</TableHead>
                      <TableHead className="text-xs font-semibold text-neutral-400">Waktu</TableHead>
                      <TableHead className="text-xs font-semibold text-neutral-400">Kasir</TableHead>
                      <TableHead className="text-xs font-semibold text-neutral-400">Item & Serial Number</TableHead>
                      <TableHead className="text-xs font-semibold text-neutral-400">Metode</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-neutral-400">Total Belanja</TableHead>
                      <TableHead className="text-center text-xs font-semibold text-neutral-400">Status</TableHead>
                      <TableHead className="text-center text-xs font-semibold text-neutral-400">Struk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-neutral-800/60 font-mono text-xs">
                    {filteredHistory.map((tx: any) => {
                      const isVoid = tx.status === 'VOID';
                      return (
                        <TableRow key={tx.id} className="hover:bg-neutral-900/40 border-neutral-800/80">
                          <TableCell className="font-bold text-white whitespace-nowrap">
                            {tx.invoiceNumber || tx.id.slice(0, 13)}
                          </TableCell>
                          <TableCell className="text-neutral-400 whitespace-nowrap text-[11px]">
                            {tx.tanggal ? new Date(tx.tanggal).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                          </TableCell>
                          <TableCell className="text-neutral-300 font-sans text-xs">
                            {tx.cashierName || 'Kasir'}
                          </TableCell>
                          <TableCell className="text-neutral-200 max-w-[200px] truncate font-sans">
                            <div className="font-medium text-white truncate">
                              {tx.productUnit?.productModel?.name || 'Unit Laptop'}
                            </div>
                            <div className="text-[10px] font-mono text-emerald-400">
                              SN: {tx.serialNumber}
                            </div>
                          </TableCell>
                          <TableCell className="text-neutral-300 text-[11px]">
                            <Badge variant="outline" className="border-neutral-700 bg-neutral-900 text-neutral-300 text-[10px]">
                              {tx.paymentMethod || 'CASH'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-white whitespace-nowrap">
                            {formatRupiah(Number(tx.totalPrice))}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {isVoid ? (
                              <Badge variant="outline" className="border-red-800 bg-red-950/60 text-red-300 text-[10px]">
                                VOID
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-emerald-800 bg-emerald-950/60 text-emerald-300 text-[10px]">
                                SUCCESS
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                handleViewReceiptFromHistory(tx);
                              }}
                              className="h-7 px-2.5 text-[11px] border-neutral-700 bg-neutral-900 text-neutral-200 hover:text-white cursor-pointer gap-1"
                            >
                              <Printer className="w-3 h-3 text-emerald-400" />
                              <span>Struk</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Footer Notice */}
            <div className="p-3.5 bg-neutral-900/70 border-t border-neutral-800 text-[11px] text-neutral-400 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-neutral-400 text-center sm:text-left">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Catatan Keamanan: Pembatalan transaksi (VOID) adalah wewenang Owner dan tidak dapat dilakukan oleh akun Kasir.
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowHistoryModal(false)}
                className="h-7 text-xs border-neutral-700 text-neutral-300 cursor-pointer"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-neutral-950 text-neutral-400 text-xs font-mono">
          <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-400" />
          Memuat Terminal Kasir SOLIT POS...
        </div>
      }
    >
      <PosContent />
    </Suspense>
  );
}
