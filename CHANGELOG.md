# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/) dan [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Diperbaiki
- Viewer 3D tidak lagi crash di iOS dan Android (`process.emitWarning is not a function`): Metro sekarang memakai build ESM `three.module.js`, bukan shim `three.cjs`.
- Aplikasi tidak lagi crash di Expo Go karena modul native Google Sign-In tidak tersedia; tombol Google diganti pesan dan login pengembang tetap bisa dipakai.

### Diubah
- Jadwal pengingat harian ditulis langsung dalam WIB: `REMINDER_CRON=0 7 * * *` dengan `REMINDER_TZ=Asia/Jakarta` (UTC+7). Jam kirim tetap 07.00 WIB.

## [1.0.0] - 2026-11-01

Rilis pertama (MVP) PrimeGarage: garasi digital untuk mencatat riwayat servis, mempelajari bagian kendaraan lewat model 3D, dan memperkirakan kapan komponen perlu diservis.

### Ditambahkan

**Aplikasi (Android, web SPA, PWA macOS)**
- Login Google (web dan Android) dengan sesi yang dirotasi, login pengembang khusus development.
- Garasi pribadi otomatis, tambah kendaraan dari katalog (Honda, Yamaha, Suzuki, Kawasaki, TVS, Vespa/Piaggio) atau isi manual.
- Viewer 3D interaktif: sentuh bagian motor untuk melihat nama, fungsi, gejala kerusakan, tips perawatan, kondisi, dan riwayat servisnya.
- Model 3D Honda Supra X 125 dengan titik sentuh untuk bagian tersembunyi, dan model motor bebek prosedural sebagai template serta cadangan otomatis.
- Tur edukasi saat pertama membuka kendaraan, mode kondisi (bagian diwarnai sesuai status), dan daftar bagian sebagai alternatif tampilan 3D.
- Pencatatan odometer dengan penjaga angka turun.
- Pencatatan servis: tanggal, km, bengkel, mekanik, daftar pekerjaan per bagian, biaya, foto nota, dan template cepat (ganti oli, servis rutin, dan lainnya).
- Data bengkel: resmi atau umum, status sertifikasi, alamat.
- Tab Kondisi: sisa umur komponen dalam persen, status (Baik, Segera, Jatuh tempo), perkiraan tanggal jatuh tempo; atur interval, kembalikan default, tunda pengingat.
- Dashboard garasi berisi komponen paling mendesak dari semua kendaraan.
- Sinkronisasi realtime antar perangkat.
- Pusat notifikasi, pengaturan profil dan pengingat, hapus akun, halaman kebijakan privasi.

**API dan worker**
- REST API NestJS 12 dengan MySQL 8 (Prisma 7), otorisasi per garasi.
- Realtime Socket.IO di `/api/socket.io`.
- Worker pengingat harian pukul 07.00 WIB: push notification (Expo) dan email (SMTP Google Workspace), dengan dedupe dan ringkasan per pengguna.
- Unggahan foto dikompres ke WebP dan dilayani lewat URL bertanda tangan.

**Paket bersama**
- Rumus estimasi umur komponen berdasarkan km atau waktu (mana yang lebih dulu), interval default motor bebek, dan konten edukasi 18 bagian.

**Dokumentasi**
- PRD, arsitektur dan ADR, skema database, logika perawatan, spesifikasi 3D, panduan deployment aaPanel, roadmap, dan aturan untuk AI agent (`AGENTS.md`).

### Catatan
- Package Android: `my.id.ngiliyun.primegarage`. Domain: `primegarage.ngiliyun.my.id`.
- Interval perawatan default adalah estimasi umum dan perlu diverifikasi dengan buku servis.
- Belum diuji di perangkat Android fisik; bundle Android sudah lolos kompilasi.
- Kredensial produksi (Google OAuth, EAS, FCM, SMTP) dan deploy VPS masih perlu disiapkan pemilik, lihat `docs/ROADMAP.md`.

### Kredit
- Model 3D "Honda Supra x 125" oleh boiledfish.vvti (Sketchfab), lisensi CC BY 4.0.

[1.0.0]: https://github.com/ahmadngiliyun00/prime-garage/releases/tag/v1.0.0
