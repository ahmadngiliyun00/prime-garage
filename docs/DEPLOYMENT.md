# Deployment PrimeGarage

Target produksi: **VPS Ubuntu 24.04 dengan aaPanel**, Nginx, MySQL 8, Node.js 22 LTS, npm 11, PM2. Android didistribusikan lewat Google Play (AAB dari EAS Build).

Repo di-clone langsung ke folder site aaPanel: **`/www/wwwroot/primegarage.ngiliyun.my.id`** (disebut `APP` di bawah). Root Nginx **wajib** diarahkan ke `APP/apps/mobile/dist`, bukan ke `APP`, agar file seperti `apps/api/.env` tidak pernah terjangkau dari internet (bagian 5).

| Komponen | Alamat |
|---|---|
| Web (SPA) | `https://primegarage.ngiliyun.my.id/` |
| API REST | `https://primegarage.ngiliyun.my.id/api/...` |
| Realtime | `wss://primegarage.ngiliyun.my.id/api/socket.io` |
| Package Android | `my.id.ngiliyun.primegarage` |
| Email pengirim | Google Workspace `@ngiliyun.my.id` (usulan `noreply@ngiliyun.my.id`) |

## 0. Persiapan sekali saja

### 0.1 Server
1. Pastikan Node.js 22 atau lebih baru tersedia (`node -v`). Di aaPanel bisa lewat App Store > Node.js version manager, lalu pastikan `node` ada di PATH terminal.
2. Pasang npm 11 (ADR-010) dan PM2:

```bash
npm install -g npm@11 pm2
```

3. Buat site di aaPanel > Website > Add site: domain `primegarage.ngiliyun.my.id`, PHP **Static** (tanpa PHP), database tidak perlu dibuat dari sini. aaPanel membuat folder `/www/wwwroot/primegarage.ngiliyun.my.id`.
4. Kosongkan folder site lalu clone repo ke sana. aaPanel menaruh `.user.ini` yang dikunci (`chattr +i`); file itu sudah diabaikan git, jadi biarkan saja. Jika folder masih berisi `index.html` atau `404.html` bawaan aaPanel, hapus dulu agar clone berhasil:

```bash
cd /www/wwwroot/primegarage.ngiliyun.my.id
```

```bash
rm -f index.html 404.html
```

```bash
git clone https://github.com/ahmadngiliyun00/prime-garage.git /tmp/prime-garage && cp -a /tmp/prime-garage/. /www/wwwroot/primegarage.ngiliyun.my.id/ && rm -rf /tmp/prime-garage
```

5. Folder unggahan (foto nota, foto kendaraan) ada di dalam repo, tapi di luar root web dan diabaikan git:

```bash
mkdir -p /www/wwwroot/primegarage.ngiliyun.my.id/storage
```

### 0.2 GitHub OAuth App (login GitHub)
1. Buka https://github.com/settings/developers, pilih **OAuth Apps**, lalu **New OAuth App**.
2. Isi:
   - **Application name**: `PrimeGarage`
   - **Homepage URL**: `https://primegarage.ngiliyun.my.id`
   - **Redirect URIs** (klik **Add redirect URI** untuk menambah baris, tanpa wildcard): satu baris per alamat API yang dipakai.
     - `https://primegarage.ngiliyun.my.id/api/auth/github/callback` (production)
     - `http://localhost:3000/api/auth/github/callback` (web di komputer development)
     - `http://<ip-lan-komputer>:3000/api/auth/github/callback` (HP di Wi-Fi yang sama, misalnya `http://192.168.1.27:3000/api/auth/github/callback`)
   - **Enable Device Flow**: tidak dicentang. **Expire user access tokens**: boleh dicentang (token GitHub hanya dipakai sekali saat login).
3. Klik **Register application**, salin **Client ID**, lalu **Generate a new client secret** dan salin secret-nya (hanya tampil sekali).
4. Isi di `apps/api/.env`: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_ALLOWED_LOGINS=ahmadngiliyun00`, dan `API_PUBLIC_URL` (production: `https://primegarage.ngiliyun.my.id`; development: `http://localhost:3000`).
5. Di development, API memakai alamat yang dipakai untuk membukanya sebagai callback (localhost dari komputer, IP LAN dari HP), selama alamat itu terdaftar di Redirect URIs. Di production selalu `API_PUBLIC_URL`. Jika IP LAN komputer berubah, tambahkan Redirect URI baru.
6. Tombol "Masuk dengan GitHub" muncul otomatis setelah `GITHUB_CLIENT_ID` dan `GITHUB_CLIENT_SECRET` terisi dan API di-restart.

### 0.2b Google OAuth (Google Cloud Console, ditunda, FR-AUTH-09)
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
Salin dari `apps/api/.env.example`, lalu batasi aksesnya:

```bash
cd /www/wwwroot/primegarage.ngiliyun.my.id && cp apps/api/.env.example apps/api/.env && chmod 600 apps/api/.env
```

Nilai penting:

