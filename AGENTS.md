1. Rules SEO 100 & Performa Ringan (Next.js)

    Pemisahan Arsitektur (Wajib): Gunakan Static Site Generation (SSG) untuk Landing Page. Next.js akan me-render halaman menjadi HTML statis murni yang kecepatannya instan. Biarkan Dashboard POS internal menggunakan SSR/Client-Side Rendering di route terpisah (misal: /app atau app.solitpos.com).

    Optimalisasi Aset Otomatis:

        Wajib gunakan komponen <Image/> bawaan Next.js. Ini otomatis mengkonversi gambar ke format WebP/AVIF, melakukan lazy loading, dan mencegah Cumulative Layout Shift (tata letak melompat).

        Gunakan komponen <Font/> dari next/font agar font di- host secara lokal saat proses build, menghilangkan koneksi eksternal ke Google Fonts yang membebani loading.

    Metadata & Semantic HTML:

        Pastikan struktur tag berurutan dengan benar: Hanya boleh ada satu <H1>, diikuti <H2>, lalu <H3>. Jangan gunakan heading hanya untuk memperbesar teks.

        Gunakan tag semantik HTML5: <header>, <main>, <section>, <article>, <footer>. Mesin pencari sangat menyukai struktur ini.

        Konfigurasi metadata dinamis di layout utama Next.js (generateMetadata) mencakup Title, Description, dan OpenGraph (untuk tampilan preview di WhatsApp/Twitter).

    Aksesibilitas (Nilai Plus SEO): Tambahkan atribut aria-label pada tombol yang tidak memiliki teks (seperti icon hamburger menu) dan atribut alt pada semua gambar. Bot SEO menilai web yang ramah disabilitas dengan skor lebih tinggi.

2. Kerangka Berpikir Kritis & Profesional (Engineering Mindset)

Untuk membangun sistem skala menengah-besar dan menghindari proyek gagal di tengah jalan, Anda harus memprogram otak Anda dengan kerangka berpikir Risk Management. Gunakan 4 prinsip ini dalam mengambil keputusan ke depan:

A. First-Principles Thinking (Membongkar Akar Masalah)
Jangan pernah membangun fitur hanya karena "toko lain pakai fitur ini".

    Cara Berpikir: "Apa tujuan sebenarnya dari fitur ini?"

    Contoh Kasus: Kasir minta fitur integrasi barcode scanner via Bluetooth. Daripada langsung pusing mencari library Bluetooth yang berat, kembali ke akar: "Tujuannya apa? Agar input cepat." Solusinya: Kursor text-box yang otomatis aktif, karena scanner konvensional pada dasarnya hanya membaca barcode dan mengirim simulasi ketikan keyboard (Enter). Masalah selesai dengan 0 baris kode tambahan.

B. Second-Order Thinking (Memikirkan Efek Domino)
Setiap kali Anda ingin mengubah tabel database atau menambah alur, tanyakan: "Lalu apa yang terjadi selanjutnya?"

    Pemikiran Tingkat 1: "Saya mau hapus fitur Jurnal Retur biar codingnya gampang."

    Pemikiran Tingkat 2: "Jika tidak ada jurnal retur, saat kasir membatalkan nota, stok fisik akan bertambah kembali, TAPI di Buku Besar, uangnya seolah-olah masih ada. Laporan Neraca akan hancur bulan depan." (Anda berhasil menyelamatkan bisnis dari kehancuran data).

C. Prinsip YAGNI (You Aren't Gonna Need It)
Hindari penyakit Over-engineering. Jangan membangun solusi untuk masalah yang belum Anda miliki.

    Kritis: Jangan rancang server dengan Load Balancer dan Microservices di AWS hanya untuk menampung 3 kasir di satu toko. Gunakan VPS murah (seperti DigitalOcean atau Contabo) dan sistem Monolith (satu kesatuan). Pikirkan scaling hanya ketika CPU Usage server Anda sudah konsisten menyentuh 80%.

D. The "Fail-Safe" Default (Skenario Terburuk)
Profesional selalu mendesain sistem dengan asumsi bahwa segala sesuatu akan rusak.

    Kritis: Apa yang terjadi jika listrik toko mati atau internet putus saat kasir sedang menekan tombol 'Bayar'?

    Solusi: Sistem transaksi database (seperti prisma.$transaction yang kita bahas sebelumnya). Jika koneksi terputus di tengah jalan, seluruh alur (uang masuk, stok berkurang, jurnal tercatat) akan dibatalkan otomatis (rollback). Data Anda tetap konsisten.