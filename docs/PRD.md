# PRD: PrimeGarage

| Atribut | Nilai |
|---|---|
| Versi dokumen | 1.0 |
| Tanggal | 1 November 2026 |
| Pemilik produk | Ahmad Ngiliyun |
| Status | Disetujui untuk Fase 1 |

## 1. Ringkasan

PrimeGarage adalah garasi digital pribadi. Pengguna mendaftarkan kendaraannya, melihat model 3D kendaraan yang bisa disentuh untuk mempelajari fungsi setiap bagian, mencatat setiap servis (di mana, kapan, apa saja yang dikerjakan), lalu aplikasi memperkirakan sisa umur setiap komponen dan mengirim pengingat sebelum waktunya servis.

## 2. Latar belakang masalah

1. Pemilik kendaraan jarang mencatat servis. Nota bengkel hilang, dan pemilik lupa kapan terakhir ganti oli atau busi.
2. Banyak pemilik servis di **bengkel umum** (bukan dealer resmi), sehingga tidak ada riwayat servis digital seperti di dealer.
3. Pemilik tidak tahu kondisi komponen saat ini: "oli saya sudah tinggal berapa persen umurnya?"
4. Pemilik awam tidak tahu nama dan fungsi bagian-bagian kendaraan, sehingga sulit memahami apa yang dikerjakan mekanik.

Istilah domain: **Vehicle Maintenance Tracking** (pencatatan riwayat servis) dan **Component Wear Estimation** (estimasi sisa umur komponen berdasarkan jarak tempuh dan waktu).

## 3. Tujuan dan metrik keberhasilan

| Tujuan | Metrik |
|---|---|
| Pengguna punya riwayat servis lengkap | Setiap kendaraan aktif punya minimal 1 catatan servis dalam 30 hari pertama |
| Pengguna servis tepat waktu | Persentase komponen berstatus "Jatuh tempo" lebih dari 14 hari menurun dari bulan ke bulan |
| Pengguna memahami kendaraannya | Pengguna menyelesaikan tur edukasi 3D pada kendaraan pertamanya |
| Data km akurat | Odometer diperbarui minimal setiap 14 hari |

## 4. Pengguna

**Persona utama: pemilik kendaraan pribadi**
- Contoh: pemilik Honda Supra X 125, servis rutin di bengkel umum (contoh nama bengkel: "Garam Motor"), tidak tahu apakah bengkelnya bersertifikat.
- Kebutuhan: tahu kapan harus servis, punya catatan apa yang sudah diganti, paham bagian motor secara sederhana.
- Perangkat: HP Android (utama, dipakai di bengkel), laptop Mac atau browser (melihat ringkasan).

**Persona tahap lanjut (bukan MVP)**: anggota keluarga yang berbagi garasi, pemilik beberapa kendaraan (motor dan mobil).

## 5. Ruang lingkup

### 5.1 MVP (wajib ada)
- Login dengan Google.
- Garasi pribadi dan pendaftaran kendaraan (motor) dari katalog merek/model.
- Detail kendaraan dengan **model 3D interaktif**: sentuh bagian, muncul nama dan penjelasan.
- Tur edukasi saat pertama kali membuka kendaraan.
- Pencatatan odometer.
- Pencatatan servis: tanggal, km, bengkel, daftar pekerjaan per bagian, biaya, foto nota.
- Data bengkel (resmi, umum, status sertifikasi).
- Status dan estimasi sisa umur setiap komponen.
- Pengingat lewat push notification (Android) dan email.
- Sinkronisasi realtime antar perangkat (HP dan web).
- Web SPA dan Android AAB.

### 5.2 Setelah MVP
- Login Facebook, Apple, dan email.
- Berbagi garasi dengan anggota keluarga (peran pemilik, editor, pembaca).
- Jenis kendaraan mobil dan model 3D tambahan (matic, sport, mobil).
- Web push notification, aplikasi iOS.
- Statistik biaya servis per bulan/tahun dan ekspor PDF riwayat servis.
- Direktori bengkel publik dan ulasan.

