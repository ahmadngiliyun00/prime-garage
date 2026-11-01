# Roadmap PrimeGarage

Status: ⬜ belum, 🟡 berjalan, ✅ selesai. Perbarui file ini setiap fase atau tugas selesai.

## Fase 0: Dokumentasi dan perancangan ✅
- ✅ PRD, arsitektur dan ADR, skema database, logika perawatan, spesifikasi 3D, deployment
- ✅ `AGENTS.md` sebagai aturan untuk semua AI agent

## Fase 1: Fondasi dan spike 3D ⬜
Tujuan: membuktikan bagian paling berisiko (3D interaktif di Android dan web) sejak awal.
- ⬜ Monorepo npm workspaces: `apps/mobile`, `apps/api` (kosong), `packages/shared`
- ⬜ Scaffold Expo + Expo Router + TypeScript strict + NativeWind, web output SPA
- ⬜ ESLint, Prettier, skrip `lint`, `typecheck`, `test` di root
- ⬜ `packages/shared`: enum, tipe, dan `computeComponentStatus` dengan seluruh kasus uji di `MAINTENANCE-LOGIC.md` bagian 7
- ⬜ Model placeholder `underbone_v1.glb` mengikuti konvensi mesh
- ⬜ Viewer 3D: muat, orbit, sentuh bagian, sorotan, panel info (konten statis sementara) di **web dan Android fisik** (FR-3D-01 s.d. 04)
- ⬜ Daftar bagian sebagai fallback (FR-3D-06)
- ⬜ Keputusan sumber model 3D final

## Fase 2: API, login, dan kendaraan ⬜
- ⬜ Scaffold NestJS, Prisma (MySQL), skema sesuai `DATABASE.md`, migrasi awal
- ⬜ Seed katalog: brands, Supra X 125 FI, parts, model_3d_part_views, rule templates
- ⬜ Login Google, JWT dan refresh token, logout, profil (FR-AUTH-01 s.d. 05)
- ⬜ Garasi otomatis, CRUD kendaraan dari katalog dan manual (FR-VEH-01 s.d. 05)
- ⬜ Odometer (FR-VEH-06, 07)
- ⬜ Gateway Socket.IO dan invalidasi query di app (FR-SYNC-01, 02)

## Fase 3: Servis, kondisi, dan edukasi ⬜
- ⬜ Bengkel (FR-WS-01, 02)
- ⬜ Catatan servis dan item, foto nota (FR-SVC-01 s.d. 06)
- ⬜ Aturan perawatan per kendaraan dan pengubahannya (FR-MNT-01, 02)
- ⬜ Tab Kondisi dan dashboard garasi (FR-MNT-03, 04)
- ⬜ Warna status pada model 3D dan riwayat di panel info (FR-3D-04, 05)
- ⬜ Konten edukasi dari database dan tur edukasi (FR-EDU-01, 02)
- ⬜ Verifikasi interval default dengan buku servis

## Fase 4: Pengingat ⬜
- ⬜ Proses worker dan cron harian
- ⬜ Push notification Android (FR-NTF-01)
- ⬜ Email pengingat (FR-NTF-02)
- ⬜ Pengulangan, dedupe, dan digest (FR-NTF-03)
- ⬜ Pengingat odometer, snooze, pusat notifikasi (FR-NTF-04 s.d. 06)

## Fase 5: Rilis MVP ⬜
- ⬜ Hapus akun di app dan web (FR-AUTH-04)
- ⬜ Halaman kebijakan privasi dan penghapusan akun
- ⬜ Deploy API, worker, MySQL, dan web SPA ke VPS sesuai `DEPLOYMENT.md`
- ⬜ Manifest PWA untuk macOS
- ⬜ Build AAB, closed testing, listing Google Play

## Setelah MVP
- Login Facebook, Apple, email
- Berbagi garasi (peran editor, viewer)
- Model 3D kategori matic dan sport, lalu mobil
- Template servis cepat, statistik biaya, ekspor PDF
- Web push, aplikasi iOS, mode offline
