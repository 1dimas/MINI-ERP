'use client';

import React, { useEffect, useState, use } from 'react';
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
  ArrowLeft,
  Wrench,
  Search,
  ShoppingCart,
  DollarSign,
  RefreshCw,
  Lock,
  X,
  Layers,
  Printer,
} from 'lucide-react';

export default function ModelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const modelId = resolvedParams.id;

  const [role, setRole] = useState<'OWNER' | 'FINANCE' | 'KASIR'>('OWNER');
  const [userName, setUserName] = useState<string>('Dimas Owner');
  const [modelData, setModelData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals state
  const [showAddUnitModal, setShowAddUnitModal] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  // Form state for adding unit to this specific model
  const [formData, setFormData] = useState({
    serialNumber: '',
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

  // Form state for upgrade
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
    fetchModel();
  }, [modelId, role]);

  const fetchModel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/model/${modelId}`);
      if (res.ok) {
        const data = await res.json();
        setModelData(data);
      } else {
        const err = await res.json();
        showFeedback('error', err.message || 'Gagal memuat katalog model');
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

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serialNumber || !formData.hpp || !formData.price) {
      showFeedback('error', 'Serial Number, HPP, dan Harga Jual wajib diisi!');
      return;
    }

    try {
      const res = await fetch('/api/inventory/unit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
          'x-user-name': userName,
        },
        body: JSON.stringify({
          productModelId: modelId,
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
      if (!res.ok) throw new Error(data.message || 'Gagal menambah unit fisik');

      showFeedback(
        'success',
        data.condition === 'NEW'
          ? `Unit ${data.serialNumber} (Laptop Baru) berhasil ditambahkan langsung dengan status AVAILABLE (Siap Jual) tanpa QC!`
          : `Unit ${data.serialNumber} berhasil diinput dengan status QC_PENDING.`
      );
      setShowAddUnitModal(false);
      resetForm();
      fetchModel();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleApprove = async (unitId: string) => {
    try {
      const res = await fetch(`/api/inventory/units/${unitId}/approve`, {
        method: 'POST',
        headers: { 'x-user-role': role },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyetujui unit');
      showFeedback('success', `Unit ${data.serialNumber} disetujui Owner! Status unit: ${data.status}.`);
      fetchModel();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleReject = async (unitId: string) => {
    if (!confirm('Apakah Anda yakin ingin menolak & menghapus unit fisik ini?')) return;
    try {
      const res = await fetch(`/api/inventory/units/${unitId}/reject`, {
        method: 'POST',
        headers: { 'x-user-role': role },
        body: JSON.stringify({ reason: 'Ditolak inspeksi Owner' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menolak unit');
      showFeedback('success', data.message || 'Unit berhasil ditolak.');
      fetchModel();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

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
      fetchModel();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      serialNumber: '',
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

  const units: any[] = modelData?.units || [];
  const filteredUnits = units.filter((u) => {
    if (role === 'KASIR' && u.status !== 'AVAILABLE') return false;
    if (filterStatus !== 'ALL' && u.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        u.serialNumber.toLowerCase().includes(term) ||
        (u.catatanFisik && u.catatanFisik.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const countAvailable = units.filter((u) => u.status === 'AVAILABLE').length;
  const countPending = units.filter((u) => u.status === 'QC_PENDING').length;
  const countRepair = units.filter((u) => u.status === 'IN_REPAIR').length;
  const countSold = units.filter((u) => u.status === 'SOLD').length;
  const totalHpp = units
    .filter((u) => u.status === 'AVAILABLE' || u.status === 'IN_REPAIR')
    .reduce((acc, u) => acc + Number(u.hpp), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3 font-mono">
          <RefreshCw className="w-8 h-8 animate-spin text-white mx-auto" />
          <p className="text-sm text-neutral-400">Memuat rincian unit fisik laptop model ini...</p>
        </div>
      </div>
    );
  }

  if (!modelData) {
    return (
      <div className="min-h-screen bg-black text-white p-6 space-y-4">
        <Link href="/inventory">
          <Button variant="outline" size="sm" className="border-neutral-800">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Katalog Induk
          </Button>
        </Link>
        <div className="p-8 border border-neutral-800 rounded-xl bg-neutral-950 text-center">
          <p className="text-neutral-400">Katalog Model tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
        {/* NOTIFICATION FEEDBACK TOAST */}
      {apiFeedback && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl border shadow-2xl flex items-center gap-3 text-xs max-w-md ${
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
        <div className="space-y-2">
          <Link href="/inventory" className="inline-flex items-center text-xs text-neutral-400 hover:text-white mb-1 transition">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Kembali ke Katalog Induk (Per Model)
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Laptop className="w-7 h-7 text-white" />
              {modelData.name}
            </h1>
            <Badge variant="outline" className="border-neutral-700 font-mono text-xs text-neutral-300">
              SKU: {modelData.sku}
            </Badge>
            {role === 'KASIR' && (
              <Link href="/pos">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs h-7 px-2.5">
                  <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Ke Kasir (POS)
                </Button>
              </Link>
            )}
          </div>
          <p className="text-xs text-neutral-400">
            Daftar Khusus Unit Fisik (Serial Number Specific) di bawah katalog model ini.
          </p>
        </div>
      </header>

      {/* METRIC KPI CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-neutral-800 bg-neutral-950">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
              Total Unit Terdaftar
              <Layers className="w-4 h-4 text-neutral-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-white">{units.length} Unit</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-neutral-500">Seluruh unit fisik SN model ini</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-950">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
              Ready Siap Jual (AVAILABLE)
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-emerald-400">{countAvailable} Unit</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-neutral-500">Unit siap dijual di kasir</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-950">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
              Draft Pending (QC_PENDING)
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
              Perbaikan / Upgrade
              <Wrench className="w-4 h-4 text-blue-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-blue-400">{countRepair} Unit</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-neutral-500">IN_REPAIR (Flipping value-add)</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-950">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
              Nilai Aset Persediaan
              <DollarSign className="w-4 h-4 text-white" />
            </CardDescription>
            <CardTitle className="text-lg font-mono text-white truncate">
              {role === 'KASIR' ? 'Rp *** (Khusus Finance/Owner)' : formatRupiah(totalHpp)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-neutral-500">
              {role === 'KASIR' ? 'Akses modal dirahasiakan untuk Kasir' : 'COA 130 Persediaan Barang'}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* UNITS TABLE TOOLBAR & LIST */}
      <main className="space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-neutral-950 p-4 border border-neutral-800 rounded-xl">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Input
                placeholder="Cari SN atau Catatan Fisik..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black border-neutral-800 text-xs pl-8 h-9"
              />
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 px-2 bg-black border border-neutral-800 rounded text-xs text-neutral-300"
            >
              <option value="ALL">Semua Status Unit</option>
              <option value="QC_PENDING">QC Pending</option>
              <option value="AVAILABLE">Available (Siap Jual)</option>
              <option value="IN_REPAIR">In Repair</option>
              <option value="SOLD">Sold Out</option>
            </select>

            <Button variant="outline" size="sm" onClick={fetchModel} className="h-9 border-neutral-800">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {role !== 'KASIR' ? (
            <Button
              onClick={() => {
                resetForm();
                setShowAddUnitModal(true);
              }}
              className="w-full md:w-auto h-9 bg-white text-black hover:bg-neutral-200 font-bold text-xs"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              + Input Unit Fisik (SN Baru) Untuk Model Ini
            </Button>
          ) : (
            <div className="text-xs text-neutral-500 font-mono flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Kasir (Read-Only Mode)
            </div>
          )}
        </div>

        {/* DEDICATED PHYSICAL UNITS TABLE */}
        <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/60 text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  <th className="p-3.5">Serial Number (SN)</th>
                  <th className="p-3.5">Kondisi & Grade</th>
                  {role !== 'KASIR' && <th className="p-3.5">HPP Beli</th>}
                  <th className="p-3.5">Harga Jual</th>
                  <th className="p-3.5">Hasil QC Checklist</th>
                  <th className="p-3.5">Status Unit</th>
                  <th className="p-3.5 text-right">Aksi & Otorisasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 text-xs">
                {filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan={role !== 'KASIR' ? 7 : 6} className="p-8 text-center text-neutral-500 font-mono">
                      Belum ada unit fisik (SN) yang terdaftar di bawah model laptop ini.
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
                        {/* SERIAL NUMBER */}
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-white text-sm">
                            {unit.serialNumber}
                          </div>
                          {unit.catatanFisik && (
                            <div className="text-[11px] text-amber-400/90 mt-0.5 italic line-clamp-1">
                              "{unit.catatanFisik}"
                            </div>
                          )}
                        </td>

                        {/* KONDISI & GRADE */}
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

                        {/* HPP BELI */}
                        {role !== 'KASIR' && (
                          <td className="p-3.5 font-mono text-white font-semibold">
                            {formatRupiah(Number(unit.hpp))}
                          </td>
                        )}

                        {/* HARGA JUAL */}
                        <td className="p-3.5 font-mono text-emerald-400 font-semibold">
                          {formatRupiah(Number(unit.price))}
                        </td>

                        {/* QC CHECKLIST */}
                        <td className="p-3.5">
                          {allQcOk ? (
                            <div className="flex items-center gap-1 text-emerald-400 font-mono text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              100% QC NORMAL
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-amber-400 font-mono text-[11px] font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" /> DEFEK TERDETEKSI:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {!unit.isFisikNormal && <span className="px-1.5 py-0.2 bg-red-950 text-red-300 text-[9px] rounded border border-red-800">Fisik</span>}
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

                        {/* STATUS UNIT */}
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

                        {/* AKSI */}
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

                            {role !== 'KASIR' && (unit.status === 'IN_REPAIR' || (unit.status === 'AVAILABLE' && unit.grade !== 'A')) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openUpgradeModal(unit)}
                                className="h-7 border-blue-700 text-blue-300 hover:bg-blue-950 text-[10px] font-bold"
                              >
                                <Wrench className="w-3 h-3 mr-1" /> Upgrade
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open('/print/barcode/' + encodeURIComponent(unit.serialNumber), '_blank')}
                              title="Cetak Stiker Barcode Thermal (50x30mm)"
                              className="h-7 border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 text-[10px] px-2 flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3 text-neutral-300" />
                              <span>Print Barcode</span>
                            </Button>
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
      </main>

      {/* MODAL INPUT UNIT FISIK BARU UNTUK MODEL INI */}
      {showAddUnitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl w-full max-w-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-amber-400" />
                  Tambah Unit Fisik Baru: {modelData.name}
                </h3>
                <p className="text-xs text-neutral-400">
                  Unit fisik baru akan didaftarkan di bawah SKU {modelData.sku}.
                </p>
              </div>
              <button onClick={() => setShowAddUnitModal(false)} className="text-neutral-400 hover:text-white" aria-label="Tutup modal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="unit-sn" className="text-xs font-semibold text-neutral-300">
                  Serial Number (SN) * Wajib Scan / Unique:
                </Label>
                <Input
                  id="unit-sn"
                  placeholder="Contoh: SN-THINKPAD-T14-099"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="bg-black border-neutral-800 text-xs font-mono uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="unit-cond" className="text-xs font-semibold text-neutral-300">Kondisi Barang:</Label>
                  <select
                    id="unit-cond"
                    value={formData.condition}
                    onChange={(e) => {
                      const val = e.target.value as 'NEW' | 'SECOND';
                      setFormData((prev) => ({
                        ...prev,
                        condition: val,
                        ...(val === 'NEW' ? {
                          grade: 'A',
                          isFisikNormal: true,
                          isMesinNormal: true,
                          isStorageNormal: true,
                          isSuhuNormal: true,
                          isKeyboardNormal: true,
                          isTouchpadNormal: true,
                          isPortNormal: true,
                          isWebcamNormal: true,
                        } : {})
                      }));
                    }}
                    className="w-full h-9 px-2 bg-black border border-neutral-800 rounded text-xs text-white"
                  >
                    <option value="SECOND">SECOND (Bekas Kulakan/Trade-in)</option>
                    <option value="NEW">BARU (Baru / Box Segel)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="unit-grd" className="text-xs font-semibold text-neutral-300">Grade Fisik:</Label>
                  <select
                    id="unit-grd"
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
                  <Label htmlFor="unit-hpp" className="text-xs font-semibold text-neutral-300">HPP Beli (Rp) *:</Label>
                  <Input
                    id="unit-hpp"
                    type="number"
                    placeholder="6500000"
                    value={formData.hpp}
                    onChange={(e) => setFormData({ ...formData, hpp: e.target.value })}
                    className="bg-black border-neutral-800 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="unit-prc" className="text-xs font-semibold text-neutral-300">Harga Jual Target (Rp) *:</Label>
                  <Input
                    id="unit-prc"
                    type="number"
                    placeholder="8200000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="bg-black border-neutral-800 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              {formData.condition === 'NEW' ? (
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-white block font-sans">Unit Baru (BNIB - Bypass QC)</strong>
                    <span className="text-[11px] text-emerald-300/90 leading-relaxed">
                      Laptop baru tidak memerlukan checklist inspeksi fisik atau antrean QC. Unit akan otomatis berstatus <strong>AVAILABLE</strong> dan langsung siap dijual di kasir POS.
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-lg space-y-3">
                    <div className="text-xs font-bold text-white flex items-center justify-between border-b border-neutral-800 pb-2">
                      <span>Checklist QC Fisik & Fungsionalitas:</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isFisikNormal}
                          onChange={(e) => setFormData({ ...formData, isFisikNormal: e.target.checked })}
                          className="accent-emerald-500 rounded w-4 h-4"
                        />
                        <span>Fisik Mulus</span>
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
                        <span>Storage SSD</span>
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

                  <div className="space-y-1">
                    <Label htmlFor="unit-notes" className="text-xs font-semibold text-neutral-300">Catatan Fisik:</Label>
                    <textarea
                      id="unit-notes"
                      rows={2}
                      placeholder="Contoh: Lecet halus di top cover"
                      value={formData.catatanFisik}
                      onChange={(e) => setFormData({ ...formData, catatanFisik: e.target.value })}
                      className="w-full p-2.5 bg-black border border-neutral-800 rounded-md text-xs text-white focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <Button type="button" variant="outline" onClick={() => setShowAddUnitModal(false)}>
                  Batal
                </Button>
                <Button type="submit" className="bg-white text-black hover:bg-neutral-200 font-bold">
                  Simpan Unit Fisik
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPGRADE MODAL */}
      {showUpgradeModal && selectedUnit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-400" />
                Upgrade & Kapitalisasi: {selectedUnit.serialNumber}
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
                    <option value="A">Grade A (Mulus)</option>
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
