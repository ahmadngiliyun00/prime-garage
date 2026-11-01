# Arsitektur PrimeGarage

Dokumen ini **mengunci** tech stack. Perubahan hanya lewat ADR baru (lihat bagian 6) dan persetujuan pemilik proyek.

## 1. Gambaran sistem

```
┌───────────────────────────┐        ┌────────────────────────────────────────────────────┐
│  apps/mobile (Expo)        │        │  VPS Ubuntu 24.04 (aaPanel)                         │
│                            │ HTTPS  │                                                      │
│  Android (AAB)             │───────▶│  Nginx: primegarage.ngiliyun.my.id                   │
│  Web SPA (PWA untuk Mac)   │  WSS   │   ├─ /            → file statis SPA (dist/)          │
│                            │◀──────▶│   └─ /api/        → reverse proxy 127.0.0.1:3000     │
│  React Three Fiber (3D)    │        │                     (REST + Socket.IO /api/socket.io)│
│  TanStack Query            │        │  PM2                                                 │
│  socket.io-client          │        │   ├─ prime-garage-api     (NestJS, REST + WS)        │
└───────────────────────────┘        │   └─ prime-garage-worker  (cron pengingat 07.00 WIB) │
             ▲                        │  MySQL 8  (database: prime_garage)                   │
             │ Push (Expo Push/FCM)   │  Disk: /www/prime-garage/storage (unggahan)          │
             └────────────────────────│                                                      │
                                      └────────────────────────────────────────────────────┘
                                          │ SMTP Google Workspace (smtp.gmail.com:465) → email pengingat
```

## 2. Tech stack yang dikunci

Versi di bawah adalah versi saat scaffold (1 November 2026). Upgrade versi minor/patch boleh; upgrade mayor perlu ADR.

### 2.1 Aplikasi klien (`apps/mobile`)
| Kebutuhan | Pilihan | Catatan |
|---|---|---|
| Framework | **Expo SDK 58** + React Native 0.88 + React 19.3 | Satu kode untuk Android, web, dan nanti iOS |
| Routing | **Expo Router** (file-based, folder `src/app`) | |
| Bahasa | **TypeScript** strict (`noUncheckedIndexedAccess`) | |
| Output web | **SPA** (`web.output: "single"`) | Di-host statis di Nginx |
| Styling | **NativeWind 4** (Tailwind 3 untuk React Native) | Mode gelap mengikuti sistem |
| Data server | **TanStack Query 5** | Cache, refetch, invalidasi dari event realtime |
| Form | State React + **zod** (skema dari `packages/shared`) lewat helper `src/lib/form.ts` | Pesan galat sama di client dan server |
| 3D | **three.js** + **@react-three/fiber 9** (web dan native via `expo-gl`) + **@react-three/drei** (OrbitControls web) | Detail di `docs/3D-VIEWER.md` |
| Realtime | **socket.io-client** | |
| Login Google | Web: **Google Identity Services**; Android: **@react-native-google-signin/google-signin** | ID token dikirim ke API |
| Penyimpanan token | **expo-secure-store** (native); web memakai cookie httpOnly | |
| Push | **expo-notifications** | Android lewat FCM |
| Build Android | **EAS Build** (`.aab`) dan **EAS Submit** | |
| Lint | **ESLint** (`eslint-config-expo`) | |

### 2.2 API (`apps/api`)
| Kebutuhan | Pilihan | Catatan |
|---|---|---|
| Runtime | **Node.js 22 LTS**, ESM | Dijalankan dengan **PM2** |
| Framework | **NestJS 12** | Struktur modul yang tegas sehingga kerangka proyek tetap konsisten |
| ORM dan migrasi | **Prisma 7** (provider `mysql`, driver adapter `@prisma/adapter-mariadb`) | Skema: `apps/api/prisma/schema.prisma`, konfigurasi: `apps/api/prisma7.config.ts` |
| Database | **MySQL 8**, charset `utf8mb4`, collation `utf8mb4_unicode_ci` | |
| Realtime | **Socket.IO** lewat NestJS WebSocket Gateway, path `/api/socket.io` | Room per garasi dan per pengguna |
| Autentikasi | Verifikasi Google ID token (`google-auth-library`), lalu terbitkan **JWT** sendiri (`jose`) | Access token 15 menit, refresh token 30 hari dirotasi |
| Validasi | **zod 4** (dari `packages/shared`) lewat `ZodValidationPipe` | |
| Penjadwalan | **@nestjs/schedule** di proses worker terpisah | |
| Email | **Nodemailer** (SMTP Google Workspace) | Template HTML sederhana |
| Push | **expo-server-sdk** | |
| Unggahan | **Multer** ke disk lokal, gambar dikompres ke WebP dengan **sharp** | `StorageService`, URL bertanda tangan 1 jam |
| Keamanan HTTP | **helmet**, **@nestjs/throttler**, CORS terbatas | |
| Log | Logger bawaan NestJS | Dibaca lewat `pm2 logs` |
| Lint dan test | **oxlint**, **vitest** | |

