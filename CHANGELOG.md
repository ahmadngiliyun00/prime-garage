# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/) dan [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Ditambahkan
- `scripts/deploy.sh`: deploy dan update production dengan satu perintah (cek prasyarat dan `.env`, pull, install, build API, migrasi, seed katalog, build web tanpa downtime, reload PM2, cek kesehatan).
- `GET /api` menjawab nama dan status API (sebelumnya 404) beserta alamat pemeriksaan `/api/health`.
- Logo dan emblem PrimeGarage: ikon aplikasi Android dan iOS, ikon adaptif dan ikon tema Android, ikon notifikasi, splash, favicon, ikon PWA, logo di halaman login, dan banner README. Sumber di `docs/brand`, dibangun ulang dengan `npm run generate:brand -w @prime-garage/mobile`.
- Perintah `npm run dev:web` untuk menjalankan versi web saja saat development.
- Login dengan GitHub di web, Android, dan Expo Go. Pertukaran OAuth di server, hanya akun di `GITHUB_ALLOWED_LOGINS` yang bisa masuk (FR-AUTH-10, ADR-012).
- Login dengan username (atau email) dan password. Akun dibuat dan password direset lewat `npm run user:password -w @prime-garage/api` (FR-AUTH-01, ADR-011).

### Diperbaiki
- Konfigurasi Nginx di panduan deploy: blok `types` di level `server` membuat HTML dan JS terkirim sebagai `application/octet-stream`; tipe `.glb` kini diatur di dalam `location /assets/`. Panduan disesuaikan dengan folder site aaPanel `/www/wwwroot/primegarage.ngiliyun.my.id`, root Nginx ke `apps/mobile/dist`.
- Build web production yang tidak sengaja memakai `EXPO_PUBLIC_API_URL=http://localhost:3000` tetap menghubungi API di domainnya sendiri, bukan `localhost` milik pengunjung.
- Login GitHub di development memakai callback sesuai alamat yang dipakai untuk membuka API (localhost atau IP LAN), sehingga web di komputer dan app di HP bisa memakai OAuth App yang sama. Sebelumnya hanya satu `API_PUBLIC_URL` yang berlaku.
- Web development tidak lagi diblokir CORS saat `CORS_ORIGINS` masih berisi alamat production: di luar production, API juga mengizinkan origin localhost dan jaringan lokal. Production tetap hanya `CORS_ORIGINS`.
- App di HP saat development tidak lagi gagal terhubung ke `http://localhost:3000`: alamat loopback otomatis diganti dengan IP komputer yang menjalankan Metro. API mencetak petunjuk `HOST=0.0.0.0` dan alamat yang bisa dibuka dari HP.
- Prompt password `user:password` selalu menampilkan labelnya dan menampilkan `*` untuk setiap karakter; backspace, paste, dan Ctrl+C ditangani dengan benar.
- Pesan "Tidak dapat terhubung ke server" kini menyebut alamat API yang dihubungi, dan saat development mengingatkan untuk menjalankan `npm run dev:api`.
- Prisma Client dibuat ulang otomatis oleh `db:migrate`, `db:deploy`, `dev:api`, `dev:worker`, dan `user:password`. Sebelumnya, setelah `git pull`, API gagal di-compile dan `user:password` gagal dengan "Unknown argument `username`" karena Prisma 7 tidak lagi menjalankan `generate` setelah migrasi.
- `user:password` dan perintah `dev:*` membangun ulang `packages/shared` lebih dulu, sehingga tidak lagi gagal dengan "does not provide an export named" setelah `git pull`. Skrip juga memberi pesan jelas bila database mati atau migrasi belum dijalankan.
- Web tidak lagi menampilkan error "Cannot manually set color scheme" saat dibuka: NativeWind memakai `darkMode: class` dan class `dark` disinkronkan dengan tema sistem. Ikon tombol sekunder terbaca di tema gelap.
- Viewer 3D tidak lagi crash di iOS dan Android (`process.emitWarning is not a function`): Metro sekarang memakai build ESM `three.module.js`, bukan shim `three.cjs`.
- Aplikasi tidak lagi crash di Expo Go karena modul native Google Sign-In tidak tersedia; tombol Google diganti pesan dan login pengembang tetap bisa dipakai.

### Diubah
- Warna aplikasi mengikuti logo: oranye sebagai warna utama, putih, dan hitam. Tema gelap kini hitam netral, bukan biru gelap. Warna tema PWA dan notifikasi Android ikut oranye.
- Login Google ditunda dan tombolnya disembunyikan selama belum dikonfigurasi (FR-AUTH-09).
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
