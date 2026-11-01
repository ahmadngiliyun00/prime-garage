# Deployment PrimeGarage

Target produksi: **VPS Ubuntu 24.04 dengan aaPanel**, Nginx, MySQL 8, Node.js 22 LTS, npm 11, PM2. Android didistribusikan lewat Google Play (AAB dari EAS Build).

| Komponen | Alamat |
|---|---|
| Web (SPA) | `https://primegarage.ngiliyun.my.id/` |
| API REST | `https://primegarage.ngiliyun.my.id/api/...` |
| Realtime | `wss://primegarage.ngiliyun.my.id/api/socket.io` |
| Package Android | `my.id.ngiliyun.primegarage` |
| Email pengirim | Google Workspace `@ngiliyun.my.id` (usulan `noreply@ngiliyun.my.id`) |

## 0. Persiapan sekali saja

### 0.1 Server
Pastikan Node.js 22 dan PM2 tersedia, lalu pasang npm 11 (ADR-010):

```bash
npm install -g npm@11
```

```bash
mkdir -p /www/prime-garage/storage
```

```bash
git clone https://github.com/ahmadngiliyun00/prime-garage.git /www/prime-garage/app
```

### 0.2 Google OAuth (Google Cloud Console)
1. Buat project, lalu **OAuth consent screen** (External, nama aplikasi PrimeGarage, domain `ngiliyun.my.id`, tautan kebijakan privasi `https://primegarage.ngiliyun.my.id/privacy`).
2. **Credentials > OAuth client ID > Web application**: Authorized JavaScript origins `https://primegarage.ngiliyun.my.id` (tambahkan `http://localhost:8081` untuk development). Catat client ID ini sebagai **client ID web**.
3. **Credentials > OAuth client ID > Android**: package `my.id.ngiliyun.primegarage`, SHA-1 dari EAS (`eas credentials`) dan dari Play Console (App signing key) setelah aplikasi diunggah.
4. Client ID web dan Android dimasukkan ke `GOOGLE_CLIENT_IDS` (API). Client ID web juga ke `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (app).

### 0.3 SMTP Google Workspace
1. Buat (atau pakai) akun `noreply@ngiliyun.my.id` di Google Workspace.
2. Aktifkan verifikasi 2 langkah pada akun itu, lalu buat **App Password** (Akun Google > Keamanan > Sandi aplikasi).
3. Isi `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER=noreply@ngiliyun.my.id`, `SMTP_PASS=<app password>`.
4. Batas kirim Google Workspace sekitar 2.000 email per hari per akun; pengingat dikirim sebagai satu email ringkasan per pengguna per hari.

### 0.4 Expo dan push notification
1. Buat akun Expo, lalu di `apps/mobile` jalankan `npx eas-cli@latest init` untuk mendapatkan **EAS project ID**. Simpan sebagai variabel `EAS_PROJECT_ID` di EAS (Environment variables) agar `app.config.ts` mengisinya.
2. Buat project Firebase untuk package `my.id.ngiliyun.primegarage`, buat **service account key FCM V1**, unggah ke EAS (`eas credentials` > Android > Push Notifications).

## 1. Variabel lingkungan

### 1.1 API (`apps/api/.env`, tidak di-commit)
Salin dari `apps/api/.env.example`. Nilai penting:

| Variabel | Nilai produksi |
|---|---|
| `NODE_ENV` | `production` |
| `PORT`, `HOST` | `3000`, `127.0.0.1` |
| `TRUST_PROXY` | `true` |
| `DATABASE_URL` | `mysql://pg_user:<password>@127.0.0.1:3306/prime_garage` |
| `JWT_ACCESS_SECRET` | acak minimal 32 karakter |
| `GOOGLE_CLIENT_IDS` | client ID web dan Android, dipisah koma |
| `APP_WEB_URL` | `https://primegarage.ngiliyun.my.id` |
| `CORS_ORIGINS` | `https://primegarage.ngiliyun.my.id` |
| `AUTH_DEV_LOGIN_ENABLED` | `false` (API menolak start jika `true` di production) |
| `STORAGE_DIR` | `/www/prime-garage/storage` |
| `SMTP_*`, `MAIL_FROM` | lihat bagian 0.3 |
| `INTERNAL_API_URL`, `INTERNAL_API_SECRET` | `http://127.0.0.1:3000`, acak minimal 16 karakter |
| `REMINDER_CRON` | `0 0 * * *` (07.00 WIB) |

Membuat secret acak:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 1.2 App (`apps/mobile/.env` untuk build web, atau EAS environment untuk Android)
| Variabel | Nilai produksi |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://primegarage.ngiliyun.my.id` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | client ID web |
| `EXPO_PUBLIC_DEV_LOGIN` | `false` |

Variabel `EXPO_PUBLIC_*` tertanam di bundle saat build, jadi **jangan** isi rahasia di sana.

## 2. Database (MySQL)

1. aaPanel > Databases > Add database: nama `prime_garage`, user `pg_user`, akses `127.0.0.1` saja, charset `utf8mb4`.
2. Migrasi dan seed katalog dijalankan dari folder `/www/prime-garage/app/apps/api`:

```bash
npx prisma migrate deploy
```

```bash
npm run db:seed
```

Seed bersifat idempoten (aman dijalankan ulang saat katalog bertambah).

3. Backup: aaPanel > Cron > Backup database `prime_garage` setiap hari, simpan 14 hari. Backup juga folder `/www/prime-garage/storage`.