### 5.3 Di luar cakupan
- Integrasi OBD/sensor kendaraan.
- Pemesanan servis atau pembayaran ke bengkel.
- Marketplace suku cadang.

## 6. Alur utama pengguna

```
Buka aplikasi
  → Login (Google)
  → Garasi saya (kosong) → Tambah kendaraan
       → Pilih jenis (Motor) → Merek (Honda) → Model (Supra X 125) → Tahun
       → Isi: nama panggilan, plat nomor, warna, odometer saat ini
  → Detail kendaraan
       → [Pertama kali] Tur edukasi 3D: sorot bagian satu per satu dengan penjelasan
       → Tab "3D": putar, perbesar, sentuh bagian → panel info (nama, fungsi, gejala rusak, status, riwayat)
       → Tab "Kondisi": daftar komponen dengan persentase sisa umur dan status
       → Tab "Servis": daftar riwayat servis → Tambah servis
            → Tanggal, odometer, bengkel (pilih/buat baru)
            → Item pekerjaan: bagian, tindakan (ganti, tambah, periksa, setel, bersihkan, lumasi, perbaiki), biaya
            → Foto nota (opsional) → Simpan
       → Status komponen dihitung ulang, jadwal pengingat diperbarui
  → Notifikasi "Oli mesin Supra X kamu jatuh tempo servis" (push dan email)
```

## 7. Kebutuhan fungsional

Prioritas: **M** = Must (MVP), **S** = Should (MVP jika sempat), **C** = Could (setelah MVP).

### 7.1 Autentikasi dan akun (AUTH)
| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-AUTH-01 | Pengguna login dengan akun Google (Android dan web). | M |
| FR-AUTH-02 | Sesi bertahan (refresh token) sampai pengguna logout. | M |
| FR-AUTH-03 | Pengguna dapat logout dari perangkat saat ini. | M |
| FR-AUTH-04 | Pengguna dapat menghapus akun beserta seluruh datanya dari dalam aplikasi dan dari halaman web (syarat Google Play). | M |
| FR-AUTH-05 | Profil: nama, foto, zona waktu, preferensi notifikasi (push, email). | M |
| FR-AUTH-06 | Login Facebook. | C |
| FR-AUTH-07 | Login Apple dan email. | C |

### 7.2 Garasi dan kendaraan (VEH)
| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-VEH-01 | Saat pengguna pertama login, garasi pribadi dibuat otomatis. | M |
| FR-VEH-02 | Pengguna menambah kendaraan dengan memilih jenis, merek, model, dan tahun dari katalog. | M |
| FR-VEH-03 | Jika model tidak ada di katalog, pengguna dapat mengisi manual dan memilih kategori (bebek, matic, sport, dll.) agar model 3D template dan interval default tetap tersedia. | M |
| FR-VEH-04 | Data kendaraan: nama panggilan, plat nomor, tahun, warna, kapasitas mesin, nomor rangka, nomor mesin, tanggal beli, odometer awal, foto. | M |
| FR-VEH-05 | Pengguna dapat mengubah, mengarsipkan, dan menghapus kendaraan. | M |
| FR-VEH-06 | Pengguna mencatat odometer kapan saja; odometer terbaru ditampilkan di detail kendaraan. | M |
| FR-VEH-07 | Odometer tidak boleh lebih kecil dari catatan sebelumnya kecuali dikonfirmasi (misal ganti speedometer). | S |
| FR-VEH-08 | Berbagi garasi dengan pengguna lain. | C |

