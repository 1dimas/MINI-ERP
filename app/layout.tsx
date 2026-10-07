import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    template: '%s | SOLIT POS',
    default: 'SOLIT POS - Terminal Kasir & Sistem Toko Terintegrasi',
  },
  description:
    'Sistem kasir (POS) dan mini ERP modern dengan pembukuan akuntansi otomatis, manajemen multi-shift, dan pelacakan inventaris unit serial number.',
  keywords: [
    'POS',
    'Point of Sale',
    'Aplikasi Kasir',
    'Sistem Toko',
    'Mini ERP',
    'Manajemen Inventaris',
    'Akuntansi Otomatis',
  ],
  authors: [{ name: 'SOLIT System' }],
  metadataBase: new URL('https://solitpos.com'),
  openGraph: {
    title: 'SOLIT POS - Terminal Kasir & Sistem Toko Terintegrasi',
    description:
      'Aplikasi kasir cepat (zero-friction) dengan otomasi jurnal akuntansi, pelacakan serial number, dan kontrol kasir realtime.',
    url: 'https://solitpos.com',
    siteName: 'SOLIT POS',
    locale: 'id_ID',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-black text-white selection:bg-neutral-800 selection:text-white">
        {children}
      </body>
    </html>
  );
}