### 2.3 Paket bersama (`packages/shared`)
- Enum dan tipe domain (`VehicleCategory`, `ServiceAction`, `ComponentStatus`, dll.) beserta label Bahasa Indonesia.
- Skema zod untuk semua payload API dan tipe respons (`api-types.ts`).
- **Fungsi murni perhitungan status komponen** (`computeComponentStatus`) dan aturan pengingat sesuai `docs/MAINTENANCE-LOGIC.md`, dipakai oleh app (tampilan) dan worker (pengingat).
- Katalog: komponen dan konten edukasi, interval default, merek dan model, registri model 3D beserta posisi kamera dan titik sentuh.
- Kontrak realtime (path dan nama event).
- Dibangun ke `dist/` (ESM). `npm install` di root otomatis membangunnya (`postinstall`).

### 2.4 Tooling
- **npm 11** dengan workspaces (`packageManager` di `package.json` root). npm 10 punya bug resolver pada dependency proyek ini.
- Skrip install yang diizinkan dicatat di `allowScripts` (`package.json` root).

## 3. Struktur repositori

```
prime-garage/
├─ AGENTS.md, CLAUDE.md, README.md, LICENSE
├─ package.json              # npm workspaces + skrip lint/typecheck/test
├─ docs/                     # sumber kebenaran desain
├─ packages/shared/          # tipe, zod, katalog, logika perawatan (src → dist)
├─ apps/
│  ├─ mobile/                # Expo
│  │  ├─ src/app/            # rute Expo Router
│  │  │  ├─ login.tsx, privacy.tsx, delete-account.tsx
│  │  │  └─ (app)/           # butuh login
│  │  │     ├─ (tabs)/       # index (Garasi), workshops, notifications, settings
│  │  │     ├─ vehicles/new.tsx
│  │  │     ├─ vehicles/[id]/index.tsx      # tab 3D, Kondisi, Servis, Info
│  │  │     ├─ vehicles/[id]/{edit,odometer,rules}.tsx
│  │  │     ├─ vehicles/[id]/services/{new,[serviceId]}.tsx
│  │  │     └─ workshops/{new,[workshopId]}.tsx
│  │  ├─ src/features/       # auth, vehicles, viewer3d, services, workshops
│  │  ├─ src/components/     # komponen UI umum (ui.tsx)
│  │  ├─ src/lib/            # api, auth, hooks, realtime, push, upload, form
│  │  ├─ assets/models/      # file .glb + LICENSES.md
│  │  ├─ public/             # index.html, manifest.json (PWA), ikon
│  │  ├─ scripts/            # generator model 3D, server pratinjau SPA
│  │  └─ app.config.ts, eas.json
│  └─ api/                   # NestJS
│     ├─ prisma/schema.prisma, prisma/migrations/, prisma/seed.ts
│     ├─ src/
│     │  ├─ modules/         # auth, users, catalog, vehicles, workshops, services, attachments,
│     │  │                   # maintenance, dashboard, notifications, realtime, mail, health
│     │  ├─ common/          # guard, pipe, filter, otorisasi garasi, storage, serializer
│     │  ├─ main.ts          # proses API
│     │  └─ worker.ts        # proses worker (cron)
│     ├─ scripts/smoke-test.mjs
│     └─ ecosystem.config.cjs  # konfigurasi PM2
```

## 4. Alur penting