### 7.3 Model 3D dan edukasi (3D, EDU)
| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-3D-01 | Detail kendaraan menampilkan model 3D sesuai kategori/model kendaraan. | M |
| FR-3D-02 | Pengguna dapat memutar, memperbesar, dan menggeser kamera. | M |
| FR-3D-03 | Menyentuh/mengklik bagian menyorot bagian tersebut dan membuka panel info. | M |
| FR-3D-04 | Panel info berisi: nama bagian, fungsi, gejala jika bermasalah, tips perawatan, status komponen, dan riwayat servis bagian itu. | M |
| FR-3D-05 | Warna sorotan bagian mencerminkan status komponen (baik, segera, jatuh tempo). | S |
| FR-3D-06 | Tersedia daftar bagian berbasis teks sebagai alternatif dan fallback jika 3D gagal dimuat. | M |
| FR-EDU-01 | Saat pertama membuka kendaraan, tur edukasi menyorot bagian-bagian utama secara berurutan dengan penjelasan singkat. Dapat dilewati dan diulang. | M |
| FR-EDU-02 | Konten edukasi disimpan di database sehingga dapat ditambah tanpa rilis ulang aplikasi. | M |
| FR-EDU-03 | Bagian yang sudah dipelajari ditandai. | C |

### 7.4 Servis dan bengkel (SVC, WS)
| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-SVC-01 | Pengguna mencatat servis: tanggal, odometer, bengkel, nama mekanik (opsional), catatan, total biaya. | M |
| FR-SVC-02 | Setiap servis berisi satu atau lebih item pekerjaan: bagian (dari katalog atau teks bebas), tindakan, jumlah, satuan, harga. | M |
| FR-SVC-03 | Tindakan yang tersedia: ganti, tambah (top up), periksa, setel, bersihkan, lumasi, perbaiki, lainnya. Ganti oli dicatat sebagai "ganti". | M |
| FR-SVC-04 | Pengguna dapat melampirkan foto nota/kuitansi. | S |
| FR-SVC-05 | Daftar riwayat servis per kendaraan, urut terbaru, dengan filter per bagian. | M |
| FR-SVC-06 | Pengguna dapat mengubah dan menghapus catatan servis; status komponen dihitung ulang. | M |
| FR-SVC-07 | Template servis cepat ("Servis rutin", "Ganti oli") untuk mengisi item yang sering dipakai. | S |
| FR-WS-01 | Pengguna menyimpan data bengkel: nama, jenis (resmi/AHASS/dealer, bengkel umum, lainnya), status sertifikasi (bersertifikat, tidak, tidak diketahui), alamat, kota, telepon, lokasi peta (opsional). | M |
| FR-WS-02 | Bengkel dapat dipilih ulang pada servis berikutnya. | M |

### 7.5 Kondisi komponen dan pengingat (MNT, NTF)
| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-MNT-01 | Setiap kendaraan punya aturan interval per komponen (km dan/atau bulan), diambil dari default katalog. | M |
| FR-MNT-02 | Pengguna dapat mengubah interval per kendaraan. | M |
| FR-MNT-03 | Aplikasi menampilkan persentase sisa umur, status (Baik, Segera, Jatuh tempo, Belum ada data), dan perkiraan tanggal jatuh tempo per komponen sesuai `docs/MAINTENANCE-LOGIC.md`. | M |
| FR-MNT-04 | Dashboard garasi menampilkan ringkasan komponen yang paling mendesak dari semua kendaraan. | M |
| FR-NTF-01 | Push notification (Android) saat komponen masuk status Segera dan Jatuh tempo. | M |
| FR-NTF-02 | Email pengingat dengan isi yang sama. | M |
| FR-NTF-03 | Pengingat diulang berkala selama komponen masih Jatuh tempo, dengan batas frekuensi. | M |
| FR-NTF-04 | Pengingat memperbarui odometer jika tidak ada catatan km dalam 14 hari. | S |
| FR-NTF-05 | Pengguna dapat menunda (snooze) pengingat komponen tertentu. | S |
| FR-NTF-06 | Pusat notifikasi di dalam aplikasi. | S |
| FR-NTF-07 | Web push notification. | C |

