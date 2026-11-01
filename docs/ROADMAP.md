# Roadmap PrimeGarage

Status: ⬜ belum, 🟡 sebagian, ✅ selesai (kode ada dan teruji lokal), 🔑 butuh tindakan pemilik (akun, kredensial, atau perangkat). Perbarui file ini setiap tugas selesai.

## Fase 0: Dokumentasi dan perancangan ✅
- ✅ PRD, arsitektur dan ADR, skema database, logika perawatan, spesifikasi 3D, deployment
- ✅ `AGENTS.md` sebagai aturan untuk semua AI agent

## Fase 1: Fondasi dan spike 3D ✅
- ✅ Monorepo npm workspaces: `apps/mobile`, `apps/api`, `packages/shared`
- ✅ Expo SDK 58 + Expo Router + TypeScript strict + NativeWind, web output SPA
- ✅ Lint (oxlint, ESLint), typecheck, test di root (`npm run lint`, `npm run typecheck`, `npm test`)
- ✅ `packages/shared`: enum, tipe, `computeComponentStatus` dengan seluruh kasus uji `MAINTENANCE-LOGIC.md` bagian 7
- ✅ Model `underbone_v1.glb` (prosedural) dan `honda_supra_x_125_fi_v1.glb` (Sketchfab, CC BY 4.0) dengan titik sentuh
- ✅ Viewer 3D: muat, orbit, sentuh bagian, sorotan, panel info, mode kondisi (FR-3D-01 s.d. 05), teruji di browser
- 🔑 Uji viewer 3D di **Android fisik** (bundle Android sudah lolos `expo export`; perlu development build di HP)
- ✅ Daftar bagian sebagai fallback dan model cadangan otomatis (FR-3D-06)

## Fase 2: API, login, dan kendaraan ✅
- ✅ NestJS 12, Prisma 7 (MySQL), migrasi awal, seed katalog
- ✅ Login Google (verifikasi ID token), JWT dan refresh token berotasi, logout, profil (FR-AUTH-01 s.d. 05)
- ✅ Login username dan password, akun dibuat lewat CLI `user:password` (FR-AUTH-01, ADR-011)
- ✅ Login GitHub lewat API, dibatasi `GITHUB_ALLOWED_LOGINS`, teruji di web (FR-AUTH-10, ADR-012); 🔑 buat GitHub OAuth App lalu isi `GITHUB_CLIENT_ID` dan `GITHUB_CLIENT_SECRET` (`DEPLOYMENT.md` 0.2)
- ⏸️ Login Google ditunda (FR-AUTH-09); kode tetap ada. 🔑 Jika diaktifkan: buat OAuth client Google (web dan Android) lalu isi `GOOGLE_CLIENT_IDS` dan `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (lihat `DEPLOYMENT.md` 0.2b)
- ✅ Garasi otomatis, CRUD kendaraan dari katalog dan manual (FR-VEH-01 s.d. 05)
- ✅ Odometer dengan penjaga angka turun (FR-VEH-06, 07)
- ✅ Gateway Socket.IO dan invalidasi query di app, teruji antar dua klien sekitar 100 ms (FR-SYNC-01, 02)

## Fase 3: Servis, kondisi, dan edukasi ✅
- ✅ Bengkel (FR-WS-01, 02)
- ✅ Catatan servis dan item, template cepat, foto nota (FR-SVC-01 s.d. 07)
- ✅ Aturan perawatan per kendaraan, ubah interval, kembalikan default (FR-MNT-01, 02)
- ✅ Tab Kondisi dan dashboard garasi (FR-MNT-03, 04)
- ✅ Warna status pada model 3D dan riwayat di panel info (FR-3D-04, 05)
- ✅ Konten edukasi dari database dan tur edukasi (FR-EDU-01, 02)
- 🔑 Verifikasi interval default dengan buku servis Supra X 125 FI

## Fase 4: Pengingat ✅
- ✅ Proses worker dan cron harian 07.00 WIB, dedupe, digest per pengguna
- ✅ Push notification Android lewat Expo (FR-NTF-01); 🔑 butuh EAS project ID dan kredensial FCM
- ✅ Email pengingat lewat SMTP (FR-NTF-02); 🔑 butuh App Password Google Workspace
- ✅ Pengulangan dan batas frekuensi (FR-NTF-03)
- ✅ Pengingat odometer, tunda (snooze), pusat notifikasi (FR-NTF-04 s.d. 06)

## Fase 5: Rilis MVP 🟡
- ✅ Hapus akun di app dan halaman web `/delete-account` (FR-AUTH-04)
- ✅ Halaman kebijakan privasi `/privacy`
- ✅ Konfigurasi PM2, contoh `.env`, panduan Nginx satu domain (`DEPLOYMENT.md`)
- ✅ Manifest PWA dan ikon untuk macOS
- ✅ Profil EAS (`production` menghasilkan AAB), package `my.id.ngiliyun.primegarage`
- 🔑 Deploy ke VPS `primegarage.ngiliyun.my.id`
- 🔑 Build AAB pertama, closed testing, listing Google Play

## Setelah MVP
- Login Facebook, Apple, email
- Berbagi garasi (peran editor, viewer; tabel dan otorisasi sudah siap)
- Model 3D kategori matic dan sport, lalu mobil
- Statistik biaya, ekspor PDF riwayat servis
- Web push, aplikasi iOS, mode offline
- i18n bahasa Inggris (teks UI saat ini masih ditulis langsung dalam Bahasa Indonesia)