### 4.1 Login Google
1. Web memakai tombol Google Identity Services; Android memakai Google Sign-In native. Keduanya menghasilkan ID token dengan audience **client ID web**.
2. App mengirim `POST /api/auth/google { idToken }`.
3. API memverifikasi token dengan `google-auth-library` (audience harus ada di `GOOGLE_CLIENT_IDS`).
4. API membuat/menemukan `users` dan `user_identities`, membuat garasi pribadi jika belum ada (FR-VEH-01).
5. API mengembalikan access token (JWT, 15 menit) dan refresh token (acak, disimpan sebagai hash SHA-256 di `refresh_tokens`).
   - Native (header `X-Client: native`): refresh token di body, disimpan di `expo-secure-store`.
   - Web: refresh token di cookie `pg_refresh` (`httpOnly; Secure; SameSite=Strict; Path=/api/auth`).
6. `POST /api/auth/refresh` merotasi refresh token. Refresh token yang dipakai ulang membatalkan seluruh keluarga token (deteksi pencurian).
7. Untuk development tersedia `POST /api/auth/dev-login` yang hanya aktif jika `AUTH_DEV_LOGIN_ENABLED=true`; API menolak start bila opsi ini aktif di production.

### 4.2 Realtime
- Klien membuka koneksi Socket.IO ke `wss://primegarage.ngiliyun.my.id` dengan path `/api/socket.io` dan access token pada handshake.
- Server memverifikasi JWT, lalu memasukkan socket ke room `garage:<garageId>` untuk setiap garasi yang diikuti pengguna dan `user:<userId>`.
- Setiap mutasi yang berhasil memancarkan event ke room terkait: `vehicle.changed`, `odometer.changed`, `service.changed`, `workshop.changed`, `rules.changed`, `notification.created`.
- Event hanya membawa ID. Klien menanggapinya dengan menginvalidasi query TanStack terkait lalu mengambil ulang lewat REST. Ini menjaga otorisasi tetap di REST.
- Saat reconnect, klien menginvalidasi semua query aktif (FR-SYNC-02).
- Worker tidak punya gateway; event dari worker diteruskan ke API lewat `POST /api/internal/realtime` dengan header `x-internal-secret`.

### 4.3 Pengingat
- Proses `prime-garage-worker` menjalankan cron `REMINDER_CRON` (default `0 0 * * *` UTC = 07.00 WIB).
- Worker menghitung status semua komponen kendaraan aktif dengan `computeComponentStatus` dari `packages/shared`.
- Notifikasi baru dibuat sesuai aturan di `docs/MAINTENANCE-LOGIC.md` bagian 5, lalu dikirim sebagai satu ringkasan per pengguna via Expo Push dan SMTP.
- Jalankan manual: `node dist/worker.js --once` (opsi `--now=<ISO>` untuk simulasi tanggal).