### 7.6 Realtime dan sinkronisasi (SYNC)
| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-SYNC-01 | Perubahan data (kendaraan, odometer, servis) di satu perangkat langsung terlihat di perangkat lain yang sedang terbuka tanpa refresh. | M |
| FR-SYNC-02 | Saat koneksi putus lalu tersambung lagi, aplikasi memuat ulang data terbaru. | M |
| FR-SYNC-03 | Mode offline penuh (antrian tulis). | C |

## 8. Kebutuhan non-fungsional

| ID | Kebutuhan |
|---|---|
| NFR-01 | Platform: Android 8+ (AAB), browser modern (Chrome, Safari, Edge, Firefox versi terbaru), web dapat dipasang sebagai PWA di macOS. |
| NFR-02 | Web berupa SPA, di-host statis di VPS. |
| NFR-03 | Model 3D dimuat kurang dari 5 detik di koneksi 4G; ukuran file per model maksimal 5 MB. |
| NFR-04 | Interaksi 3D minimal 30 fps di HP Android kelas menengah. |
| NFR-05 | Event realtime sampai ke perangkat lain dalam kurang dari 2 detik. |
| NFR-06 | Semua komunikasi lewat HTTPS/WSS. Token akses berumur pendek, refresh token dirotasi dan disimpan dalam bentuk hash. |
| NFR-07 | Data pengguna hanya dapat diakses oleh anggota garasinya. |
| NFR-08 | Kepatuhan Google Play: kebijakan privasi, formulir Data Safety, penghapusan akun. Kepatuhan UU PDP Indonesia untuk data pribadi. |
| NFR-09 | Backup database harian di VPS. |
| NFR-10 | Antarmuka Bahasa Indonesia, siap i18n. Mendukung mode terang dan gelap. |

## 9. Glosarium

| Istilah | Arti |
|---|---|
| Garasi | Wadah milik pengguna yang berisi satu atau lebih kendaraan. |
| Kendaraan | Unit milik pengguna (contoh: Supra X 125 plat AB 1234 CD). |
| Model kendaraan | Entri katalog (contoh: Honda Supra X 125 FI). |
| Kategori | Kelompok bentuk kendaraan: bebek (underbone), matic, sport, trail, mobil. Menentukan template 3D dan interval default. |
| Komponen / bagian | Bagian kendaraan yang dirawat (oli mesin, busi, rantai). Diidentifikasi dengan `part_code`. |
| Aturan perawatan | Interval km dan/atau bulan untuk satu tindakan pada satu komponen. |
| Item servis | Satu pekerjaan dalam satu servis (contoh: ganti oli mesin 0,8 L). |
| Baseline | Titik acuan (tanggal dan km) terakhir kali komponen dirawat. |

## 10. Keputusan yang sudah ditetapkan pemilik

| No | Keputusan | Nilai |
|---|---|---|
| 1 | Package name Android (`applicationId`), tidak bisa diubah setelah rilis | `my.id.ngiliyun.primegarage` |
| 2 | Domain | `primegarage.ngiliyun.my.id` untuk web, API di path `/api` pada domain yang sama (ADR-008) |
| 3 | Sumber model 3D | Model Honda Supra X 125 dari Sketchfab yang disediakan pemilik (boiledfish.vvti, CC BY 4.0, ADR-009), ditambah model prosedural `underbone_v1` buatan proyek sebagai template dan cadangan |
| 4 | Penyedia SMTP email | Google Workspace domain `@ngiliyun.my.id` (`smtp.gmail.com`, App Password) |

## 11. Keputusan terbuka

| No | Keputusan | Batas waktu |
|---|---|---|
| 1 | Nilai interval default per komponen diverifikasi dari buku servis resmi. | Sebelum rilis produksi |
| 2 | Alamat pengirim email (usulan `noreply@ngiliyun.my.id`). | Sebelum rilis produksi |
