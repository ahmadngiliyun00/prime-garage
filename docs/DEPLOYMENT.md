# Deployment PrimeGarage

Target produksi: **VPS Ubuntu 24.04 dengan aaPanel**, Nginx, MySQL 8, Node.js LTS, PM2. Android didistribusikan lewat Google Play (AAB dari EAS Build).

Domain contoh (final: PRD Keputusan terbuka no. 2):
- `app.primegarage.example` untuk web SPA
- `api.primegarage.example` untuk API dan realtime

## 1. Variabel lingkungan

### 1.1 API (`apps/api/.env`, tidak di-commit)
| Variabel | Contoh | Keterangan |
|---|---|---|
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | Hanya listen di `127.0.0.1` |
| `DATABASE_URL` | `mysql://pg_user:***@127.0.0.1:3306/prime_garage` | User MySQL khusus aplikasi |
| `JWT_ACCESS_SECRET` | acak 64 karakter | |
| `JWT_ACCESS_TTL` | `15m` | |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | |
| `GOOGLE_CLIENT_IDS` | `xxx.apps.googleusercontent.com,yyy...` | Client ID web dan Android, dipisah koma |
| `CORS_ORIGINS` | `https://app.primegarage.example` | |
| `STORAGE_DIR` | `/www/prime-garage/storage` | Di luar folder kode |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | | Penyedia SMTP |
| `EXPO_ACCESS_TOKEN` | | Opsional, untuk keamanan push |
| `APP_WEB_URL` | `https://app.primegarage.example` | Untuk tautan di email |

### 1.2 App (`apps/mobile/.env`, ditanam saat build)
| Variabel | Contoh |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.primegarage.example` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | |

Variabel `EXPO_PUBLIC_*` tertanam di bundle saat build, jadi **jangan** isi rahasia di sana.

## 2. Database (MySQL)

1. aaPanel → Databases → Add database: nama `prime_garage`, user `pg_user`, akses `127.0.0.1` saja, charset `utf8mb4`.
2. Migrasi dijalankan dari server saat deploy API:

Jalankan dari folder `/www/prime-garage/app/apps/api`:

```bash
npx prisma migrate deploy
```

3. Seed data katalog (sekali, atau saat katalog bertambah):

```bash
npm run db:seed
```

4. Backup: aaPanel → Cron → Backup database `prime_garage` setiap hari, simpan 14 hari. Backup juga folder `STORAGE_DIR`.

## 3. API dan worker (PM2)

Struktur di server:
```
/www/prime-garage/
├─ app/        # hasil git clone repo
└─ storage/    # unggahan pengguna (persisten antar deploy)
```

`apps/api/ecosystem.config.cjs` (dibuat saat scaffold):
```js
module.exports = {
  apps: [
    {
      name: "prime-garage-api",
      script: "dist/main.js",
      cwd: __dirname,
      exec_mode: "fork",      // satu instance, lihat ADR-005
      instances: 1,
      env: { NODE_ENV: "production" },
      max_memory_restart: "512M",
    },
    {
      name: "prime-garage-worker",
      script: "dist/worker.js",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,           // WAJIB 1 agar cron tidak berjalan ganda
      env: { NODE_ENV: "production" },
    },
  ],
};
```

Langkah deploy API. Dari folder `/www/prime-garage/app`:

```bash
git pull origin main
```

```bash
npm ci
```

```bash
npm run build -w packages/shared
```

```bash
npm run build -w apps/api
```

Lalu dari folder `/www/prime-garage/app/apps/api`:

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

### 3.1 Nginx untuk `api.<domain>`
aaPanel → Website → Add site `api.primegarage.example` → SSL (Let's Encrypt) → Config, isi blok berikut di dalam `server`:

```nginx
client_max_body_size 6m;

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;      # WebSocket untuk Socket.IO
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;                    # koneksi realtime jangka panjang
}
```

API harus mengaktifkan `trust proxy` agar IP dan protokol asli terbaca.

## 4. Web SPA

Build bisa di lokal/CI lalu diunggah, atau langsung di server:

Dari folder `/www/prime-garage/app/apps/mobile`:

```bash
npx expo export -p web
```

Hasil di `apps/mobile/dist/`. Arahkan root situs `app.primegarage.example` ke folder tersebut (atau salin ke `/www/wwwroot/app.primegarage.example`).

Nginx untuk `app.<domain>`:

```nginx
root /www/prime-garage/app/apps/mobile/dist;
index index.html;

types { model/gltf-binary glb; }

location / {
    try_files $uri $uri/ /index.html;            # fallback SPA
}

location = /index.html {
    add_header Cache-Control "no-cache";
}

location ~* \.(js|css|png|jpg|jpeg|webp|svg|ico|woff2|glb)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**PWA untuk macOS**: sediakan `manifest.json` (nama, ikon 192 dan 512 px, `display: standalone`, `theme_color`) lewat konfigurasi web Expo. Pengguna Mac memasang lewat Safari (File → Add to Dock) atau Chrome (Install app). Service worker untuk cache offline menyusul.

## 5. Android (Google Play)

### 5.1 Profil EAS (`apps/mobile/eas.json`)
| Profil | Output | Kegunaan |
|---|---|---|
| `development` | Development build (APK) | Debug di HP fisik |
| `preview` | APK | Uji internal tanpa Play Store |
| `production` | **AAB** | Unggah ke Google Play |

Perintah, dari folder `apps/mobile`:

```bash
eas build -p android --profile production
```

```bash
eas submit -p android --profile production
```

### 5.2 Checklist Google Play
- [ ] `applicationId` final (PRD Keputusan terbuka no. 1). **Tidak bisa diubah setelah rilis.**
- [ ] Akun Google Play Console aktif. Akun developer personal baru wajib menjalankan **closed testing** dengan sejumlah tester selama periode tertentu sebelum boleh rilis produksi; cek syarat terbaru di Play Console.
- [ ] Play App Signing aktif (dikelola EAS credentials).
- [ ] SHA-1 sertifikat signing (dari Play Console dan EAS) didaftarkan di Google Cloud OAuth client Android.
- [ ] Firebase project untuk FCM, kredensial diunggah ke EAS agar push notification berjalan.
- [ ] Ikon 512×512, feature graphic 1024×500, minimal 2 screenshot HP.
- [ ] Deskripsi singkat dan lengkap (Bahasa Indonesia).
- [ ] URL kebijakan privasi (halaman di `app.<domain>/privacy`).
- [ ] URL penghapusan akun (halaman di `app.<domain>/delete-account`), sesuai FR-AUTH-04.
- [ ] Formulir Data Safety: email, nama, foto profil (dari Google), data kendaraan, foto nota, token push.
- [ ] Rating konten (kuesioner IARC).
- [ ] Target API level sesuai syarat Play terbaru (mengikuti Expo SDK terbaru).

## 6. Urutan deploy rilis
1. Merge ke `main`, tag versi (`v0.x.y`).
2. Deploy API (bagian 3), pastikan migrasi sukses dan `pm2 logs` bersih.
3. Build dan deploy web (bagian 4).
4. Build AAB dan unggah ke track internal/closed testing (bagian 5), lalu promosikan ke produksi.
5. Uji cepat: login, tambah kendaraan, buka 3D, catat servis, cek realtime di dua perangkat.
