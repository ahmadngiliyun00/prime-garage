# Arsitektur PrimeGarage

Dokumen ini **mengunci** tech stack. Perubahan hanya lewat ADR baru (lihat bagian 6) dan persetujuan pemilik proyek.

## 1. Gambaran sistem

```
┌───────────────────────────┐        ┌──────────────────────────────────────────────┐
│  apps/mobile (Expo)        │        │  VPS Ubuntu 24.04 (aaPanel)                   │
│                            │ HTTPS  │                                                │
│  Android (AAB)             │───────▶│  Nginx                                         │
│  Web SPA (PWA untuk Mac)   │  WSS   │   ├─ app.<domain>  → file statis SPA (dist/)   │
│                            │◀──────▶│   └─ api.<domain>  → reverse proxy :3000       │
│  React Three Fiber (3D)    │        │                                                │
│  TanStack Query            │        │  PM2                                           │
│  socket.io-client          │        │   ├─ prime-garage-api     (NestJS, REST + WS) │
└───────────────────────────┘        │   └─ prime-garage-worker  (cron pengingat)     │
             ▲                        │                                                │
             │ Push (Expo Push/FCM)   │  MySQL 8  (database: prime_garage)             │
             └────────────────────────│  Disk: /www/prime-garage/storage (unggahan)    │
                                      └──────────────────────────────────────────────┘
                                                    │ SMTP → email pengingat
```

## 2. Tech stack yang dikunci

### 2.1 Aplikasi klien (`apps/mobile`)
| Kebutuhan | Pilihan | Catatan |
|---|---|---|
| Framework | **Expo** (SDK stabil terbaru saat scaffold) + React Native | Satu kode untuk Android, web, dan nanti iOS |
| Routing | **Expo Router** (file-based) | |
| Bahasa | **TypeScript** strict | |
| Output web | **SPA** (`web.output: "single"`) | Di-host statis di Nginx |
| Styling | **NativeWind** (Tailwind untuk React Native) | |
| Data server | **TanStack Query** | Cache, refetch, invalidasi dari event realtime |
| State lokal | **Zustand** | State UI saja (bukan data server) |
| Form | **react-hook-form** + **zod** (skema dari `packages/shared`) | |
| 3D | **three.js** + **@react-three/fiber** (web dan native via `expo-gl`) + **@react-three/drei** (web) | Detail di `docs/3D-VIEWER.md` |
| Realtime | **socket.io-client** | |
| Login Google | **expo-auth-session** / Google Sign-In, kirim ID token ke API | |
| Penyimpanan token | **expo-secure-store** (native), memori + refresh via cookie httpOnly (web) | |
| Push | **expo-notifications** | Android lewat FCM |
| Build Android | **EAS Build** (`.aab`) dan **EAS Submit** | |
| Tanggal | **date-fns** + **date-fns-tz** | |

### 2.2 API (`apps/api`)
| Kebutuhan | Pilihan | Catatan |
|---|---|---|
| Runtime | **Node.js LTS** | Dijalankan dengan **PM2** |
| Framework | **NestJS** | Struktur modul yang tegas sehingga kerangka proyek tetap konsisten |
| ORM dan migrasi | **Prisma** (provider `mysql`) | Sumber kebenaran skema: `apps/api/prisma/schema.prisma` |
| Database | **MySQL 8**, charset `utf8mb4`, collation `utf8mb4_unicode_ci` | |
| Realtime | **Socket.IO** lewat NestJS WebSocket Gateway | Room per garasi |
| Autentikasi | Verifikasi Google ID token (`google-auth-library`), lalu terbitkan **JWT** sendiri | Access token 15 menit, refresh token 30 hari dirotasi |
| Validasi | **zod** (dari `packages/shared`) | |
| Penjadwalan | **@nestjs/schedule** di proses worker terpisah | |
| Email | **Nodemailer** (SMTP) | Template HTML sederhana |
| Push | **expo-server-sdk** | |
| Unggahan | **Multer** ke disk lokal, gambar dikompres dengan **sharp** | Abstraksi `StorageService` agar bisa pindah ke S3 |
| Log | **pino** (nestjs-pino) | |
| Dokumentasi API | **@nestjs/swagger** di `/docs` (non-production) | |

### 2.3 Paket bersama (`packages/shared`)
- Enum dan tipe domain (`VehicleCategory`, `ServiceAction`, `ComponentStatus`, dll.).
- Skema zod untuk semua payload API.
- **Fungsi murni perhitungan status komponen** (`computeComponentStatus`) sesuai `docs/MAINTENANCE-LOGIC.md`, dipakai oleh app (tampilan) dan worker (pengingat).
- Nama event realtime.