| Variabel | Nilai produksi |
|---|---|
| `NODE_ENV` | `production` |
| `PORT`, `HOST` | `3000`, `127.0.0.1` |
| `TRUST_PROXY` | `true` |
| `DATABASE_URL` | `mysql://pg_user:<password>@127.0.0.1:3306/prime_garage` |
| `JWT_ACCESS_SECRET` | acak minimal 32 karakter |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | dari GitHub OAuth App (bagian 0.2) |
| `GITHUB_ALLOWED_LOGINS` | `ahmadngiliyun00` |
| `API_PUBLIC_URL` | `https://primegarage.ngiliyun.my.id` |
| `GOOGLE_CLIENT_IDS` | kosongkan selama login Google ditunda |
| `APP_WEB_URL` | `https://primegarage.ngiliyun.my.id` |
| `CORS_ORIGINS` | `https://primegarage.ngiliyun.my.id` |
| `AUTH_DEV_LOGIN_ENABLED` | `false` (API menolak start jika `true` di production) |
| `STORAGE_DIR` | `/www/wwwroot/primegarage.ngiliyun.my.id/storage` |
| `SMTP_*`, `MAIL_FROM` | lihat bagian 0.3 |
| `INTERNAL_API_URL`, `INTERNAL_API_SECRET` | `http://127.0.0.1:3000`, acak minimal 16 karakter |
| `REMINDER_CRON` | `0 7 * * *` (07.00, dibaca dalam `REMINDER_TZ`) |
| `REMINDER_TZ` | `Asia/Jakarta` (WIB, UTC+7) |

Membuat secret acak:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 1.2 App (`apps/mobile/.env` untuk build web, atau EAS environment untuk Android)

Buat `apps/mobile/.env` di server berisi dua baris berikut (nilai lain boleh kosong):

```
EXPO_PUBLIC_API_URL=https://primegarage.ngiliyun.my.id
EXPO_PUBLIC_DEV_LOGIN=false
```

| Variabel | Nilai produksi |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://primegarage.ngiliyun.my.id` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | kosongkan (login Google ditunda, FR-AUTH-09) |
| `EXPO_PUBLIC_DEV_LOGIN` | `false` |

Variabel `EXPO_PUBLIC_*` tertanam di bundle saat build, jadi **jangan** isi rahasia di sana. Build Android lewat EAS mengambil `EXPO_PUBLIC_API_URL` dari `eas.json` (semua profil sudah `https://primegarage.ngiliyun.my.id`). Untuk web, jika `.env` masih `http://localhost:3000`, app di domain production otomatis memakai domainnya sendiri, tapi tetap sebaiknya diisi alamat production. Pastikan `EXPO_PUBLIC_DEV_LOGIN=false` saat build production.

## 2. Database (MySQL)

1. aaPanel > Databases > Add database: nama `prime_garage`, user `pg_user`, akses `127.0.0.1` saja, charset `utf8mb4`. Masukkan user dan password itu ke `DATABASE_URL` di `apps/api/.env`.
2. Migrasi dan seed katalog dijalankan otomatis oleh `scripts/deploy.sh` (bagian 3).
3. Backup: aaPanel > Cron > Backup database `prime_garage` setiap hari, simpan 14 hari. Backup juga folder `/www/wwwroot/primegarage.ngiliyun.my.id/storage` (aaPanel > Cron > Backup directory).

## 3. Deploy dan update (satu perintah)

`scripts/deploy.sh` menjalankan semua langkah berurutan dan berhenti dengan pesan jelas bila ada yang salah:

1. Memeriksa Node.js 22+, npm 11+, PM2, dan `.env` (wajib `NODE_ENV=production`, dev login mati).
2. `git pull` dari `main`.
3. `npm ci`, build API (Prisma Client dan NestJS).
4. Migrasi database dan seed katalog (seed aman diulang, tidak menyentuh data pengguna).
5. Build web ke folder sementara lalu ditukar, sehingga Nginx tidak pernah menyajikan build setengah jadi.
6. `pm2 startOrReload` untuk `prime-garage-api` dan `prime-garage-worker` (wajib 1 instance agar cron tidak ganda), `pm2 save`, lalu cek `/api/health`.

Deploy pertama dan setiap update:

```bash
bash /www/wwwroot/primegarage.ngiliyun.my.id/scripts/deploy.sh
```

Opsi: `--skip-web` (tidak membangun ulang web, misalnya bila RAM server kecil dan `dist` dibangun di komputer lain) dan `--no-pull` (memakai kode yang sudah ada).

Setelah deploy pertama, buat akun login pemilik (tidak ada pendaftaran publik, ADR-011). Password diminta dua kali; perintah yang sama dipakai untuk reset password:

```bash
cd /www/wwwroot/primegarage.ngiliyun.my.id && npm run user:password -w @prime-garage/api -- --username ahmadngiliyun00 --email ahmad@ngiliyun.my.id --name "Ahmad Ngiliyun"
```

Sekali saja, agar PM2 hidup lagi setelah server reboot (jalankan perintah yang dicetaknya):

```bash
pm2 startup
```

Memantau:

```bash
pm2 status
```

```bash
pm2 logs prime-garage-api --lines 50
```

## 4. Build web (SPA)

