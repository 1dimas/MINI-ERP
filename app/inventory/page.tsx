'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
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
  ShoppingCart,
  DollarSign,
  RefreshCw,
  X,
  Layers,
  Folder,
  Copy,
  Check,
  Edit,
  Receipt,
  BadgeCheck,
  Clock,
  ArrowRight,
  Boxes,
} from 'lucide-react';

function InventoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [role, setRole] = useState<'OWNER' | 'FINANCE' | 'KASIR'>('KASIR');
  const [userName, setUserName] = useState<string>('Pengguna');

  // Sub-tab query sync
  const tabParam = searchParams.get('tab');
  const statusParam = searchParams.get('status');

  const [activeTab, setActiveTab] = useState<'models' | 'units' | 'qc' | 'purchases'>(
    tabParam === 'units'
      ? 'units'
      : tabParam === 'qc'
      ? 'qc'
      : tabParam === 'purchases'
      ? 'purchases'
      : 'models'
  );

  const [units, setUnits] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>(statusParam || 'ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedSn, setCopiedSn] = useState<string | null>(null);

  // Modals state
  const [showAddModelModal, setShowAddModelModal] = useState<boolean>(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState<boolean>(false);
  const [showEditUnitModal, setShowEditUnitModal] = useState<boolean>(false);
  const [showEditPurchaseModal, setShowEditPurchaseModal] = useState<boolean>(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  // Form states for Add Model
  const [modelFormData, setModelFormData] = useState({
    sku: '',
    name: '',
    category: 'LAPTOP',
  });

  // Form states for Add Unit (Restock)
  const [unitFormData, setUnitFormData] = useState({
    productModelId: '',
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

  // Form states for Edit Unit
  const [editUnitData, setEditUnitData] = useState({
    serialNumber: '',
    condition: 'SECOND',
    grade: 'B',
    hpp: '',
    price: '',
    status: 'AVAILABLE',
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

  // Form states for Edit Purchase
  const [editPurchaseData, setEditPurchaseData] = useState({
    hpp: '',
    keterangan: '',
    paymentAccountCode: '110',
    tanggal: '',
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
  }, []);

  useEffect(() => {
    if (tabParam) {
      if (tabParam === 'units') setActiveTab('units');
      else if (tabParam === 'qc') setActiveTab('qc');
      else if (tabParam === 'purchases') setActiveTab('purchases');
      else setActiveTab('models');
    }
    if (statusParam) {
      setFilterStatus(statusParam);
    }
  }, [tabParam, statusParam]);

  useEffect(() => {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSn(text);
    setTimeout(() => setCopiedSn(null), 2000);
  };

  const formatRupiah = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  // Submit New Model
  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelFormData.sku || !modelFormData.name) {
      showFeedback('error', 'SKU dan Nama Model wajib diisi!');
      return;
    }

    try {
      const res = await fetch('/api/inventory/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelFormData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menambah model');

      showFeedback('success', `Model ${data.name} berhasil ditambahkan!`);
      setShowAddModelModal(false);
      setModelFormData({ sku: '', name: '', category: 'LAPTOP' });
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Submit New Unit
  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitFormData.serialNumber || !unitFormData.hpp || !unitFormData.price) {
      showFeedback('error', 'Serial Number, HPP, dan Harga Jual wajib diisi!');
      return;
    }

    try {
      const res = await fetch('/api/inventory/unit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
        },
        body: JSON.stringify({
          ...unitFormData,
          hpp: parseFloat(unitFormData.hpp),
          price: parseFloat(unitFormData.price),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan unit');

      showFeedback('success', `Unit ${data.serialNumber} berhasil disimpan!`);
      setShowAddUnitModal(false);
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Open Edit Unit Modal
  const openEditUnit = (unit: any) => {
    setSelectedUnit(unit);
    setEditUnitData({
      serialNumber: unit.serialNumber,
      condition: unit.condition || 'SECOND',
      grade: unit.grade || 'B',
      hpp: unit.hpp !== null && unit.hpp !== undefined ? String(unit.hpp) : '',
      price: String(unit.price),
      status: unit.status,
      isFisikNormal: unit.isFisikNormal ?? true,
      isMesinNormal: unit.isMesinNormal ?? true,
      isStorageNormal: unit.isStorageNormal ?? true,
      isSuhuNormal: unit.isSuhuNormal ?? true,
      isKeyboardNormal: unit.isKeyboardNormal ?? true,
      isTouchpadNormal: unit.isTouchpadNormal ?? true,
      isPortNormal: unit.isPortNormal ?? true,
      isWebcamNormal: unit.isWebcamNormal ?? true,
      catatanFisik: unit.catatanFisik || '',
    });
    setShowEditUnitModal(true);
  };

  // Submit Edit Unit
  const handleEditUnitSubmit = async (e: React.FormEvent) => {
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
          serialNumber: editUnitData.serialNumber,
          condition: editUnitData.condition,
          grade: editUnitData.condition === 'NEW' ? null : editUnitData.grade,
          hpp: editUnitData.hpp ? parseFloat(editUnitData.hpp) : undefined,
          price: parseFloat(editUnitData.price),
          status: editUnitData.status,
          isFisikNormal: editUnitData.isFisikNormal,
          isMesinNormal: editUnitData.isMesinNormal,
          isStorageNormal: editUnitData.isStorageNormal,
          isSuhuNormal: editUnitData.isSuhuNormal,
          isKeyboardNormal: editUnitData.isKeyboardNormal,
          isTouchpadNormal: editUnitData.isTouchpadNormal,
          isPortNormal: editUnitData.isPortNormal,
          isWebcamNormal: editUnitData.isWebcamNormal,
          catatanFisik: editUnitData.catatanFisik,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memperbarui unit');

      showFeedback('success', `Data unit ${data.serialNumber} berhasil diperbarui!`);
      setShowEditUnitModal(false);
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Open Edit Purchase Modal
  const openEditPurchase = (unit: any) => {
    setSelectedUnit(unit);
    const pj = unit.purchaseJournal;
    const creditLine = pj?.lines?.find((l: any) => l.side === 'KREDIT');
    setEditPurchaseData({
      hpp: unit.hpp !== null && unit.hpp !== undefined ? String(unit.hpp) : String(pj?.total || 0),
      keterangan: pj?.keterangan || `Pembelian ${unit.productModel?.name || 'Unit'} (SN: ${unit.serialNumber})`,
      paymentAccountCode: creditLine?.accountCode || '110',
      tanggal: pj?.tanggal ? new Date(pj.tanggal).toISOString().split('T')[0] : '',
    });
    setShowEditPurchaseModal(true);
  };

  // Submit Edit Purchase
  const handleEditPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;

    try {
      const res = await fetch(`/api/inventory/purchases/${selectedUnit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
        },
        body: JSON.stringify({
          hpp: parseFloat(editPurchaseData.hpp),
          keterangan: editPurchaseData.keterangan,
          paymentAccountCode: editPurchaseData.paymentAccountCode,
          tanggal: editPurchaseData.tanggal ? editPurchaseData.tanggal : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memperbarui riwayat pembelian');

      showFeedback('success', 'Riwayat pembelian & jurnal terkait berhasil diperbarui!');
      setShowEditPurchaseModal(false);
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Owner Approve / Reject QC
  const handleApprove = async (unitId: string) => {
    try {
      const res = await fetch(`/api/inventory/units/${unitId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyetujui unit');

      showFeedback('success', `Unit ${data.serialNumber} disetujui & siap dijual di Kasir!`);
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleReject = async (unitId: string) => {
    const reason = window.prompt('Masukkan alasan penolakan inspeksi QC:');
    if (reason === null) return;

    try {
      const res = await fetch(`/api/inventory/units/${unitId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
        },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menolak unit');

      showFeedback('success', data.message || 'Unit berhasil ditolak.');
      fetchData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // Filter logic
  const filteredUnits = units.filter((u) => {
    const matchStatus = filterStatus === 'ALL' || u.status === filterStatus;
    const matchGrade = filterGrade === 'ALL' || u.grade === filterGrade;
    const matchSearch =
      searchTerm === '' ||
      u.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.productModel?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.productModel?.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchGrade && matchSearch;
  });

  const countAvailable = units.filter((u) => u.status === 'AVAILABLE').length;
  const countPending = units.filter((u) => u.status === 'QC_PENDING').length;
  const countRepair = units.filter((u) => u.status === 'IN_REPAIR').length;
  const countSold = units.filter((u) => u.status === 'SOLD').length;
  const countUnitsTotal = units.length;
  const countModels = models.length;

  const totalHppAssets = units
    .filter((u) => u.status !== 'SOLD' && u.hpp !== null && u.hpp !== undefined)
    .reduce((sum, u) => sum + Number(u.hpp || 0), 0);

  // =========================================================================
  // VIEW KHUSUS ROLE KASIR: CEK KETERSEDIAAN STOK (BERSIH & RAMAH KASIR)
  // =========================================================================
  if (role === 'KASIR') {
    return (
      <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
        <Sidebar />

        <div className="flex-1 min-w-0 p-6 lg:p-8 space-y-6 overflow-y-auto">
          {/* TOAST FEEDBACK */}
          {apiFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                apiFeedback.type === 'success'
                  ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                  : 'bg-red-950 border-red-600 text-red-300'
              }`}
            >
              {apiFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span>{apiFeedback.message}</span>
            </div>
          )}

          {/* HEADER KASIR */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">Cek Ketersediaan Stok Laptop</h1>
                  <p className="text-xs text-neutral-400">
                    Katalog stok fisik laptop toko. Pantau unit yang Siap Jual (Ready) dan unit yang masih Pending QC.
                  </p>
                </div>
              </div>
            </div>

            <Link href="/pos">
              <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-9 px-4 gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer">
                <ShoppingCart className="w-4 h-4" />
                <span>Buka Terminal Kasir (POS)</span>
              </Button>
            </Link>
          </header>

          {/* KPI CARDS KHUSUS KASIR */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card
              onClick={() => setFilterStatus('AVAILABLE')}
              className={`border-neutral-800 bg-neutral-950 cursor-pointer transition hover:border-emerald-700/60 ${
                filterStatus === 'AVAILABLE' ? 'ring-1 ring-emerald-500 border-emerald-600' : ''
              }`}
            >
              <CardHeader className="p-3.5 pb-1">
                <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                  <span>Siap Jual (Ready)</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </CardDescription>
                <CardTitle className="text-2xl font-mono text-emerald-400">{countAvailable} Unit</CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-0">
                <p className="text-[10px] text-neutral-500">Bisa langsung di-scan di kasir</p>
              </CardContent>
            </Card>

            <Card
              onClick={() => setFilterStatus('QC_PENDING')}
              className={`border-neutral-800 bg-neutral-950 cursor-pointer transition hover:border-yellow-700/60 ${
                filterStatus === 'QC_PENDING' ? 'ring-1 ring-yellow-500 border-yellow-600' : ''
              }`}
            >
              <CardHeader className="p-3.5 pb-1">
                <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                  <span>Menunggu QC</span>
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                </CardDescription>
                <CardTitle className="text-2xl font-mono text-yellow-400">{countPending} Unit</CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-0">
                <p className="text-[10px] text-neutral-500">Pending approval Owner</p>
              </CardContent>
            </Card>

            <Card
              onClick={() => setFilterStatus('IN_REPAIR')}
              className={`border-neutral-800 bg-neutral-950 cursor-pointer transition hover:border-orange-700/60 ${
                filterStatus === 'IN_REPAIR' ? 'ring-1 ring-orange-500 border-orange-600' : ''
              }`}
            >
              <CardHeader className="p-3.5 pb-1">
                <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                  <span>Dalam Servis</span>
                  <Clock className="w-4 h-4 text-orange-400" />
                </CardDescription>
                <CardTitle className="text-2xl font-mono text-orange-400">{countRepair} Unit</CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-0">
                <p className="text-[10px] text-neutral-500">Sedang perbaikan teknisi</p>
              </CardContent>
            </Card>

            <Card
              onClick={() => setFilterStatus('ALL')}
              className={`border-neutral-800 bg-neutral-950 cursor-pointer transition hover:border-blue-700/60 ${
                filterStatus === 'ALL' ? 'ring-1 ring-blue-500 border-blue-600' : ''
              }`}
            >
              <CardHeader className="p-3.5 pb-1">
                <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                  <span>Total Model</span>
                  <Folder className="w-4 h-4 text-blue-400" />
                </CardDescription>
                <CardTitle className="text-2xl font-mono text-white">{countModels} Model</CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-0">
                <p className="text-[10px] text-neutral-500">{countUnitsTotal} Total unit fisik</p>
              </CardContent>
            </Card>
          </section>

          {/* FILTER & SEARCH BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {[
                { label: 'Semua Stok', val: 'ALL' },
                { label: `Ready (${countAvailable})`, val: 'AVAILABLE' },
                { label: `Pending QC (${countPending})`, val: 'QC_PENDING' },
                { label: `Servis (${countRepair})`, val: 'IN_REPAIR' },
                { label: `Terjual (${countSold})`, val: 'SOLD' },
              ].map((tab) => (
                <button
                  key={tab.val}
                  onClick={() => setFilterStatus(tab.val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
                    filterStatus === tab.val
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <Input
                placeholder="Cari Laptop / Serial Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-black border-neutral-800 text-white placeholder:text-neutral-600 rounded-lg"
              />
            </div>
          </div>

          {/* TABLE STOK BARANG UNTUK KASIR */}
          <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/60 text-neutral-400 font-mono">
                    <th className="p-3.5">Serial Number (SN)</th>
                    <th className="p-3.5">Model Laptop</th>
                    <th className="p-3.5">Kondisi / Grade</th>
                    <th className="p-3.5">Status Ketersediaan</th>
                    <th className="p-3.5 text-right">Harga Jual</th>
                    <th className="p-3.5">Catatan QC</th>
                    <th className="p-3.5 text-center">Aksi Kasir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-neutral-500 font-mono">
                        Memuat ketersediaan stok laptop...
                      </td>
                    </tr>
                  ) : filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-neutral-500 font-mono">
                        Tidak ada unit laptop yang sesuai kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((u) => {
                      const isReady = u.status === 'AVAILABLE';
                      const isPending = u.status === 'QC_PENDING';
                      const isRepair = u.status === 'IN_REPAIR';

                      return (
                        <tr key={u.id} className="hover:bg-neutral-900/50 transition">
                          {/* SN */}
                          <td className="p-3.5 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white">{u.serialNumber}</span>
                              <button
                                onClick={() => copyToClipboard(u.serialNumber)}
                                title="Salin SN"
                                className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white cursor-pointer"
                              >
                                {copiedSn === u.serialNumber ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Model */}
                          <td className="p-3.5">
                            <p className="font-semibold text-white">{u.productModel?.name || 'Laptop'}</p>
                            <p className="text-[10px] font-mono text-neutral-400">{u.productModel?.sku}</p>
                          </td>

                          {/* Kondisi */}
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-900 border border-neutral-700 text-neutral-300">
                              {u.condition} {u.grade ? `(Grade ${u.grade})` : ''}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-3.5">
                            {isReady ? (
                              <Badge className="bg-emerald-950 text-emerald-300 border-emerald-600/80 font-mono text-[10px]">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> READY / SIAP JUAL
                              </Badge>
                            ) : isPending ? (
                              <Badge className="bg-yellow-950 text-yellow-300 border-yellow-600/80 font-mono text-[10px]">
                                <AlertTriangle className="w-3 h-3 mr-1" /> PENDING QC OWNER
                              </Badge>
                            ) : isRepair ? (
                              <Badge className="bg-orange-950 text-orange-300 border-orange-600/80 font-mono text-[10px]">
                                <Clock className="w-3 h-3 mr-1" /> DALAM SERVIS
                              </Badge>
                            ) : (
                              <Badge className="bg-neutral-900 text-neutral-400 border-neutral-700 font-mono text-[10px]">
                                TERJUAL
                              </Badge>
                            )}
                          </td>

                          {/* Harga Jual */}
                          <td className="p-3.5 text-right font-mono font-bold text-white text-sm">
                            {formatRupiah(u.price)}
                          </td>

                          {/* Catatan QC */}
                          <td className="p-3.5 max-w-[200px] truncate text-neutral-400">
                            {u.catatanFisik ? (
                              <span title={u.catatanFisik}>{u.catatanFisik}</span>
                            ) : (
                              <span className="text-neutral-600 italic">Normal</span>
                            )}
                          </td>

                          {/* Aksi Kasir */}
                          <td className="p-3.5 text-center">
                            {isReady ? (
                              <Link href={`/pos`}>
                                <Button
                                  size="sm"
                                  onClick={() => copyToClipboard(u.serialNumber)}
                                  className="h-7 text-[11px] bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-3 gap-1 cursor-pointer"
                                >
                                  <span>Jual (POS)</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Button>
                              </Link>
                            ) : (
                              <span className="text-[10px] text-neutral-500 font-mono">Belum Siap Jual</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW UNTUK ROLE FINANCE & OWNER (MANAGEMENT, EDIT STOK & RIWAYAT PEMBELIAN)
  // =========================================================================
  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 min-w-0 p-6 lg:p-8 space-y-6 overflow-y-auto">
        {/* TOAST FEEDBACK */}
        {apiFeedback && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              apiFeedback.type === 'success'
                ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                : 'bg-red-950 border-red-600 text-red-300'
            }`}
          >
            {apiFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{apiFeedback.message}</span>
          </div>
        )}

        {/* HEADER UTAMA FINANCE & OWNER */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white text-black rounded-lg">
                <Boxes className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">Manajemen Inventaris & Pengadaan</h1>
                <p className="text-xs text-neutral-400">
                  Katalog Induk, Stok Unit Fisik (SN), Riwayat Pembelian & Restock, dan Verifikasi QC.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowAddModelModal(true)}
              variant="outline"
              size="sm"
              className="border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>+ Model Laptop</span>
            </Button>

            <Button
              onClick={() => setShowAddUnitModal(true)}
              size="sm"
              className="bg-white hover:bg-neutral-200 text-black text-xs font-bold gap-1.5 cursor-pointer shadow"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Restock Unit Fisik</span>
            </Button>
          </div>
        </header>

        {/* METRIC KPI CARDS */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-neutral-800 bg-neutral-950">
            <CardHeader className="p-3.5 pb-1">
              <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                <span>Total Model</span>
                <Folder className="w-4 h-4 text-blue-400" />
              </CardDescription>
              <CardTitle className="text-xl font-mono text-white">{countModels} Model</CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <p className="text-[10px] text-neutral-500">Katalog Induk</p>
            </CardContent>
          </Card>

          <Card className="border-neutral-800 bg-neutral-950">
            <CardHeader className="p-3.5 pb-1">
              <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                <span>Unit Fisik</span>
                <Layers className="w-4 h-4 text-neutral-400" />
              </CardDescription>
              <CardTitle className="text-xl font-mono text-white">{countUnitsTotal} Unit</CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <p className="text-[10px] text-neutral-500">SN terdaftar</p>
            </CardContent>
          </Card>

          <Card className="border-neutral-800 bg-neutral-950">
            <CardHeader className="p-3.5 pb-1">
              <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                <span>Ready (POS)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </CardDescription>
              <CardTitle className="text-xl font-mono text-emerald-400">{countAvailable} Unit</CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <p className="text-[10px] text-neutral-500">Siap transaksi</p>
            </CardContent>
          </Card>

          <Card className="border-neutral-800 bg-neutral-950">
            <CardHeader className="p-3.5 pb-1">
              <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                <span>QC Pending</span>
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              </CardDescription>
              <CardTitle className="text-xl font-mono text-yellow-400">{countPending} Unit</CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <p className="text-[10px] text-neutral-500">Butuh Approve Owner</p>
            </CardContent>
          </Card>

          <Card className="border-neutral-800 bg-neutral-950 col-span-2 md:col-span-1">
            <CardHeader className="p-3.5 pb-1">
              <CardDescription className="text-xs text-neutral-400 flex items-center justify-between">
                <span>Nilai Persediaan</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </CardDescription>
              <CardTitle className="text-lg font-mono text-white truncate">
                {formatRupiah(totalHppAssets)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <p className="text-[10px] text-neutral-500">COA 130 Persediaan</p>
            </CardContent>
          </Card>
        </section>

        {/* SUB-TABS NAVIGASI INVENTARIS */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            <button
              onClick={() => setActiveTab('models')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'models'
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Katalog Induk ({countModels})</span>
            </button>

            <button
              onClick={() => setActiveTab('units')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'units'
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Stok Unit Fisik & Edit ({countUnitsTotal})</span>
            </button>

            <button
              onClick={() => setActiveTab('qc')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'qc'
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <BadgeCheck className="w-3.5 h-3.5" />
              <span>QC & Approval</span>
              {countPending > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] rounded bg-yellow-500/20 text-yellow-300 font-mono border border-yellow-500/30">
                  {countPending}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'purchases'
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Riwayat Pembelian & Edit</span>
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
            <Input
              placeholder="Cari SKU / Model / SN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-black border-neutral-800 text-white rounded-lg"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: KATALOG INDUK (MODELS)                                            */}
        {/* ========================================================================= */}
        {activeTab === 'models' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models
              .filter(
                (m) =>
                  !searchTerm ||
                  m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  m.sku.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((model) => {
                const modelUnits = units.filter((u) => u.productModelId === model.id);
                const readyUnits = modelUnits.filter((u) => u.status === 'AVAILABLE');
                const pendingUnits = modelUnits.filter((u) => u.status === 'QC_PENDING');

                return (
                  <Card key={model.id} className="border-neutral-800 bg-neutral-950 flex flex-col justify-between">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="font-mono text-[10px] border-neutral-700 text-neutral-300">
                            {model.sku}
                          </Badge>
                          <CardTitle className="text-base font-bold text-white mt-1.5">{model.name}</CardTitle>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/60 text-blue-300 border border-blue-800">
                          {model.category}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      <div className="grid grid-cols-3 gap-2 p-2 bg-neutral-900/60 border border-neutral-800/80 rounded-lg text-center font-mono">
                        <div>
                          <p className="text-[10px] text-neutral-500">Total</p>
                          <p className="text-xs font-bold text-white">{modelUnits.length}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-emerald-500">Ready</p>
                          <p className="text-xs font-bold text-emerald-400">{readyUnits.length}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-yellow-500">QC</p>
                          <p className="text-xs font-bold text-yellow-400">{pendingUnits.length}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <Link href={`/inventory/model/${model.id}`} className="w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-neutral-700 bg-neutral-900 hover:bg-white hover:text-black text-xs font-semibold cursor-pointer"
                          >
                            <span>Lihat Semua Unit ({modelUnits.length})</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SEMUA UNIT FISIK (EDIT STOK)                                      */}
        {/* ========================================================================= */}
        {activeTab === 'units' && (
          <div className="space-y-4">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {[
                { label: 'Semua Status', val: 'ALL' },
                { label: 'Ready (AVAILABLE)', val: 'AVAILABLE' },
                { label: 'Pending QC', val: 'QC_PENDING' },
                { label: 'Dalam Servis', val: 'IN_REPAIR' },
                { label: 'Terjual (SOLD)', val: 'SOLD' },
              ].map((pill) => (
                <button
                  key={pill.val}
                  onClick={() => setFilterStatus(pill.val)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
                    filterStatus === pill.val
                      ? 'bg-neutral-800 text-white border border-neutral-600'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/60 text-neutral-400 font-mono">
                      <th className="p-3.5">Serial Number</th>
                      <th className="p-3.5">Model Laptop</th>
                      <th className="p-3.5">Kondisi / Grade</th>
                      <th className="p-3.5">Status Unit</th>
                      <th className="p-3.5 text-right">Modal (HPP)</th>
                      <th className="p-3.5 text-right">Harga Jual</th>
                      <th className="p-3.5 text-center">Aksi Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {filteredUnits.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-neutral-500 font-mono">
                          Tidak ada unit fisik ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredUnits.map((u) => (
                        <tr key={u.id} className="hover:bg-neutral-900/50 transition">
                          <td className="p-3.5 font-mono font-bold text-white">{u.serialNumber}</td>
                          <td className="p-3.5">
                            <p className="font-semibold text-white">{u.productModel?.name}</p>
                            <p className="text-[10px] font-mono text-neutral-400">{u.productModel?.sku}</p>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-700">
                              {u.condition} {u.grade ? `• Grade ${u.grade}` : ''}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                u.status === 'AVAILABLE'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : u.status === 'QC_PENDING'
                                  ? 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                                  : u.status === 'IN_REPAIR'
                                  ? 'bg-orange-950 text-orange-300 border border-orange-800'
                                  : 'bg-neutral-900 text-neutral-400 border border-neutral-700'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono text-neutral-300">
                            {formatRupiah(u.hpp)}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-white">
                            {formatRupiah(u.price)}
                          </td>
                          <td className="p-3.5 text-center">
                            <Button
                              onClick={() => openEditUnit(u)}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-neutral-700 bg-neutral-900 hover:bg-white hover:text-black font-semibold gap-1.5 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit Stok</span>
                            </Button>
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
        {/* TAB 3: QC & APPROVAL UNIT (OWNER CHECKER & FINANCE AUDIT)                */}
        {/* ========================================================================= */}
        {activeTab === 'qc' && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-950/20 border border-yellow-800/40 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-white">Pusat Otorisasi & Verifikasi Fisik (QC Inspection)</h3>
                <p className="text-xs text-neutral-300 mt-0.5">
                  Unit yang baru di-input oleh staf Keuangan berstatus <strong>QC_PENDING</strong>. Owner memeriksa kondisi fisik sebelum unit siap dijual di terminal kasir.
                </p>
              </div>
            </div>

            <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/60 text-neutral-400 font-mono">
                      <th className="p-3.5">Serial Number</th>
                      <th className="p-3.5">Model Laptop</th>
                      <th className="p-3.5">Modal (HPP)</th>
                      <th className="p-3.5">Harga Jual</th>
                      <th className="p-3.5">Catatan QC</th>
                      <th className="p-3.5 text-center">Otorisasi Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {units.filter((u) => u.status === 'QC_PENDING').length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-neutral-500 font-mono">
                          Tidak ada unit fisik yang sedang menunggu persetujuan QC.
                        </td>
                      </tr>
                    ) : (
                      units
                        .filter((u) => u.status === 'QC_PENDING')
                        .map((u) => (
                          <tr key={u.id} className="hover:bg-neutral-900/50 transition">
                            <td className="p-3.5 font-mono font-bold text-white">{u.serialNumber}</td>
                            <td className="p-3.5">
                              <p className="font-semibold text-white">{u.productModel?.name}</p>
                              <p className="text-[10px] font-mono text-neutral-400">{u.productModel?.sku}</p>
                            </td>
                            <td className="p-3.5 font-mono text-neutral-300">{formatRupiah(u.hpp)}</td>
                            <td className="p-3.5 font-mono text-white">{formatRupiah(u.price)}</td>
                            <td className="p-3.5 text-neutral-400 max-w-[250px] truncate">
                              {u.catatanFisik || 'Pemeriksaan standar normal'}
                            </td>
                            <td className="p-3.5 text-center">
                              {role === 'OWNER' ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button
                                    onClick={() => handleApprove(u.id)}
                                    size="sm"
                                    className="h-7 text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-3 cursor-pointer"
                                  >
                                    Setujui & Rilis
                                  </Button>
                                  <Button
                                    onClick={() => handleReject(u.id)}
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-red-800 text-red-400 hover:bg-red-950 font-semibold px-2 cursor-pointer"
                                  >
                                    Tolak
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-yellow-400 font-mono">
                                  Menunggu Otorisasi Owner
                                </span>
                              )}
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
        {/* TAB 4: RIWAYAT PEMBELIAN & PENGADAAN (FINANCE & OWNER BISA EDIT)           */}
        {/* ========================================================================= */}
        {activeTab === 'purchases' && (
          <div className="space-y-4">
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Log Riwayat Pembelian & Restock Unit</h3>
                <p className="text-xs text-neutral-400">
                  Seluruh penerimaan barang masuk tercatat otomatis ke Jurnal Pembelian (COA 130 vs Kas/Bank).
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-600 text-emerald-400 font-mono text-xs">
                DOUBLE-ENTRY RECONCILED
              </Badge>
            </div>

            <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/60 text-neutral-400 font-mono">
                      <th className="p-3.5">Tanggal</th>
                      <th className="p-3.5">Model Laptop & Serial Number</th>
                      <th className="p-3.5">Keterangan / Supplier</th>
                      <th className="p-3.5">Sumber Pembayaran</th>
                      <th className="p-3.5 text-right">Biaya Beli (HPP)</th>
                      <th className="p-3.5">Status Jurnal</th>
                      <th className="p-3.5 text-center">Aksi Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {units.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-neutral-500 font-mono">
                          Belum ada riwayat pembelian tercatat.
                        </td>
                      </tr>
                    ) : (
                      units.map((u) => {
                        const pj = u.purchaseJournal;
                        const creditLine = pj?.lines?.find((l: any) => l.side === 'KREDIT');
                        const paymentLabel = creditLine?.account
                          ? `${creditLine.account.code} - ${creditLine.account.name}`
                          : creditLine?.accountCode === '120'
                          ? '120 - Bank BCA'
                          : '110 - Kas Toko';

                        return (
                          <tr key={u.id} className="hover:bg-neutral-900/50 transition">
                            <td className="p-3.5 font-mono text-neutral-400">
                              {pj?.tanggal
                                ? new Date(pj.tanggal).toLocaleDateString('id-ID')
                                : new Date(u.createdAt).toLocaleDateString('id-ID')}
                            </td>
                            <td className="p-3.5">
                              <p className="font-semibold text-white">{u.productModel?.name}</p>
                              <p className="text-[10px] font-mono text-emerald-400">SN: {u.serialNumber}</p>
                            </td>
                            <td className="p-3.5 text-neutral-300 max-w-[220px] truncate">
                              {pj?.keterangan || `Restock Unit ${u.productModel?.name}`}
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-700 text-neutral-300">
                                {paymentLabel}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-white">
                              {formatRupiah(u.hpp || pj?.total || 0)}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  pj?.status === 'POSTED'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                                }`}
                              >
                                {pj?.status || 'POSTED'}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <Button
                                onClick={() => openEditPurchase(u)}
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs border-neutral-700 bg-neutral-900 hover:bg-white hover:text-black font-semibold gap-1 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit Beli</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: TAMBAH MODEL LAPTOP                                             */}
        {/* ========================================================================= */}
        {showAddModelModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Folder className="w-4 h-4 text-blue-400" />
                  Tambah Katalog Model Baru
                </h3>
                <button
                  onClick={() => setShowAddModelModal(false)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateModel} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">SKU Model (Contoh: L-THINK-T480)</Label>
                  <Input
                    required
                    placeholder="L-THINK-T480"
                    value={modelFormData.sku}
                    onChange={(e) => setModelFormData({ ...modelFormData, sku: e.target.value.toUpperCase() })}
                    className="bg-black border-neutral-700 text-xs font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Nama Lengkap Laptop & Spek</Label>
                  <Input
                    required
                    placeholder="Lenovo ThinkPad T480 Core i5 / RAM 16GB / SSD 256GB"
                    value={modelFormData.name}
                    onChange={(e) => setModelFormData({ ...modelFormData, name: e.target.value })}
                    className="bg-black border-neutral-700 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Kategori</Label>
                  <select
                    value={modelFormData.category}
                    onChange={(e) => setModelFormData({ ...modelFormData, category: e.target.value })}
                    className="w-full h-9 px-3 bg-black border border-neutral-700 rounded-md text-xs text-white"
                  >
                    <option value="LAPTOP">Laptop</option>
                    <option value="AKSESORIS">Aksesoris</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModelModal(false)}
                    className="h-9 text-xs border-neutral-700"
                  >
                    Batal
                  </Button>
                  <Button type="submit" className="h-9 text-xs bg-white text-black font-bold">
                    Simpan Model
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: TAMBAH UNIT FISIK (RESTOCK)                                     */}
        {/* ========================================================================= */}
        {showAddUnitModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4 my-8">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-emerald-400" />
                  Restock / Penerimaan Unit Fisik Laptop
                </h3>
                <button
                  onClick={() => setShowAddUnitModal(false)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUnit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Pilih Model Laptop</Label>
                  <select
                    required
                    value={unitFormData.productModelId}
                    onChange={(e) => setUnitFormData({ ...unitFormData, productModelId: e.target.value })}
                    className="w-full h-9 px-3 bg-black border border-neutral-700 rounded-md text-xs text-white"
                  >
                    <option value="">-- Pilih Katalog Model --</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Serial Number (SN Fisik)</Label>
                    <Input
                      required
                      placeholder="Contoh: SN-THINK-001"
                      value={unitFormData.serialNumber}
                      onChange={(e) =>
                        setUnitFormData({ ...unitFormData, serialNumber: e.target.value.toUpperCase() })
                      }
                      className="bg-black border-neutral-700 text-xs font-mono uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Kondisi</Label>
                    <select
                      value={unitFormData.condition}
                      onChange={(e) => setUnitFormData({ ...unitFormData, condition: e.target.value as any })}
                      className="w-full h-9 px-3 bg-black border border-neutral-700 rounded-md text-xs text-white"
                    >
                      <option value="SECOND">SECOND (Bekas)</option>
                      <option value="NEW">NEW (Baru)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Modal Beli / HPP (Rp)</Label>
                    <Input
                      required
                      type="number"
                      placeholder="5000000"
                      value={unitFormData.hpp}
                      onChange={(e) => setUnitFormData({ ...unitFormData, hpp: e.target.value })}
                      className="bg-black border-neutral-700 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Harga Jual Kasir (Rp)</Label>
                    <Input
                      required
                      type="number"
                      placeholder="6500000"
                      value={unitFormData.price}
                      onChange={(e) => setUnitFormData({ ...unitFormData, price: e.target.value })}
                      className="bg-black border-neutral-700 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Sumber Akun Pembayaran Restock</Label>
                  <select
                    value={unitFormData.paymentAccountCode}
                    onChange={(e) => setUnitFormData({ ...unitFormData, paymentAccountCode: e.target.value })}
                    className="w-full h-9 px-3 bg-black border border-neutral-700 rounded-md text-xs text-white"
                  >
                    <option value="110">110 - Kas Toko (Tunai)</option>
                    <option value="120">120 - Bank BCA (Transfer)</option>
                    <option value="210">210 - Hutang Usaha (Tempo)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Catatan Pemeriksaan Fisik</Label>
                  <Input
                    placeholder="Mulus 98%, keyboard backlit nyala, baterai health 85%"
                    value={unitFormData.catatanFisik}
                    onChange={(e) => setUnitFormData({ ...unitFormData, catatanFisik: e.target.value })}
                    className="bg-black border-neutral-700 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddUnitModal(false)}
                    className="h-9 text-xs border-neutral-700"
                  >
                    Batal
                  </Button>
                  <Button type="submit" className="h-9 text-xs bg-white text-black font-bold">
                    Simpan Unit
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: EDIT STOK UNIT FISIK (FINANCE & OWNER)                          */}
        {/* ========================================================================= */}
        {showEditUnitModal && selectedUnit && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4 my-8">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Edit className="w-4 h-4 text-amber-400" />
                    Edit Data Unit & Stok
                  </h3>
                  <p className="text-xs text-neutral-400">{selectedUnit.productModel?.name}</p>
                </div>
                <button
                  onClick={() => setShowEditUnitModal(false)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditUnitSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Serial Number (SN)</Label>
                    <Input
                      required
                      value={editUnitData.serialNumber}
                      onChange={(e) => setEditUnitData({ ...editUnitData, serialNumber: e.target.value })}
                      className="bg-black border-neutral-700 text-xs font-mono uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Status Ketersediaan</Label>
                    <select
                      value={editUnitData.status}
                      onChange={(e) => setEditUnitData({ ...editUnitData, status: e.target.value })}
                      className="w-full h-9 px-3 bg-black border border-neutral-700 rounded-md text-xs text-white"
                    >
                      <option value="AVAILABLE">AVAILABLE (Siap Jual)</option>
                      <option value="QC_PENDING">QC_PENDING (Menunggu Verifikasi)</option>
                      <option value="IN_REPAIR">IN_REPAIR (Dalam Servis)</option>
                      <option value="SOLD">SOLD (Terjual)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Kondisi</Label>
                    <select
                      value={editUnitData.condition}
                      onChange={(e) => setEditUnitData({ ...editUnitData, condition: e.target.value })}
                      className="w-full h-9 px-3 bg-black border border-neutral-700 rounded-md text-xs text-white"
                    >
                      <option value="SECOND">SECOND</option>
                      <option value="NEW">NEW</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Grade Fisik</Label>
                    <select
                      value={editUnitData.grade}
                      onChange={(e) => setEditUnitData({ ...editUnitData, grade: e.target.value })}
                      className="w-full h-9 px-3 bg-black border border-neutral-700 rounded-md text-xs text-white"
                    >
                      <option value="A">Grade A (Mulus / Istimewa)</option>
                      <option value="B">Grade B (Normal Wear)</option>
                      <option value="C">Grade C (Ada Minus / Baret)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Harga Pokok (HPP Beli)</Label>
                    <Input
                      type="number"
                      value={editUnitData.hpp}
                      onChange={(e) => setEditUnitData({ ...editUnitData, hpp: e.target.value })}
                      className="bg-black border-neutral-700 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Harga Jual Kasir</Label>
                    <Input
                      type="number"
                      required
                      value={editUnitData.price}
                      onChange={(e) => setEditUnitData({ ...editUnitData, price: e.target.value })}
                      className="bg-black border-neutral-700 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Catatan Kondisi Fisik</Label>
                  <Input
                    value={editUnitData.catatanFisik}
                    onChange={(e) => setEditUnitData({ ...editUnitData, catatanFisik: e.target.value })}
                    className="bg-black border-neutral-700 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditUnitModal(false)}
                    className="h-9 text-xs border-neutral-700"
                  >
                    Batal
                  </Button>
                  <Button type="submit" className="h-9 text-xs bg-white text-black font-bold">
                    Simpan Perubahan
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: EDIT RIWAYAT PEMBELIAN (FINANCE & OWNER)                        */}
        {/* ========================================================================= */}
        {showEditPurchaseModal && selectedUnit && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    Koreksi Riwayat Pembelian
                  </h3>
                  <p className="text-xs text-neutral-400">Unit SN: {selectedUnit.serialNumber}</p>
                </div>
                <button
                  onClick={() => setShowEditPurchaseModal(false)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditPurchaseSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nominal Biaya Beli / HPP (Rp)</Label>
                  <Input
                    required
                    type="number"
                    value={editPurchaseData.hpp}
                    onChange={(e) => setEditPurchaseData({ ...editPurchaseData, hpp: e.target.value })}
                    className="bg-black border-neutral-700 text-xs font-mono"
                  />
                  <p className="text-[10px] text-neutral-500">
                    Otomatis menyinkronkan HPP unit dan Jurnal Pembelian (Debit COA 130).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Keterangan / Supplier</Label>
                  <Input
                    required
                    value={editPurchaseData.keterangan}
                    onChange={(e) => setEditPurchaseData({ ...editPurchaseData, keterangan: e.target.value })}
                    className="bg-black border-neutral-700 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Sumber Akun Kas / Bank Pembayaran</Label>
                  <select
                    value={editPurchaseData.paymentAccountCode}
                    onChange={(e) =>
                      setEditPurchaseData({ ...editPurchaseData, paymentAccountCode: e.target.value })
                    }
                    className="w-full h-9 px-3 bg-black border border-neutral-700 rounded-md text-xs text-white"
                  >
                    <option value="110">110 - Kas Toko (Tunai)</option>
                    <option value="120">120 - Bank BCA (Transfer)</option>
                    <option value="210">210 - Hutang Usaha (Tempo)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Tanggal Pembelian</Label>
                  <Input
                    type="date"
                    value={editPurchaseData.tanggal}
                    onChange={(e) => setEditPurchaseData({ ...editPurchaseData, tanggal: e.target.value })}
                    className="bg-black border-neutral-700 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditPurchaseModal(false)}
                    className="h-9 text-xs border-neutral-700"
                  >
                    Batal
                  </Button>
                  <Button type="submit" className="h-9 text-xs bg-white text-black font-bold">
                    Simpan Koreksi
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

export default function InventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-black text-white items-center justify-center font-mono text-xs">
          Memuat Inventaris Toko...
        </div>
      }
    >
      <InventoryContent />
    </Suspense>
  );
}