## 3. Struktur repositori

```
prime-garage/
├─ AGENTS.md, CLAUDE.md, README.md, LICENSE
├─ package.json              # npm workspaces
├─ docs/                     # sumber kebenaran desain
├─ apps/
│  ├─ mobile/                # Expo
│  │  ├─ app/                # rute Expo Router
│  │  │  ├─ (auth)/login.tsx
│  │  │  ├─ (app)/index.tsx                 # dashboard garasi
│  │  │  ├─ (app)/vehicles/new.tsx
│  │  │  ├─ (app)/vehicles/[id]/index.tsx   # detail + 3D
│  │  │  ├─ (app)/vehicles/[id]/services/...
│  │  │  └─ (app)/settings/...
│  │  ├─ src/
│  │  │  ├─ features/        # auth, vehicles, viewer3d, services, workshops, reminders
│  │  │  ├─ components/      # komponen UI umum
│  │  │  ├─ lib/             # api-client, socket, query-client, storage
│  │  │  └─ theme/
│  │  ├─ assets/models/      # file .glb + LICENSES.md
│  │  └─ app.config.ts, eas.json
│  └─ api/                   # NestJS
│     ├─ prisma/schema.prisma, prisma/migrations/, prisma/seed.ts
│     ├─ src/
│     │  ├─ modules/         # auth, users, garages, vehicles, catalog, parts,
│     │  │                   # services, workshops, maintenance, notifications, realtime, storage
│     │  ├─ common/          # guard, interceptor, filter
│     │  ├─ main.ts          # proses API
│     │  └─ worker.ts        # proses worker (cron)
│     └─ ecosystem.config.cjs  # konfigurasi PM2
└─ packages/
   └─ shared/                # tipe, zod, logika perawatan
```

## 4. Alur penting

### 4.1 Login Google
1. App meminta Google ID token (expo-auth-session / Google Sign-In).
2. App mengirim `POST /auth/google { idToken }`.
3. API memverifikasi token dengan `google-auth-library` (cek `aud` sesuai client ID Android dan web).
4. API membuat/menemukan `users` dan `user_identities`, membuat garasi pribadi jika belum ada (FR-VEH-01).
5. API mengembalikan access token (JWT, 15 menit) dan refresh token (acak, disimpan sebagai hash di `refresh_tokens`).
   - Native: refresh token di `expo-secure-store`.
   - Web: refresh token di cookie `httpOnly; Secure; SameSite=Strict` pada domain API.
6. `POST /auth/refresh` merotasi refresh token. Refresh token yang dipakai ulang membatalkan seluruh keluarga token (deteksi pencurian).

### 4.2 Realtime
- Klien membuka koneksi Socket.IO ke `wss://api.<domain>/realtime` dengan access token pada handshake.
- Server memverifikasi JWT, lalu memasukkan socket ke room `garage:<garageId>` untuk setiap garasi yang diikuti pengguna.
- Setiap mutasi yang berhasil (create/update/delete kendaraan, odometer, servis, aturan) memancarkan event ke room garasi terkait, contoh:
  - `vehicle.updated { vehicleId }`
  - `odometer.created { vehicleId }`
  - `service.changed { vehicleId, serviceRecordId }`
  - `notification.created { notificationId }`
- Event hanya membawa ID. Klien menanggapinya dengan menginvalidasi query TanStack terkait lalu mengambil ulang lewat REST. Ini menjaga otorisasi tetap di REST dan menghindari data ganda.
- Saat reconnect, klien menginvalidasi semua query aktif (FR-SYNC-02).

### 4.3 Pengingat
- Proses `prime-garage-worker` menjalankan cron setiap hari pukul 07.00 WIB.
- Worker menghitung status semua komponen kendaraan aktif dengan `computeComponentStatus` dari `packages/shared`.
- Notifikasi baru dibuat sesuai aturan di `docs/MAINTENANCE-LOGIC.md` bagian 5, lalu dikirim via Expo Push dan SMTP.
- Worker dipisah dari API agar API bisa diskalakan tanpa menjalankan cron ganda.

## 5. Keamanan
- HTTPS di semua domain (sertifikat Let's Encrypt dari aaPanel).
- CORS API hanya mengizinkan origin `app.<domain>` (dan origin dev).
- Rate limit (`@nestjs/throttler`) pada endpoint auth dan unggahan.
- Helmet untuk header keamanan.
- Otorisasi per garasi di setiap service (lihat `docs/DATABASE.md` bagian 4).
- Unggahan: hanya `image/jpeg`, `image/png`, `image/webp`, maks 5 MB, nama file acak, dilayani lewat endpoint terotorisasi atau URL bertanda tangan berumur pendek.
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