Sudah termasuk di `scripts/deploy.sh`. Hasilnya di `/www/wwwroot/primegarage.ngiliyun.my.id/apps/mobile/dist`. Jika build web di server kehabisan memori, bangun di komputer development dengan `.env` production (bagian 1.2), lalu salin folder `apps/mobile/dist` ke server dan jalankan deploy dengan `--skip-web`.

## 5. Nginx (aaPanel)

1. aaPanel > Website > `primegarage.ngiliyun.my.id` > SSL: pasang Let's Encrypt dan aktifkan Force HTTPS.
2. aaPanel > Website > `primegarage.ngiliyun.my.id` > Config. Biarkan baris buatan aaPanel (listen, SSL, log, `include`), lalu:
   - Ganti baris `root` menjadi `root /www/wwwroot/primegarage.ngiliyun.my.id/apps/mobile/dist;`
   - Tambahkan blok di bawah ini di dalam `server`, sebelum blok `location` bawaan aaPanel.
3. Simpan. aaPanel menguji konfigurasi sebelum menerapkannya.

```nginx
root /www/wwwroot/primegarage.ngiliyun.my.id/apps/mobile/dist;
index index.html;
client_max_body_size 6m;

# API dan Socket.IO (ADR-008)
location ^~ /api/ {
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

# Halaman utama SPA: selalu ambil versi terbaru
location = /index.html {
    add_header Cache-Control "no-cache";
}

# Bundle JS dan CSS (nama berisi hash)
location ^~ /_expo/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
}

# Gambar, font, dan model 3D (nama berisi hash)
location ^~ /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
    location ~* \.glb$ {
        types { }
        default_type model/gltf-binary;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# SPA fallback
location / {
    try_files $uri $uri/ /index.html;
}
```

Jangan menaruh `types { ... }` langsung di dalam `server`: blok itu menggantikan seluruh daftar MIME Nginx, sehingga HTML dan JS terkirim sebagai `application/octet-stream`. Tipe `.glb` cukup diatur di dalam `location` seperti di atas.

Cek dari server setelah Nginx dan deploy selesai:

```bash
curl -sI https://primegarage.ngiliyun.my.id/ | grep -i content-type
```

```bash
curl -s https://primegarage.ngiliyun.my.id/api/health
```

```bash
curl -s https://primegarage.ngiliyun.my.id/apps/api/.env | head -c 80
```

Hasil yang benar: `text/html`, `{"status":"ok","db":true,...}`, dan perintah ketiga menampilkan HTML halaman app (bukan isi `.env`).

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
- [ ] SHA-1 sertifikat signing didaftarkan di OAuth client Android (bagian 0.2b, hanya jika login Google diaktifkan).
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
2. Di server jalankan `bash /www/wwwroot/primegarage.ngiliyun.my.id/scripts/deploy.sh` (bagian 3): API, worker, migrasi, katalog, dan web sekaligus. Pastikan `pm2 logs` bersih.
3. Build AAB dan unggah ke track internal/closed testing (bagian 6), lalu promosikan ke produksi.
4. Uji cepat: login, tambah kendaraan, buka 3D, catat servis, cek realtime di dua perangkat.

## 8. Development lokal

1. MySQL 8 lokal dengan database `prime_garage`.
2. Salin `apps/api/.env.example` ke `apps/api/.env`, set `NODE_ENV=development`, `AUTH_DEV_LOGIN_ENABLED=true`, `STORAGE_DIR=../../storage`. `CORS_ORIGINS` tidak perlu diubah: di luar production, origin localhost dan jaringan lokal selalu diizinkan.
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

Setiap selesai `git pull`, jalankan migrasi lagi (`npm run db:migrate -w @prime-garage/api`). Prisma 7 tidak lagi membuat ulang Prisma Client setelah migrasi, jadi `db:migrate`, `db:deploy`, `dev:api`, `dev:worker`, dan `user:password` menjalankan `prisma generate` sendiri. Paket `packages/shared` juga dibangun ulang otomatis oleh `dev:api`, `dev:worker`, `dev:mobile`, `dev:web`, dan `user:password`.

Buat akun login (password diminta lewat prompt, perintah yang sama untuk reset password):

```bash
npm run user:password -w @prime-garage/api -- --username ahmad --email ahmad@example.com --name "Ahmad"
```

Di terminal lain:

```bash
npm run dev:mobile
```

Mencoba dari HP (Expo Go atau development build) di Wi-Fi yang sama:
- Set `HOST=0.0.0.0` di `apps/api/.env` agar API bisa dijangkau dari HP. Saat start, API mencetak alamat yang bisa dibuka dari HP, misalnya `http://192.168.1.10:3000/api/health`.
- `EXPO_PUBLIC_API_URL=http://localhost:3000` boleh tetap begitu: saat development, app di HP otomatis mengganti `localhost` dengan IP komputer yang menjalankan Metro.
- Untuk mengecek API dari browser, buka `/api/health`. Alamat `/api` sendiri memang menjawab 404.

Atau versi web saja, lalu buka `http://localhost:8081`:

```bash
npm run dev:web
```

Tes end-to-end API (API harus berjalan dengan dev login aktif), dari `apps/api`:

```bash
node scripts/smoke-test.mjs
```
