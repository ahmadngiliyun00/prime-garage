# AGENTS.md: Aturan Wajib untuk AI Agent dan Kontributor

File ini berlaku untuk **semua** AI agent (Claude, ChatGPT, Codex, Cursor, Copilot, Gemini, dll.) dan developer manusia yang bekerja di repo ini. Baca seluruhnya sebelum menulis kode.

## 1. Sumber kebenaran (baca dulu, urut)

| Urutan | Dokumen | Isi |
|---|---|---|
| 1 | [`docs/PRD.md`](docs/PRD.md) | Apa yang dibangun dan kenapa. Kebutuhan fungsional ber-ID. |
| 2 | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Tech stack yang **sudah dikunci**, struktur folder, keputusan arsitektur (ADR). |
| 3 | [`docs/DATABASE.md`](docs/DATABASE.md) | Skema MySQL, relasi, aturan otorisasi data. |
| 4 | [`docs/MAINTENANCE-LOGIC.md`](docs/MAINTENANCE-LOGIC.md) | Rumus estimasi umur komponen dan aturan pengingat. |
| 5 | [`docs/3D-VIEWER.md`](docs/3D-VIEWER.md) | Spesifikasi model 3D, konvensi nama mesh, interaksi sentuh. |
| 6 | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deploy web (SPA), API (PM2), MySQL, Android AAB. |
| 7 | [`docs/ROADMAP.md`](docs/ROADMAP.md) | Urutan fase pengerjaan dan status. |

Jika kode dan dokumen bertentangan, **dokumen yang benar** sampai pemilik proyek memutuskan lain.

## 2. Hal yang TIDAK boleh dilakukan tanpa persetujuan pemilik

- Mengganti tech stack yang dikunci di `docs/ARCHITECTURE.md` (misalnya mengganti Expo dengan Flutter, MySQL dengan PostgreSQL/Supabase/Firebase, NestJS dengan Express/Laravel, Prisma dengan ORM lain, Socket.IO dengan layanan pihak ketiga).
- Menambah layanan BaaS berbayar atau pihak ketiga yang menyimpan data pengguna.
- Mengubah konvensi nama mesh 3D atau kode komponen (`part_code`) yang sudah dipakai.
- Mengubah rumus status komponen di `docs/MAINTENANCE-LOGIC.md`.
- Menghapus fitur yang tercantum sebagai **Must** di PRD.
- Mengubah `applicationId` / package name Android setelah ditetapkan.

Jika perubahan memang perlu: tulis usulan ADR baru di `docs/ARCHITECTURE.md` (status `Diusulkan`), jelaskan alasannya, lalu minta persetujuan. Jangan langsung implementasi.

## 3. Aturan teknis wajib

1. **TypeScript strict** di semua workspace. Tidak boleh `any` tanpa komentar alasan.
2. **Monorepo npm workspaces**: `apps/mobile` (Expo), `apps/api` (NestJS), `packages/shared` (tipe, skema zod, logika perawatan).
3. **Logika estimasi perawatan hanya ada di `packages/shared`** sebagai fungsi murni dan dipakai bersama oleh app dan API. Jangan menduplikasi rumus.
4. **Validasi input dengan zod** dari `packages/shared`, dipakai di client dan server.
5. **Otorisasi data di API**: setiap query data kendaraan wajib dibatasi oleh keanggotaan garasi pengguna (lihat `docs/DATABASE.md` bagian Otorisasi). Tidak ada endpoint yang mengembalikan data lintas pengguna.
6. **Perubahan skema database hanya lewat migrasi Prisma** (`apps/api/prisma/migrations`). Setiap perubahan skema wajib memperbarui `docs/DATABASE.md` di commit yang sama.
7. **Waktu**: simpan `DATETIME` dalam UTC, tanggal servis sebagai `DATE`. Tampilkan dalam zona waktu pengguna (default `Asia/Jakarta`).
8. **Rahasia** (kredensial DB, JWT secret, OAuth secret, SMTP) hanya di `.env` yang tidak di-commit. Sediakan `.env.example`.
9. **Web harus tetap SPA** (`web.output: "single"` di konfigurasi Expo). Jangan beralih ke SSR/static rendering tanpa ADR.
10. **Fitur 3D wajib punya fallback** (daftar bagian berbasis teks/2D) jika WebGL gagal dimuat.

## 4. Konvensi

- **Bahasa UI**: Bahasa Indonesia (default). Siapkan struktur i18n agar bahasa Inggris bisa ditambah.
- **Bahasa kode**: identifier, nama tabel, kolom, dan komentar kode dalam bahasa Inggris. Dokumen di `docs/` dalam Bahasa Indonesia.
- **Penamaan**: tabel MySQL `snake_case` jamak (`service_records`); model Prisma `PascalCase` tunggal dengan `@@map`; komponen React `PascalCase`; file non-komponen `kebab-case`.
- **Commit per tugas**: satu commit untuk satu tugas yang sudah selesai (misalnya tugas A, lalu tugas B, lalu tugas C), jangan menggabungkan banyak tugas dalam satu commit dan jangan commit tugas yang belum selesai. Format Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`), boleh berbahasa Indonesia atau Inggris.
- **Package manager**: npm 11 (ADR-010). Gunakan `npx expo install` untuk dependency Expo agar versinya sesuai SDK.
- **Gaya penulisan dokumen**: jangan gunakan karakter em dash dan simbol ampersand; pakai koma, titik dua, atau kata "dan".

## 5. Perintah penting

| Perintah (dari root) | Fungsi |
|---|---|
| `npx npm@11 install` | Pasang dependency dan bangun `packages/shared` |
| `npm run lint`, `npm run typecheck`, `npm test` | Wajib lulus sebelum commit |
| `npm run dev:api`, `npm run dev:mobile`, `npm run dev:web` | Development (web saja: `dev:web`, buka `http://localhost:8081`) |
| `npm run user:password -w @prime-garage/api -- --username <u> --email <e>` | Buat akun atau reset password |
| `node apps/api/scripts/smoke-test.mjs` | Tes end-to-end API (API berjalan, dev login aktif) |
| `npm run generate:model` | Bangun ulang `underbone_v1.glb` |

## 6. Definisi selesai (Definition of Done)

Sebuah fitur dianggap selesai jika:
- Memenuhi kebutuhan ber-ID di PRD dan ID tersebut disebut di pesan commit atau PR.
- Lulus `npm run lint`, `npm run typecheck`, dan test terkait.
- Berjalan di **web (SPA)** dan **Android**.
- Dokumen terkait di `docs/` sudah diperbarui, dan status di `docs/ROADMAP.md` diubah.
