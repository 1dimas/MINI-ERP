'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Laptop,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlusCircle,
  Search,
  Wrench,
  ArrowRight,
  ShoppingCart,
  DollarSign,
  RefreshCw,
  Lock,
  X,
  Layers,
  Folder,
} from 'lucide-react';

export default function InventoryPage() {
  const [role, setRole] = useState<'OWNER' | 'FINANCE' | 'KASIR'>('OWNER');
  const [userName, setUserName] = useState<string>('Dimas Owner');
  const [viewMode, setViewMode] = useState<'MODELS' | 'UNITS'>('MODELS');

  const [units, setUnits] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  // Form states for Add Unit (Finance Maker)
  const [formData, setFormData] = useState({
    serialNumber: '',
    name: '',
    condition: 'SECOND' as 'NEW' | 'SECOND',
    grade: 'B' as 'A' | 'B' | 'C',
    hpp: '',
    price: '',
    paymentAccountCode: '110',
    isFisikNormal: true,
    isMesinNormal: true,
    isStorageNormal: true,
    isSuhuNormal: true,
    isKeyboardNormal: true,
    isTouchpadNormal: true,
    isPortNormal: true,
    isWebcamNormal: true,
    catatanFisik: '',
  });

  // Form state for Upgrade (Value-Add / Capitalization Phase)
  const [upgradeData, setUpgradeData] = useState({
    addedHppCost: '',
    newGrade: 'A' as 'A' | 'B' | 'C',
    newStatus: 'AVAILABLE' as 'AVAILABLE' | 'IN_REPAIR',
    isFisikNormal: true,
    isMesinNormal: true,
    isStorageNormal: true,
    isSuhuNormal: true,
    isKeyboardNormal: true,
    isTouchpadNormal: true,
    isPortNormal: true,
    isWebcamNormal: true,
    catatanFisik: '',
  });

  // POS Checkout Simulation State
  const [posSn, setPosSn] = useState<string>('');
  const [posAccountCode, setPosAccountCode] = useState<string>('110');
  const [posFeedback, setPosFeedback] = useState<{ type: 'success' | 'error'; message: string; details?: any } | null>(null);
  const [isSubmittingPos, setIsSubmittingPos] = useState<boolean>(false);

  // Global Notification Feedback
  const [apiFeedback, setApiFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.role) setRole(u.role);
        if (u.name) setUserName(u.name);
      } catch (e) {}
    }
    fetchData();
  }, [role]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resUnits, resModels] = await Promise.all([
        fetch('/api/inventory/units', { headers: { 'x-user-role': role } }),
        fetch('/api/inventory/model'),
      ]);

      if (resUnits.ok) {
        const dataUnits = await resUnits.json();
        setUnits(dataUnits);
      }
      if (resModels.ok) {
        const dataModels = await resModels.json();
        setModels(dataModels);
      }
    } catch (e: any) {
      showFeedback('error', e.message || 'Koneksi gagal');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setApiFeedback({ type, message });
    setTimeout(() => {
      setApiFeedback(null);
    }, 5000);
  };

  // Submit New Unit (Finance Maker)
  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serialNumber || !formData.name || !formData.hpp || !formData.price) {
      showFeedback('error', 'Semua kolom wajib (SN, Nama, HPP, Harga Jual) harus diisi!');
      return;
    }

    try {
      // 1. Create/Get Katalog Induk (ProductModel)
      const skuClean = `SKU-${formData.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12)}`;
      const modelRes = await fetch('/api/inventory/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: skuClean,
          name: formData.name,
          category: 'LAPTOP',
        }),
      });

      const modelData = await modelRes.json();
      if (!modelRes.ok) throw new Error(modelData.message || 'Gagal membuat Katalog Induk');

      // 2. Create Penerimaan Unit Fisik (ProductUnit)
      const res = await fetch('/api/inventory/unit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
          'x-user-name': userName,
        },
        body: JSON.stringify({
          productModelId: modelData.id,
          serialNumber: formData.serialNumber.trim().toUpperCase(),
          condition: formData.condition,
          grade: formData.condition === 'NEW' ? null : formData.grade,
          hpp: parseFloat(formData.hpp),
          price: parseFloat(formData.price),
          paymentAccountCode: formData.paymentAccountCode,
          isFisikNormal: formData.isFisikNormal,
          isMesinNormal: formData.isMesinNormal,
          isStorageNormal: formData.isStorageNormal,
          isSuhuNormal: formData.isSuhuNormal,
          isKeyboardNormal: formData.isKeyboardNormal,
          isTouchpadNormal: formData.isTouchpadNormal,
          isPortNormal: formData.isPortNormal,
          isWebcamNormal: formData.isWebcamNormal,
          catatanFisik: formData.catatanFisik,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menambah unit');

      showFeedback('success', `Unit ${data.serialNumber} berhasil diinput dengan status QC_PENDING & Draf Jurnal RESTOCK.`);
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Approve Unit (Owner Checker)
  const handleApprove = async (unitId: string) => {
    try {
      const res = await fetch(`/api/inventory/units/${unitId}/approve`, {
        method: 'POST',
        headers: { 'x-user-role': role },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyetujui unit');

      showFeedback('success', `Unit ${data.serialNumber} disetujui Owner! Status unit: ${data.status} & Jurnal Kas: POSTED.`);
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Reject Unit (Owner Checker)
  const handleReject = async (unitId: string) => {
    if (!confirm('Apakah Anda yakin ingin menolak & menghapus draf unit ini?')) return;
    try {
      const res = await fetch(`/api/inventory/units/${unitId}/reject`, {
        method: 'POST',
        headers: { 'x-user-role': role },
        body: JSON.stringify({ reason: 'Ditolak saat inspeksi fisik Owner' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menolak unit');

      showFeedback('success', data.message || 'Unit berhasil ditolak.');
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Open Upgrade Modal
  const openUpgradeModal = (unit: any) => {
    setSelectedUnit(unit);
    setUpgradeData({
      addedHppCost: '',
      newGrade: unit.grade || 'A',
      newStatus: 'AVAILABLE',
      isFisikNormal: unit.isFisikNormal,
      isMesinNormal: unit.isMesinNormal,
      isStorageNormal: unit.isStorageNormal,
      isSuhuNormal: unit.isSuhuNormal,
      isKeyboardNormal: unit.isKeyboardNormal,
      isTouchpadNormal: unit.isTouchpadNormal,
      isPortNormal: unit.isPortNormal,
      isWebcamNormal: unit.isWebcamNormal,
      catatanFisik: unit.catatanFisik || '',
    });
    setShowUpgradeModal(true);
  };

  // Submit Upgrade / Capitalization
  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    try {
      const res = await fetch(`/api/inventory/units/${selectedUnit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
        },
        body: JSON.stringify({
          addedHppCost: upgradeData.addedHppCost ? parseFloat(upgradeData.addedHppCost) : 0,
          grade: upgradeData.newGrade,
          status: upgradeData.newStatus,
          isFisikNormal: upgradeData.isFisikNormal,
          isMesinNormal: upgradeData.isMesinNormal,
          isStorageNormal: upgradeData.isStorageNormal,
          isSuhuNormal: upgradeData.isSuhuNormal,
          isKeyboardNormal: upgradeData.isKeyboardNormal,
          isTouchpadNormal: upgradeData.isTouchpadNormal,
          isPortNormal: upgradeData.isPortNormal,
          isWebcamNormal: upgradeData.isWebcamNormal,
          catatanFisik: upgradeData.catatanFisik,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memperbarui unit');

      showFeedback('success', `Unit ${data.serialNumber} berhasil di-upgrade!`);
      setShowUpgradeModal(false);
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // POS Checkout Simulation (Kasir)
  const handlePosCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posSn.trim()) {
      setPosFeedback({ type: 'error', message: 'Ketik atau scan Serial Number (SN) laptop terlebih dahulu!' });
      return;
    }

    setIsSubmittingPos(true);
    setPosFeedback(null);

    try {
      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
        },
        body: JSON.stringify({
          serialNumber: posSn.trim().toUpperCase(),
          paymentAccountCode: posAccountCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memproses transaksi kasir');

      setPosFeedback({
        type: 'success',
        message: data.message,
        details: data,
      });

      setPosSn('');
      fetchData();
    } catch (err: any) {
      setPosFeedback({ type: 'error', message: err.message || 'Kesalahan sistem' });
    } finally {
      setIsSubmittingPos(false);
    }
  };

  const resetForm = () => {
    setFormData({
      serialNumber: '',
      name: '',
      condition: 'SECOND',
      grade: 'B',
      hpp: '',
      price: '',
      paymentAccountCode: '110',
      isFisikNormal: true,
      isMesinNormal: true,
      isStorageNormal: true,
      isSuhuNormal: true,
      isKeyboardNormal: true,
      isTouchpadNormal: true,
      isPortNormal: true,
      isWebcamNormal: true,
      catatanFisik: '',
    });
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Filter Units
  const filteredUnits = units.filter((u) => {
    if (filterStatus !== 'ALL' && u.status !== filterStatus) return false;
    if (filterGrade !== 'ALL' && u.grade !== filterGrade) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        u.serialNumber.toLowerCase().includes(term) ||
        (u.productModel?.name && u.productModel.name.toLowerCase().includes(term)) ||
        (u.catatanFisik && u.catatanFisik.toLowerCase().includes(term))
      );
    }
    return true;
  });

  // Filter Models
  const filteredModels = models.filter((m) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return m.name.toLowerCase().includes(term) || m.sku.toLowerCase().includes(term);
    }
    return true;
  });

  // Calculate metrics
  const countModels = models.length;
  const countUnitsTotal = units.length;
  const countAvailable = units.filter((u) => u.status === 'AVAILABLE').length;
  const countPending = units.filter((u) => u.status === 'QC_PENDING').length;
  const countSold = units.filter((u) => u.status === 'SOLD').length;
  const totalHppAssets = units
    .filter((u) => u.status === 'AVAILABLE' || u.status === 'IN_REPAIR')
    .reduce((acc, u) => acc + Number(u.hpp), 0);

  return (
    <div className="flex min-h-screen bg-black text-white font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
        {/* NOTIFICATION FEEDBACK TOAST */}
      {apiFeedback && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl border shadow-2xl flex items-center gap-3 text-xs max-w-md animate-in slide-in-from-top-2 ${
            apiFeedback.type === 'success'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
              : 'bg-red-950 border-red-500 text-red-200'
          }`}
        >
          {apiFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{apiFeedback.message}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Laptop className="w-7 h-7 text-white" />
              Manajemen Inventaris Terpadu
            </h1>
            <Badge variant="outline" className="border-neutral-700 font-mono text-xs text-neutral-300">
              PRD SINGLE-HPP + QC
            </Badge>
          </div>
          <p className="text-xs text-neutral-400">
            Arsitektur Relasional: Katalog Induk (ProductModel) & Unit Fisik (ProductUnit 1-to-Many).
          </p>
        </div>

        {/* ROLE SWITCHER DEMO TOOLBAR */}
        <div className="flex items-center gap-2 bg-neutral-900/80 p-2 border border-neutral-800 rounded-xl">
          <span className="text-[11px] font-mono text-neutral-400 pl-2">Otorisasi Mode:</span>
          {(['OWNER', 'FINANCE', 'KASIR'] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                setUserName(r === 'OWNER' ? 'Dimas Owner' : r === 'FINANCE' ? 'Siti Keuangan' : 'Budi Kasir');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                role === r
                  ? 'bg-white text-black shadow-lg'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      {/* METRIC KPI CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-neutral-800 bg-neutral-950">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
              Total Katalog Model
              <Folder className="w-4 h-4 text-blue-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-blue-400">{countModels} Model</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-neutral-500">Katalog Induk (ProductModel)</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-950">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
              Total Unit Fisik
              <Layers className="w-4 h-4 text-neutral-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-white">{countUnitsTotal} Unit</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-neutral-500">SN Fisik (1-to-Many)</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-950">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
              Ready (AVAILABLE)
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-emerald-400">{countAvailable} Unit</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-neutral-500">Siap Jual di Kasir POS</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-950">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
              QC Pending (Perlu Approve)
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-yellow-400">{countPending} Unit</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-neutral-500">Butuh Approve Owner</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-950">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
              Nilai Aset Persediaan
              <DollarSign className="w-4 h-4 text-white" />
            </CardDescription>
            <CardTitle className="text-lg font-mono text-white truncate">{formatRupiah(totalHppAssets)}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-neutral-500">COA 130 Persediaan Barang</p>
          </CardContent>
        </Card>
      </section>

      {/* POS TERMINAL CHECKOUT SIMULATION SECTION (KASIR & DEMO) */}
      <section className="p-5 border border-neutral-800 bg-neutral-950 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              Terminal Penjualan Kasir (POS Checkout & Gatekeeper Validation)
            </h2>
            <p className="text-xs text-neutral-400">
              Sistem memvalidasi status SN secara ketat & menarik HPP mutlak dari unit fisik yang di-scan.
            </p>
          </div>
          <Badge variant="outline" className="border-emerald-500 text-emerald-400 font-mono text-xs">
            STRICT MARGIN AUTO-JOURNAL
          </Badge>
        </div>

        <form onSubmit={handlePosCheckout} className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1.5 w-full">
            <Label htmlFor="pos-sn-input" className="text-xs font-semibold text-neutral-300">
              Scan / Input Serial Number (SN) Unit Laptop:
            </Label>
            <div className="relative">
              <Input
                id="pos-sn-input"
                placeholder="Contoh: SN-THINKPAD-T14-001 atau SN-MACBOOK-AIR-002"
                value={posSn}
                onChange={(e) => setPosSn(e.target.value)}
                className="bg-black border-neutral-700 text-white font-mono text-sm uppercase pl-9"
              />
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
            </div>
          </div>

          <div className="w-full md:w-48 space-y-1.5">
            <Label htmlFor="pos-account-select" className="text-xs font-semibold text-neutral-300">
              Metode Pembayaran:
            </Label>
            <select
              id="pos-account-select"
              value={posAccountCode}
              onChange={(e) => setPosAccountCode(e.target.value)}
              className="w-full h-10 px-3 bg-black border border-neutral-700 rounded-md text-xs text-white"
            >
              <option value="110">110 - Kas Toko (Tunai)</option>
              <option value="120">120 - Bank BCA (Transfer)</option>
            </select>
          </div>

          <Button
            type="submit"
            disabled={isSubmittingPos}
            className="w-full md:w-auto h-10 bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-6"
          >
            {isSubmittingPos ? 'Memproses...' : 'Proses Jual (POS Checkout)'}
          </Button>
        </form>

        {posFeedback && (
          <div
            className={`p-4 rounded-lg border text-xs space-y-2 ${
              posFeedback.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                : 'bg-red-950/80 border-red-500 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {posFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              {posFeedback.message}
            </div>
            {posFeedback.details && (
              <div className="pt-2 border-t border-emerald-800/60 font-mono text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2 text-emerald-300">
                <div>• Serial Number: {posFeedback.details.unit.serialNumber}</div>
                <div>• Harga Jual Kasir: {formatRupiah(posFeedback.details.transaction.totalPrice)}</div>
                <div>• HPP Mutlak Unit: {formatRupiah(posFeedback.details.transaction.totalHpp)}</div>
                <div>• Margin Kotor: {formatRupiah(posFeedback.details.transaction.totalPrice - posFeedback.details.transaction.totalHpp)}</div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* VIEW MODE TOGGLE & MAIN TABLE */}
      <main className="space-y-4">
        {/* TOOLBAR & VIEW MODE SELECTOR */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-neutral-950 p-4 border border-neutral-800 rounded-xl">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* VIEW MODE TABS */}
            <div className="flex items-center bg-black border border-neutral-800 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('MODELS')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'MODELS'
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                Katalog Induk (Per Model Laptop)
              </button>
              <button
                onClick={() => setViewMode('UNITS')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'UNITS'
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Semua Unit Fisik (Global SN)
              </button>
            </div>

            {/* SEARCH */}
            <div className="relative w-full sm:w-56">
              <Input
                placeholder={viewMode === 'MODELS' ? 'Cari Model Laptop / SKU...' : 'Cari SN, Model, Catatan...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black border-neutral-800 text-xs pl-8 h-9"
              />
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
            </div>

            <Button variant="outline" size="sm" onClick={fetchData} className="h-9 border-neutral-800">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* ACTION BUTTON */}
          {role !== 'KASIR' ? (
            <Button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="w-full md:w-auto h-9 bg-white text-black hover:bg-neutral-200 font-bold text-xs"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              + Input Barang Masuk + QC Checklist
            </Button>
          ) : (
            <div className="text-xs text-neutral-500 font-mono flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Kasir (Read-Only Mode)
            </div>
          )}
        </div>

        {/* TAB 1: KATALOG INDUK TABLE (1 MODEL HAS MULTIPLE UNITS) */}
        {viewMode === 'MODELS' ? (
          <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-neutral-800 bg-neutral-900/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Folder className="w-4 h-4 text-blue-400" />
                  Katalog Induk Laptop (Product Models)
                </h3>
                <p className="text-xs text-neutral-400">
                  Klik "Lihat Unit Fisik (SN)" pada model laptop untuk membuka halaman khusus unit fisik model tersebut.
                </p>
              </div>
              <Badge variant="outline" className="border-blue-800 text-blue-400 font-mono text-xs">
                1-TO-MANY ARCHITECTURE
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/60 text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                    <th className="p-3.5">SKU & Kategori</th>
                    <th className="p-3.5">Nama Model Laptop</th>
                    <th className="p-3.5">Total Unit Stok</th>
                    <th className="p-3.5">Unit Available (Ready)</th>
                    <th className="p-3.5">Status QC Pending</th>
                    <th className="p-3.5 text-right">Aksi Penuh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-500 font-mono">
                        Memuat katalog induk laptop...
                      </td>
                    </tr>
                  ) : filteredModels.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-500 font-mono">
                        Tidak ada katalog model yang cocok dengan kata kunci.
                      </td>
                    </tr>
                  ) : (
                    filteredModels.map((model) => {
                      const modelUnits: any[] = model.units || [];
                      const totalUnits = model._count?.units || modelUnits.length;
                      const availUnits = modelUnits.filter((u: any) => u.status === 'AVAILABLE').length;
                      const pendingUnits = modelUnits.filter((u: any) => u.status === 'QC_PENDING').length;

                      return (
                        <tr key={model.id} className="hover:bg-neutral-900/40 transition">
                          <td className="p-3.5">
                            <div className="font-mono font-bold text-blue-400 text-xs">{model.sku}</div>
                            <span className="text-[10px] text-neutral-500 uppercase">{model.category}</span>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-white text-sm">{model.name}</div>
                          </td>

                          <td className="p-3.5 font-mono">
                            <Badge className="bg-neutral-800 text-white border-neutral-700">
                              {totalUnits} Unit Fisik
                            </Badge>
                          </td>

                          <td className="p-3.5 font-mono">
                            <span className="text-emerald-400 font-bold">{availUnits} Ready</span>
                          </td>

                          <td className="p-3.5 font-mono">
                            {pendingUnits > 0 ? (
                              <span className="text-yellow-400 font-bold">{pendingUnits} Pending QC</span>
                            ) : (
                              <span className="text-neutral-500">0 Pending</span>
                            )}
                          </td>

                          <td className="p-3.5 text-right">
                            <Link href={`/inventory/model/${model.id}`}>
                              <Button
                                size="sm"
                                className="h-8 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3"
                              >
                                Lihat {totalUnits} Unit Fisik (SN)
                                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 2: GLOBAL PHYSICAL UNITS TABLE */
          <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/60 text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                    <th className="p-3.5">Serial Number</th>
                    <th className="p-3.5">Nama Unit / Model</th>
                    <th className="p-3.5">Kondisi & Grade</th>
                    <th className="p-3.5">HPP Beli</th>
                    <th className="p-3.5">Harga Jual</th>
                    <th className="p-3.5">Hasil QC Checklist</th>
                    <th className="p-3.5">Status Unit</th>
                    <th className="p-3.5 text-right">Aksi & Otorisasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-neutral-500 font-mono">
                        Memuat daftar unit inventaris...
                      </td>
                    </tr>
                  ) : filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-neutral-500 font-mono">
                        Tidak ada data unit laptop yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((unit) => {
                      const allQcOk =
                        unit.isFisikNormal &&
                        unit.isMesinNormal &&
                        unit.isStorageNormal &&
                        unit.isSuhuNormal &&
                        unit.isKeyboardNormal &&
                        unit.isTouchpadNormal &&
                        unit.isPortNormal &&
                        unit.isWebcamNormal;

                      return (
                        <tr key={unit.id} className="hover:bg-neutral-900/40 transition">
                          <td className="p-3.5">
                            <div className="font-mono font-bold text-white text-sm">
                              {unit.serialNumber}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="text-neutral-200 font-medium">{unit.productModel?.name || unit.name}</div>
                            {unit.catatanFisik && (
                              <div className="text-[11px] text-amber-400/90 mt-0.5 italic line-clamp-1">
                                "{unit.catatanFisik}"
                              </div>
                            )}
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                                  unit.condition === 'NEW'
                                    ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                    : 'bg-purple-950 text-purple-400 border border-purple-800'
                                }`}
                              >
                                {unit.condition}
                              </span>
                              {unit.grade && (
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                                    unit.grade === 'A'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : unit.grade === 'B'
                                      ? 'bg-yellow-950 text-yellow-400 border border-yellow-800'
                                      : 'bg-red-950 text-red-400 border border-red-800'
                                  }`}
                                >
                                  GRADE {unit.grade}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5 font-mono">
                            <div className="text-white font-semibold text-xs">
                              {formatRupiah(Number(unit.hpp))}
                            </div>
                          </td>

                          <td className="p-3.5 font-mono">
                            <div className="text-emerald-400 font-semibold text-xs">
                              {formatRupiah(Number(unit.price))}
                            </div>
                          </td>

                          <td className="p-3.5">
                            {allQcOk ? (
                              <div className="flex items-center gap-1 text-emerald-400 font-mono text-[11px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                100% QC NORMAL
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-amber-400 font-mono text-[11px] font-bold">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  DEFEK TERDETEKSI:
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {!unit.isFisikNormal && <span className="px-1.5 py-0.2 bg-red-950 text-red-300 text-[9px] rounded border border-red-800">Fisik/Casing</span>}
                                  {!unit.isMesinNormal && <span className="px-1.5 py-0.2 bg-red-950 text-red-300 text-[9px] rounded border border-red-800">Mesin</span>}
                                  {!unit.isStorageNormal && <span className="px-1.5 py-0.2 bg-red-950 text-red-300 text-[9px] rounded border border-red-800">Storage</span>}
                                  {!unit.isSuhuNormal && <span className="px-1.5 py-0.2 bg-red-950 text-red-300 text-[9px] rounded border border-red-800">Suhu</span>}
                                  {!unit.isKeyboardNormal && <span className="px-1.5 py-0.2 bg-red-950 text-red-300 text-[9px] rounded border border-red-800">Keyboard</span>}
                                  {!unit.isTouchpadNormal && <span className="px-1.5 py-0.2 bg-red-950 text-red-300 text-[9px] rounded border border-red-800">Touchpad</span>}
                                  {!unit.isPortNormal && <span className="px-1.5 py-0.2 bg-red-950 text-red-300 text-[9px] rounded border border-red-800">Port</span>}
                                  {!unit.isWebcamNormal && <span className="px-1.5 py-0.2 bg-red-950 text-red-300 text-[9px] rounded border border-red-800">Webcam</span>}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="p-3.5">
                            {unit.status === 'QC_PENDING' && (
                              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-600 font-mono text-[10px]">
                                QC_PENDING
                              </Badge>
                            )}
                            {unit.status === 'AVAILABLE' && (
                              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-600 font-mono text-[10px]">
                                AVAILABLE
                              </Badge>
                            )}
                            {unit.status === 'IN_REPAIR' && (
                              <Badge className="bg-blue-500/20 text-blue-300 border-blue-600 font-mono text-[10px]">
                                IN_REPAIR
                              </Badge>
                            )}
                            {unit.status === 'SOLD' && (
                              <Badge className="bg-neutral-800 text-neutral-400 border-neutral-700 font-mono text-[10px]">
                                SOLD
                              </Badge>
                            )}
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {unit.status === 'QC_PENDING' && (
                                <>
                                  {role === 'OWNER' ? (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleApprove(unit.id)}
                                        className="h-7 bg-emerald-500 text-black hover:bg-emerald-400 text-[10px] font-bold px-2.5"
                                      >
                                        Approve QC
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleReject(unit.id)}
                                        className="h-7 border-red-800 text-red-400 hover:bg-red-950 text-[10px] px-2"
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-yellow-500 italic">Menunggu Owner</span>
                                  )}
                                </>
                              )}

                              {(unit.status === 'IN_REPAIR' || (unit.status === 'AVAILABLE' && unit.grade !== 'A')) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openUpgradeModal(unit)}
                                  className="h-7 border-blue-700 text-blue-300 hover:bg-blue-950 text-[10px] font-bold"
                                >
                                  <Wrench className="w-3 h-3 mr-1" /> Upgrade
                                </Button>
                              )}

                              {unit.status === 'AVAILABLE' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setPosSn(unit.serialNumber)}
                                  className="h-7 border-emerald-700 text-emerald-300 hover:bg-emerald-950 text-[10px]"
                                >
                                  Scan di POS
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL INPUT BARANG MASUK (FINANCE MAKER) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl w-full max-w-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-amber-400" />
                  Form Input Barang Masuk + Quality Control (QC)
                </h3>
                <p className="text-xs text-neutral-400">
                  Perlindungan Arus Kas: Data disimpan sebagai QC_PENDING & Draf Jurnal RESTOCK sampai disetujui Owner.
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-white" aria-label="Tutup modal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="input-sn" className="text-xs font-semibold text-neutral-300">
                    Serial Number (SN) * Wajib Scan / Unique:
                  </Label>
                  <Input
                    id="input-sn"
                    placeholder="Contoh: SN-THINKPAD-T14-999"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="bg-black border-neutral-800 text-xs font-mono uppercase"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="input-name" className="text-xs font-semibold text-neutral-300">
                    Nama Unit / Model Laptop *:
                  </Label>
                  <Input
                    id="input-name"
                    placeholder="Lenovo ThinkPad T14 / MacBook M1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-black border-neutral-800 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="input-condition" className="text-xs font-semibold text-neutral-300">Kondisi Barang:</Label>
                  <select
                    id="input-condition"
                    value={formData.condition}
                    onChange={(e) => {
                      const val = e.target.value as 'NEW' | 'SECOND';
                      setFormData((prev) => ({
                        ...prev,
                        condition: val,
                        ...(val === 'NEW'
                          ? {
                              grade: 'A',
                              isFisikNormal: true,
                              isMesinNormal: true,
                              isStorageNormal: true,
                              isSuhuNormal: true,
                              isKeyboardNormal: true,
                              isTouchpadNormal: true,
                              isPortNormal: true,
                              isWebcamNormal: true,
                            }
                          : {}),
                      }));
                    }}
                    className="w-full h-9 px-2 bg-black border border-neutral-800 rounded text-xs text-white"
                  >
                    <option value="SECOND">SECOND (Bekas Kulakan/Trade-in)</option>
                    <option value="NEW">BARU (Baru / Box Segel)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="input-grade" className="text-xs font-semibold text-neutral-300">Grade Fisik:</Label>
                  <select
                    id="input-grade"
                    value={formData.grade}
                    disabled={formData.condition === 'NEW'}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value as any })}
                    className="w-full h-9 px-2 bg-black border border-neutral-800 rounded text-xs text-white disabled:opacity-50"
                  >
                    <option value="A">Grade A (Mulus / Siap Jual)</option>
                    <option value="B">Grade B (Lecet Minor / Defek Ringan)</option>
                    <option value="C">Grade C (Perlu Perbaikan / Upgrade)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="input-hpp" className="text-xs font-semibold text-neutral-300">HPP Beli Awal (Rp) *:</Label>
                  <Input
                    id="input-hpp"
                    type="number"
                    placeholder="6500000"
                    value={formData.hpp}
                    onChange={(e) => setFormData({ ...formData, hpp: e.target.value })}
                    className="bg-black border-neutral-800 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="input-price" className="text-xs font-semibold text-neutral-300">Harga Jual Target (Rp) *:</Label>
                  <Input
                    id="input-price"
                    type="number"
                    placeholder="8200000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="bg-black border-neutral-800 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              {formData.condition === 'SECOND' && (
                <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-lg space-y-3">
                  <div className="text-xs font-bold text-white flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span>Checklist Quality Control (QC) Fisik & Fungsionalitas:</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isFisikNormal}
                        onChange={(e) => setFormData({ ...formData, isFisikNormal: e.target.checked })}
                        className="accent-emerald-500 rounded w-4 h-4"
                      />
                      <span>Fisik / Casing Mulus</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isMesinNormal}
                        onChange={(e) => setFormData({ ...formData, isMesinNormal: e.target.checked })}
                        className="accent-emerald-500 rounded w-4 h-4"
                      />
                      <span>Mesin Normal</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isStorageNormal}
                        onChange={(e) => setFormData({ ...formData, isStorageNormal: e.target.checked })}
                        className="accent-emerald-500 rounded w-4 h-4"
                      />
                      <span>Storage / SSD</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isSuhuNormal}
                        onChange={(e) => setFormData({ ...formData, isSuhuNormal: e.target.checked })}
                        className="accent-emerald-500 rounded w-4 h-4"
                      />
                      <span>Suhu Normal</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isKeyboardNormal}
                        onChange={(e) => setFormData({ ...formData, isKeyboardNormal: e.target.checked })}
                        className="accent-emerald-500 rounded w-4 h-4"
                      />
                      <span>Keyboard</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isTouchpadNormal}
                        onChange={(e) => setFormData({ ...formData, isTouchpadNormal: e.target.checked })}
                        className="accent-emerald-500 rounded w-4 h-4"
                      />
                      <span>Touchpad</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isPortNormal}
                        onChange={(e) => setFormData({ ...formData, isPortNormal: e.target.checked })}
                        className="accent-emerald-500 rounded w-4 h-4"
                      />
                      <span>Port I/O</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isWebcamNormal}
                        onChange={(e) => setFormData({ ...formData, isWebcamNormal: e.target.checked })}
                        className="accent-emerald-500 rounded w-4 h-4"
                      />
                      <span>Webcam & Mic</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="input-catatan" className="text-xs font-semibold text-neutral-300">
                  Catatan Fisik (Lokasi dent, baret, tombol mati, dll):
                </Label>
                <textarea
                  id="input-catatan"
                  rows={2}
                  placeholder="Contoh: Baret halus di top cover, tombol spasi agak keras."
                  value={formData.catatanFisik}
                  onChange={(e) => setFormData({ ...formData, catatanFisik: e.target.value })}
                  className="w-full p-2.5 bg-black border border-neutral-800 rounded-md text-xs text-white focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Batal
                </Button>
                <Button type="submit" className="bg-white text-black hover:bg-neutral-200 font-bold">
                  Simpan & Kirim Draf (QC Pending)
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UPGRADE / KAPITALISASI */}
      {showUpgradeModal && selectedUnit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-400" />
                Upgrade & Kapitalisasi Unit (SN: {selectedUnit.serialNumber})
              </h3>
              <button onClick={() => setShowUpgradeModal(false)} className="text-neutral-400 hover:text-white" aria-label="Tutup modal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpgradeSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-300">Biaya Upgrade Tambahan HPP (Rp):</Label>
                <Input
                  type="number"
                  placeholder="350000"
                  value={upgradeData.addedHppCost}
                  onChange={(e) => setUpgradeData({ ...upgradeData, addedHppCost: e.target.value })}
                  className="bg-black border-neutral-800 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-neutral-300">Grade Baru:</Label>
                  <select
                    value={upgradeData.newGrade}
                    onChange={(e) => setUpgradeData({ ...upgradeData, newGrade: e.target.value as any })}
                    className="w-full h-9 px-2 bg-black border border-neutral-800 rounded text-xs text-white"
                  >
                    <option value="A">Grade A (Mulus / Siap Jual)</option>
                    <option value="B">Grade B (Defek Ringan)</option>
                    <option value="C">Grade C (Perlu Sparepart)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-neutral-300">Status Baru:</Label>
                  <select
                    value={upgradeData.newStatus}
                    onChange={(e) => setUpgradeData({ ...upgradeData, newStatus: e.target.value as any })}
                    className="w-full h-9 px-2 bg-black border border-neutral-800 rounded text-xs text-white"
                  >
                    <option value="AVAILABLE">AVAILABLE (Siap Jual)</option>
                    <option value="IN_REPAIR">IN_REPAIR (Dalam Perbaikan)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <Button type="button" variant="outline" onClick={() => setShowUpgradeModal(false)}>
                  Batal
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold">
                  Simpan Upgrade
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
