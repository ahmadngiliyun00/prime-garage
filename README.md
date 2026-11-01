# PrimeGarage

> Pantau kondisi kendaraanmu, servis tepat waktu.

PrimeGarage adalah aplikasi garasi digital untuk mencatat riwayat servis kendaraan, mempelajari bagian-bagian kendaraan lewat model 3D interaktif, dan memperkirakan kapan setiap komponen (oli, busi, kampas rem, rantai, dan lainnya) perlu diservis atau diganti. Pengguna mendapat pengingat lewat notifikasi aplikasi dan email.

Fokus awal: **sepeda motor** (contoh acuan: Honda Supra X 125). Arsitektur disiapkan untuk jenis kendaraan lain.

## Platform

| Target | Cara |
|---|---|
| Android | Expo + EAS Build, output `.aab` untuk Google Play Store |
| Web | Expo Web sebagai SPA, di-host di VPS (aaPanel, Nginx) |
| macOS | Versi web dipasang sebagai PWA |
| iOS | Menyusul |

## Tech stack (ringkas)

- **App**: Expo (React Native), Expo Router, TypeScript, NativeWind, TanStack Query, React Three Fiber (3D)
- **API**: Node.js LTS, NestJS, Prisma, Socket.IO (realtime), dijalankan dengan PM2
- **Database**: MySQL 8
- **Notifikasi**: Expo Push Notifications dan email SMTP (Nodemailer)

Detail dan alasan setiap pilihan ada di [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [PRD](docs/PRD.md) | Kebutuhan produk dan fitur |
| [Arsitektur](docs/ARCHITECTURE.md) | Tech stack, struktur repo, ADR |
| [Database](docs/DATABASE.md) | Skema MySQL dan relasi |
| [Logika Perawatan](docs/MAINTENANCE-LOGIC.md) | Rumus estimasi umur komponen dan pengingat |
| [3D Viewer](docs/3D-VIEWER.md) | Spesifikasi model 3D dan interaksi |
| [Deployment](docs/DEPLOYMENT.md) | Deploy web, API, database, dan Android |
| [Roadmap](docs/ROADMAP.md) | Fase pengerjaan |

Kontributor dan AI agent **wajib** membaca [`AGENTS.md`](AGENTS.md) sebelum mengubah kode.

## Status

Fase 0: dokumentasi dan perancangan. Kode belum di-scaffold.

## Lisensi

MIT. Lihat [LICENSE](LICENSE).