## 3. Build dan jalankan API serta worker (PM2)

Dari folder `/www/prime-garage/app`:

```bash
git pull origin main
```

```bash
npm ci
```

```bash
npm run build:api
```

Dari folder `/www/prime-garage/app/apps/api`:

```bash
npx prisma migrate deploy
```

```bash
pm2 startOrReload ecosystem.config.cjs
```

```bash
pm2 save
```

Sekali saja agar PM2 hidup setelah reboot:

```bash
pm2 startup
```

`ecosystem.config.cjs` menjalankan dua proses: `prime-garage-api` (fork, 1 instance) dan `prime-garage-worker` (fork, **wajib 1 instance** agar cron tidak ganda). Cek kesehatan:

```bash
curl -s http://127.0.0.1:3000/api/health
```

## 4. Build web (SPA)

Dari folder `/www/prime-garage/app/apps/mobile` (pastikan `.env` berisi nilai bagian 1.2):

```bash
npx expo export -p web
```

Hasil di `apps/mobile/dist/`.

## 5. Nginx (aaPanel)

aaPanel > Website > Add site `primegarage.ngiliyun.my.id` > SSL (Let's Encrypt, Force HTTPS) > Config. Set root dan tambahkan blok berikut di dalam `server`:

```nginx
root /www/prime-garage/app/apps/mobile/dist;
index index.html;
client_max_body_size 6m;

types { model/gltf-binary glb; }

# API dan Socket.IO (ADR-008)
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}

# SPA fallback
location / {
    try_files $uri $uri/ /index.html;
}

location = /index.html {
    add_header Cache-Control "no-cache";
}

location /_expo/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

Pratinjau perilaku yang sama di lokal (statis, fallback SPA, proxy `/api` dan WebSocket):

```bash
node apps/mobile/scripts/serve-spa.mjs 8081 http://127.0.0.1:3000
```

**PWA untuk macOS**: `public/manifest.json` dan ikon sudah disertakan. Pengguna Mac memasang lewat Safari (File > Add to Dock) atau Chrome (ikon Install di bilah alamat).

## 6. Android (Google Play)

### 6.1 Profil EAS (`apps/mobile/eas.json`)
| Profil | Output | Kegunaan |
|---|---|---|
| `development` | Development build (APK) | Debug di HP fisik |
| `preview` | APK | Uji internal tanpa Play Store |
| `production` | **AAB** | Unggah ke Google Play |

Perintah, dari folder `apps/mobile`:

```bash
npx eas-cli@latest build -p android --profile production
```

```bash
npx eas-cli@latest submit -p android --profile production
```

### 6.2 Checklist Google Play
- [x] `applicationId` final: `my.id.ngiliyun.primegarage`. **Tidak bisa diubah setelah rilis.**
- [ ] Akun Google Play Console aktif. Akun developer personal baru wajib menjalankan **closed testing** dengan sejumlah tester selama periode tertentu sebelum boleh rilis produksi; cek syarat terbaru di Play Console.
- [ ] Play App Signing aktif (dikelola EAS credentials).
- [ ] SHA-1 sertifikat signing didaftarkan di OAuth client Android (bagian 0.2).
- [ ] Kredensial FCM diunggah ke EAS (bagian 0.4).
- [ ] Ikon 512×512 (`apps/mobile/public/logo512.png`), feature graphic 1024×500, minimal 2 screenshot HP.
- [ ] Deskripsi singkat dan lengkap (Bahasa Indonesia).
- [ ] URL kebijakan privasi: `https://primegarage.ngiliyun.my.id/privacy`.
- [ ] URL penghapusan akun: `https://primegarage.ngiliyun.my.id/delete-account` (FR-AUTH-04).
- [ ] Formulir Data Safety: email, nama, foto profil (dari Google), data kendaraan, foto nota, token push.
- [ ] Rating konten (kuesioner IARC).
- [ ] Target API level sesuai syarat Play terbaru (mengikuti Expo SDK).

## 7. Urutan deploy rilis
1. Merge ke `main`, tag versi (`v0.x.y`).
2. Deploy API dan worker (bagian 3), pastikan migrasi sukses dan `pm2 logs` bersih.
3. Build web (bagian 4); Nginx langsung melayani `dist/` yang baru.
4. Build AAB dan unggah ke track internal/closed testing (bagian 6), lalu promosikan ke produksi.
5. Uji cepat: login, tambah kendaraan, buka 3D, catat servis, cek realtime di dua perangkat.

## 8. Development lokal

1. MySQL 8 lokal dengan database `prime_garage`.
2. Salin `apps/api/.env.example` ke `apps/api/.env`, set `NODE_ENV=development`, `AUTH_DEV_LOGIN_ENABLED=true`, `CORS_ORIGINS=http://localhost:8081`, `STORAGE_DIR=../../storage`.
3. Salin `apps/mobile/.env.example` ke `apps/mobile/.env`.

Dari root repo:

```bash
npx npm@11 install
```

```bash
npm run db:migrate -w @prime-garage/api
```

```bash
npm run db:seed -w @prime-garage/api
```

```bash
npm run dev:api
```

Di terminal lain:

```bash
npm run dev:mobile
```

Tes end-to-end API (API harus berjalan dengan dev login aktif), dari `apps/api`:

```bash
node scripts/smoke-test.mjs
```
