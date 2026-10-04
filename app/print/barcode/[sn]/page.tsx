'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Barcode from 'react-barcode';
import { Printer, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BarcodePrintPage() {
  const params = useParams();
  const router = useRouter();
  const sn = (params?.sn as string) || '';

  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format Angka ke Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  useEffect(() => {
    if (!sn) return;

    const fetchUnit = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/inventory/unit/${encodeURIComponent(sn)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Unit tidak ditemukan di database');
        }

        setUnit(data);

        // Auto trigger window.print() setelah data dan barcode selesai render
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.print();
          }
        }, 600);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data stiker barcode');
      } finally {
        setLoading(false);
      }
    };

    fetchUnit();
  }, [sn]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white gap-3 p-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-xs font-mono text-neutral-400">Menyiapkan kanvas cetak stiker thermal (50x30mm)...</p>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white gap-4 p-4">
        <div className="p-4 border border-red-800 bg-red-950/60 rounded-xl text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <h2 className="text-sm font-bold text-red-200">Gagal Mencetak Barcode</h2>
          <p className="text-xs text-neutral-400 mt-1">{error || 'Data unit tidak ditemukan'}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="mt-4 border-neutral-700 text-white text-xs"
          >
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  const modelName = unit.productModel?.name || 'Unit Laptop';
  const conditionLabel =
    unit.condition === 'SECOND'
      ? `SECOND ${unit.grade ? `(GRD ${unit.grade})` : ''}`
      : 'UNIT BARU';

  return (
    <div className="min-h-screen bg-neutral-950 text-black flex flex-col items-center justify-center p-4 print:p-0 print:bg-white print:min-h-0">
      {/* Print CSS Specific Rules for 50mm x 30mm Thermal Label Sticker */}
      <style jsx global>{`
        @page {
          size: 50mm 30mm;
          margin: 0mm;
        }
        @media print {
          html, body {
            width: 50mm !important;
            height: 30mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .thermal-sticker-canvas {
            width: 50mm !important;
            height: 30mm !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 1.5mm 2mm !important;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Screen Toolbar Controls (Hidden when Printing) */}
      <div className="no-print mb-6 flex items-center gap-3 bg-neutral-900 border border-neutral-800 p-3 rounded-xl shadow-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.close()}
          className="h-8 gap-1.5 text-xs text-neutral-300 border-neutral-700 bg-neutral-800 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Tutup Tab</span>
        </Button>

        <Button
          size="sm"
          onClick={() => window.print()}
          className="h-8 gap-1.5 text-xs bg-emerald-500 text-black hover:bg-emerald-400 font-bold"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak Ulang (Print)</span>
        </Button>

        <div className="text-[11px] text-neutral-400 font-mono pl-2 border-l border-neutral-800 hidden sm:block">
          Format Kertas: <strong>50mm x 30mm (Stiker Thermal)</strong>
        </div>
      </div>

      {/* ============================================================ */}
      {/* KANVAS CETAK STIKER THERMAL (Ukuran Presisi: 50mm x 30mm)     */}
      {/* ============================================================ */}
      <div className="thermal-sticker-canvas w-[50mm] h-[30mm] bg-white text-black p-[2mm] rounded-sm border border-neutral-300 shadow-md flex flex-col justify-between items-center text-center overflow-hidden box-border leading-none select-none font-sans">
        {/* Baris 1: Nama Toko (Kecil / Bold) */}
        <div className="w-full flex justify-between items-center px-0.5 border-b border-black pb-0.5">
          <span className="text-[7.5px] font-black tracking-wider uppercase">
            SOLIT POS
          </span>
          <span className="text-[6.5px] font-bold font-mono tracking-tight bg-black text-white px-1 py-0.2 rounded-xs">
            {conditionLabel}
          </span>
        </div>

        {/* Baris 2: Nama Produk (Truncate jika panjang) */}
        <div className="w-full px-0.5 pt-0.5 text-center">
          <p className="text-[7.5px] font-bold leading-tight line-clamp-1 truncate text-neutral-900">
            {modelName}
          </p>
        </div>

        {/* Baris 3: Komponen Barcode Code128 Presisi Tinggi */}
        <div className="w-full flex items-center justify-center my-auto overflow-hidden">
          <Barcode
            value={unit.serialNumber}
            format="CODE128"
            width={1.05}
            height={26}
            fontSize={8}
            margin={0}
            displayValue={true}
            font="monospace"
            textMargin={1}
            background="#ffffff"
            lineColor="#000000"
          />
        </div>

        {/* Baris 4: Harga Jual & SKU */}
        <div className="w-full flex justify-between items-center px-0.5 border-t border-black pt-0.5 mt-0.5">
          <span className="text-[6.5px] font-mono text-neutral-700 truncate max-w-[20mm]">
            {unit.productModel?.sku || 'LAPTOP'}
          </span>
          <span className="text-[9px] font-black font-mono tracking-tight text-black">
            {formatRupiah(unit.price)}
          </span>
        </div>
      </div>

      {/* Screen helper instruction */}
      <p className="no-print text-[11px] text-neutral-500 mt-4 text-center">
        Stiker di atas didesain presisi untuk printer thermal stiker ukuran <strong>50 x 30 mm</strong>.<br />
        Dialog cetak printer akan muncul otomatis. Pastikan ukuran kertas di dialog print disetel ke 50x30mm.
      </p>
    </div>
  );
}