## 5. Keamanan
- HTTPS (sertifikat Let's Encrypt dari aaPanel).
- Web dan API satu origin, sehingga CORS hanya perlu untuk origin development (`CORS_ORIGINS`).
- Rate limit (`@nestjs/throttler`) pada endpoint auth dan unggahan.
- Helmet untuk header keamanan.
- Otorisasi per garasi di setiap service (lihat `docs/DATABASE.md` bagian 4).
- Unggahan: hanya `image/jpeg`, `image/png`, `image/webp`, maks 5 MB, dikonversi ke WebP, nama file UUID, dilayani lewat URL bertanda tangan HMAC yang berlaku 1 jam.
- User MySQL khusus aplikasi dengan hak terbatas pada database `prime_garage` saja.

## 6. Architecture Decision Records (ADR)

### ADR-001: Expo sebagai framework klien
- **Status**: Diterima
- **Konteks**: Butuh Android (Play Store), web, dan kemungkinan Mac, dengan satu basis kode. Pemilik familiar dengan React dan Expo.
- **Keputusan**: Expo + Expo Router. Mac dilayani lewat PWA dari versi web.
- **Alternatif ditolak**: Next.js + Capacitor (3D native dan push lebih rumit), Flutter (bukan stack pemilik), react-native-macos (tidak didukung Expo secara resmi).

### ADR-002: Web sebagai SPA
- **Status**: Diterima
- **Keputusan**: `web.output: "single"`. Hasil `expo export -p web` di-host statis di Nginx dengan fallback ke `index.html`.
- **Alasan**: Aplikasi bersifat privat (di balik login), SEO tidak dibutuhkan, deploy paling sederhana di VPS.

### ADR-003: MySQL 8 + Prisma
- **Status**: Diterima
- **Konteks**: Deploy di VPS milik pemilik; pemilik familiar dengan MySQL; aaPanel sudah menyediakan MySQL.
- **Keputusan**: MySQL 8 dengan Prisma sebagai ORM dan alat migrasi.
- **Alternatif ditolak**: Supabase/PostgreSQL (menambah stack yang harus dikelola dan dipelajari), Firebase (vendor lock-in, NoSQL kurang cocok untuk data relasional servis).

### ADR-004: API NestJS terpisah, dijalankan dengan PM2
- **Status**: Diterima
- **Konteks**: Dengan MySQL, realtime, cron, dan autentikasi harus ditangani backend sendiri. PM2 sudah terpasang di VPS.
- **Keputusan**: NestJS (TypeScript) agar tipe dan skema zod dapat dibagi dengan app lewat `packages/shared`. Dua proses PM2: API dan worker.
- **Alternatif ditolak**: Laravel + Reverb (bahasa berbeda dengan klien, tidak bisa berbagi tipe dan logika perawatan), Express polos (kurang struktur, mudah berantakan saat dikerjakan banyak agent).

### ADR-005: Socket.IO untuk realtime, event berisi ID saja
- **Status**: Diterima
- **Keputusan**: Socket.IO dengan room per garasi; event hanya berisi ID dan memicu refetch REST.
- **Catatan skala**: MVP menjalankan satu instance API (PM2 fork mode). Jika perlu lebih dari satu instance, tambahkan Redis adapter Socket.IO dan sticky session (ADR baru).

### ADR-006: Model 3D berbasis template kategori
- **Status**: Diterima
- **Konteks**: Model 3D akurat untuk setiap tipe motor tidak realistis untuk MVP.
- **Keputusan**: Satu model template per kategori (mulai dari **bebek/underbone** sebagai acuan Supra X 125). Model spesifik per tipe dapat ditambahkan kemudian dengan konvensi mesh yang sama. Detail di `docs/3D-VIEWER.md`.

### ADR-007: Autentikasi JWT sendiri dengan login sosial
- **Status**: Diterima
- **Keputusan**: Penyedia identitas (Google, nanti Facebook/Apple) hanya untuk verifikasi identitas. Sesi dikelola API dengan JWT akses berumur pendek dan refresh token yang dirotasi. Tabel `user_identities` memungkinkan satu pengguna menautkan beberapa penyedia.

### ADR-008: Web dan API dalam satu domain
- **Status**: Diterima
- **Konteks**: Pemilik menetapkan domain `primegarage.ngiliyun.my.id`.
- **Keputusan**: SPA dilayani di `/`, API dan Socket.IO di `/api` pada domain yang sama (Nginx reverse proxy).
- **Alasan**: Satu sertifikat dan satu situs di aaPanel, tidak perlu CORS di production, cookie refresh `SameSite=Strict` bekerja tanpa pengecualian.

### ADR-009: Model 3D spesifik untuk Honda Supra X 125 dari Sketchfab
- **Status**: Diterima
- **Konteks**: Pemilik menyediakan model "Honda Supra x 125" (boiledfish.vvti, CC BY 4.0). Model hanya memisahkan roda, garpu, swing arm, spakbor, dan setang.
- **Keputusan**: Model dinormalkan dan diberi nama node sesuai konvensi oleh `apps/mobile/scripts/prepare-supra-model.mjs`. Bagian tanpa mesh sendiri (oli, busi, filter udara, aki, dll.) ditandai dengan titik sentuh (hotspot). Model prosedural `underbone_v1` tetap menjadi cadangan otomatis jika model spesifik gagal dimuat di perangkat. Kredit penulis wajib tampil di bawah viewer.

### ADR-010: npm 11 sebagai package manager
- **Status**: Diterima
- **Konteks**: npm 10 gagal menyusun dependency tree proyek ini (bug `edgesOut` di resolver).
- **Keputusan**: Gunakan npm 11 (`npx npm@11 install` atau pasang global `npm i -g npm@11`). Field `packageManager` dan `engines` di root mencatat versinya.
