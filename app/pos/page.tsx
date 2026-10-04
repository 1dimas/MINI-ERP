'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import Cookies from 'js-cookie';

export default function PosPage() {
  const router = useRouter();
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

  // User Profile State
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

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

  // Initial Load: Ambil identitas user & pasang autoFocus
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // ignore
        }
      }
    }
    inputRef.current?.focus();
  }, []);

  // Autofocus helper
  const focusInput = () => {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
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

      setAlert({
        type: 'success',
        message: 'Pembayaran berhasil! Struk siap dicetak.',
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

  // Logout handler
  const handleLogout = () => {
    Cookies.remove('access_token');
    Cookies.remove('token');
    Cookies.remove('user_role');
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Navbar Header */}
      <header className="border-b border-neutral-800 bg-black/60 backdrop-blur-md sticky top-0 z-30 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-black text-sm">
            POS
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              SOLIT POS <span className="text-[10px] text-neutral-400 font-normal">v1.0 (Zero-Friction)</span>
            </h1>
            <p className="text-[11px] text-neutral-400">Terminal Kasir & Integrasi Otomatis Akuntansi</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-neutral-300">Kasir: <strong className="text-white">{user?.name || 'Budi Kasir'}</strong></span>
            <Badge variant="outline" className="text-[10px] border-neutral-700 text-neutral-300 py-0 px-1.5 ml-1">
              {user?.role || 'KASIR'}
            </Badge>
          </div>

          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-neutral-300 hover:text-white border-neutral-800 bg-neutral-900">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </header>

      {/* Main POS Container (Grid 2 Kolom) */}
      <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ============================================================ */}
        {/* KOLOM KIRI: AREA SCANNER BARCODE & DAFTAR KERANJANG (7 Col) */}
        {/* ============================================================ */}
        <section className="lg:col-span-7 flex flex-col space-y-4">
          {/* Card Scanner Form */}
          <Card className="border-neutral-800 bg-neutral-900/60 shadow-lg">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-emerald-400" />
                  <CardTitle className="text-base font-semibold text-white">
                    Scan Barcode / Serial Number
                  </CardTitle>
                </div>
                <span className="text-[11px] text-neutral-400">Tekan Enter untuk input instan</span>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
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
      </main>

      {/* ============================================================ */}
      {/* MODAL DIALOG STRUK DIGITAL SUKSES (Siap Cetak / Thermal)     */}
      {/* ============================================================ */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-emerald-950/60 border-b border-emerald-900/60 p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center mx-auto mb-2 font-bold">
                ✓
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
    </div>
  );
}
