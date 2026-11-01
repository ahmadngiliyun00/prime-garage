# Spesifikasi 3D Viewer dan Edukasi

Fitur prioritas utama pemilik proyek: pengguna melihat model 3D kendaraannya, menyentuh sebuah bagian, lalu langsung tahu nama, fungsi, dan kondisi bagian itu.

## 1. Pendekatan

- **Template per kategori** (ADR-006): `underbone_v1` (motor bebek prosedural) dipakai untuk semua kendaraan berkategori bebek, kategori lain yang belum punya model, dan sebagai **cadangan otomatis** jika model spesifik gagal dimuat.
- **Model spesifik per tipe** (ADR-009): `honda_supra_x_125_fi_v1` dari Sketchfab (boiledfish.vvti, CC BY 4.0) dipakai oleh katalog Honda Supra X 125 dan Supra X 125 FI.
- Model baru ditambahkan dengan: file `.glb` di `apps/mobile/assets/models/`, entri `MODEL_3D_ASSETS` dan `PART_VIEWS_BY_MODEL` di `packages/shared/src/catalog/model-views.ts`, entri `MODEL_ASSETS` di `apps/mobile/src/features/viewer3d/model-assets.ts`, lalu `npm run db:seed`.
- Interaksi dan konten edukasi berasal dari database (`parts`, `model_3d_part_views`), bukan hardcode.

## 2. Teknologi

| Kebutuhan | Pilihan |
|---|---|
| Renderer | three.js lewat **@react-three/fiber** |
| Web | `@react-three/fiber` + `@react-three/drei` (OrbitControls, useGLTF, Html, Bounds) |
| Android | `@react-three/fiber/native` + `expo-gl`, model dimuat dengan `expo-asset` |
| Kontrol kamera | Orbit: putar (1 jari / drag), zoom (pinch / scroll), geser (2 jari / klik kanan), dengan batas jarak dan sudut |
| Seleksi | Raycasting dari event `onPointerDown` / `onClick` pada mesh |
| Panel info | Bottom sheet (native) / panel samping (web) dengan komponen React biasa, bukan di dalam kanvas |
| Fallback | Daftar bagian berbasis teks (FR-3D-06) jika WebGL tidak tersedia atau model gagal dimuat dalam 10 detik |

Kode viewer berada di `apps/mobile/src/features/viewer3d/` dengan pemisahan file platform bila perlu (`Viewer.web.tsx`, `Viewer.native.tsx`) dan logika bersama (seleksi, sorotan, status) di file non-platform.

**Spike teknis wajib di Fase 1**: buktikan model GLB dapat dimuat, diputar, dan disentuh di **Android fisik** dan **browser** sebelum membangun fitur lain di atasnya.

## 3. Konvensi file dan mesh

### 3.1 File
- Format **glTF binary (`.glb`)**, satuan meter, sumbu Y ke atas, kendaraan menghadap **+X** (depan ke kanan), roda menyentuh Y = 0, pusat kendaraan di X = 0, Z = 0.
- Lokasi: `apps/mobile/assets/models/<key>.glb`, contoh `underbone_v1.glb`.
- Ukuran file maksimal **5 MB**; target poligon di bawah 150 ribu segitiga; tekstur maksimal 2048 px.
- Kompresi: gunakan **meshopt** (diuji di web dan native). Jangan memakai Draco sebelum terbukti berjalan di native.
- Material PBR sederhana. Tanpa logo atau merek dagang pabrikan pada tekstur.
- Setiap file model wajib dicatat sumber dan lisensinya di `apps/mobile/assets/models/LICENSES.md`.

### 3.2 Penamaan node/mesh (WAJIB)
| Pola | Arti | Contoh |
|---|---|---|
| `part__<part_code>` | Bagian interaktif, `part_code` sesuai tabel `parts` | `part__spark_plug` |
| `part__<part_code>__<n>` | Bagian interaktif yang terdiri dari beberapa mesh | `part__drive_chain__01`, `part__drive_chain__02` |
| `part__<part_code>__hs`, `part__<part_code>__hs<n>` | Titik sentuh (hotspot) untuk bagian yang tidak punya mesh sendiri di model | `part__engine_oil__hs`, `part__lighting__hs2` |
| `body__<nama>` | Bagian non-interaktif (rangka, bodi, jok) | `body__frame`, `body__chassis` |

Aturan seleksi: saat mesh disentuh, telusuri ke atas (mesh lalu parent-nya) sampai menemukan node bernama `part__*`; ambil `part_code` dari nama tersebut (buang akhiran `__<n>` atau `__hs<n>`). Penelusuran **berhenti** di node `body__*`. Jika mesh terdekat yang tersentuh tidak punya kode bagian, event diteruskan ke mesh berikutnya di sepanjang sinar, sehingga titik sentuh di balik panel bodi tetap bisa dipilih.

Titik sentuh dirender selalu di atas bodi (tanpa depth test) agar bagian tersembunyi seperti oli dan busi mudah ditemukan. Saat sebuah bagian terpilih, titiknya berubah oranye (warna brand) dan membesar, titik lain meredup.

Bagian yang tersembunyi di dalam mesin (misal oli mesin, celah katup) diwakili oleh mesh penanda yang terlihat, contoh: tutup pengisian oli untuk `engine_oil`, tutup kepala silinder untuk `valve_clearance`.

### 3.3 Daftar bagian `underbone_v1` (model prosedural)

| part_code | Nama | Mesh penanda | Urutan tur |
|---|---|---|---|
| engine_oil | Oli mesin | Tutup pengisian oli / dipstick di blok mesin kanan | 1 |
| spark_plug | Busi | Cop busi di kepala silinder | 2 |
| air_filter | Filter udara | Kotak filter udara | 3 |
| drive_chain | Rantai dan gir | Rantai, gir depan, gir belakang | 4 |
| brake_pad_front | Kampas rem depan | Kaliper rem cakram depan | 5 |
| brake_fluid | Minyak rem | Tabung master rem di setang kanan | 6 |
| brake_shoe_rear | Kampas rem belakang | Tromol roda belakang | 7 |
| tire_front | Ban depan | Ban depan | 8 |
| tire_rear | Ban belakang | Ban belakang | 9 |
| battery | Aki | Penutup aki (bawah jok / bodi samping) | 10 |
| throttle_body | Throttle body / injektor | Throttle body | 11 |
| clutch | Kopling | Tutup bak kopling (mesin kanan) | |
| valve_clearance | Celah katup (klep) | Tutup kepala silinder | |
| front_fork | Suspensi depan | Tabung shock depan | |
| rear_shock | Suspensi belakang | Shock belakang | |
| lighting | Lampu dan klakson | Lampu depan, lampu belakang | |
| exhaust | Knalpot | Knalpot | |
| fuel_tank | Tangki bensin | Tangki (bawah jok untuk bebek) | |

Bagian yang tidak punya urutan tur tetap dapat disentuh, hanya tidak masuk tur awal.

### 3.4 Pemetaan `honda_supra_x_125_fi_v1`

Model sumber hanya memisahkan roda, garpu depan, swing arm, spakbor depan, dan setang. Skrip `apps/mobile/scripts/prepare-supra-model.mjs` (jalankan dengan `npm run prepare:supra-model -- <source.glb>` dari `apps/mobile`):
1. Menormalkan sumbu (sumber menghadap -Z dengan tanah di y = -0,445) ke konvensi proyek.
2. Mengganti nama node: `wheel_front` menjadi `part__tire_front`, `wheel_rear` menjadi `part__tire_rear`, `forks_front` menjadi `part__front_fork`, `forks_rear` (swing arm dan shock) menjadi `part__rear_shock`, `chassis` menjadi `body__chassis`, `mudguard` menjadi `body__front_fender`, `handlebars` menjadi `body__handlebars`.
3. Menambah titik sentuh untuk bagian lain di posisi `SUPRA_X_125_ANCHORS` (`packages/shared/src/catalog/model-views.ts`), termasuk titik kedua lampu di lampu belakang.
4. Memvalidasi bahwa semua 18 bagian katalog terjangkau.

Posisi kamera per bagian dihitung dari posisi titik sentuh (`viewFromAnchor`). Kredit penulis model tampil di bawah viewer (syarat lisensi CC BY 4.0).

## 4. Interaksi

1. **Muat**: tampilkan skeleton/loader dengan persentase. Setelah dimuat, kamera membingkai seluruh kendaraan dari sudut 3/4 depan kanan.
2. **Sentuh bagian**:
   - Bagian disorot (outline atau emissive) dengan warna status komponen: hijau Baik, kuning Segera, merah Jatuh tempo, biru netral jika belum ada aturan atau data (FR-3D-05).
   - Kamera bergerak halus ke `camera_position` / `camera_target` dari `model_3d_part_views` (durasi sekitar 600 ms).
   - Panel info terbuka.
3. **Panel info** (FR-3D-04):
   - Nama bagian, ringkasan satu kalimat.
   - Badge status dan sisa umur (dari `computeComponentStatus`), perkiraan jatuh tempo.
   - Tab: **Fungsi**, **Gejala bermasalah**, **Tips perawatan**, **Riwayat** (item servis untuk bagian ini).
   - Tombol: **Catat servis bagian ini** (form servis terisi bagian ini), **Ubah interval**.
4. **Sentuh area kosong**: hapus sorotan, tutup panel, kamera kembali ke posisi awal.
5. **Mode status** (toggle): semua bagian yang punya aturan diwarnai sesuai status sekaligus, sebagai "peta kesehatan" kendaraan.
6. **Daftar bagian**: tombol untuk membuka daftar teks semua bagian; memilih dari daftar sama dengan menyentuh mesh. Ini juga fallback aksesibilitas.

## 5. Tur edukasi (FR-EDU-01)

- Muncul otomatis saat kendaraan dibuka pertama kali (`vehicles.edu_tour_completed_at` kosong).
- Langkah tur = bagian dengan `tour_order` terisi, urut naik, yang tersedia di model.
- Setiap langkah: kamera fokus ke bagian, bagian disorot, kartu berisi nama, ringkasan, dan fungsi singkat. Tombol **Lanjut**, **Kembali**, **Lewati tur**.
- Selesai atau dilewati: isi `edu_tour_completed_at`. Tur dapat diulang dari menu kendaraan.
- Kartu tur dirender sebagai overlay UI biasa di atas kanvas.

## 6. Kinerja

- Muat model sekali dan cache (`useGLTF.preload` di web, cache aset di native).
- Matikan bayangan real-time di Android; gunakan baked ambient occlusion pada tekstur.
- Batasi `dpr` maksimal 2 dan render on-demand (`frameloop="demand"`) saat tidak ada interaksi.
- Target 30 fps atau lebih di Android kelas menengah (NFR-04).

## 7. Sumber model 3D

Keputusan pemilik: model dibuat sendiri, dan jika ada model yang cocok, gunakan model tersebut. Saat ini: `underbone_v1` (prosedural, MIT) dan `honda_supra_x_125_fi_v1` (Sketchfab, CC BY 4.0). Pertimbangan untuk model berikutnya:

| Opsi | Kelebihan | Kekurangan |
|---|---|---|
| Beli model berlisensi (Sketchfab, CGTrader, TurboSquid) lalu dipisah dan diberi nama mesh di Blender | Cepat, kualitas visual baik | Lisensi harus mengizinkan penggunaan dalam aplikasi yang didistribusikan; perlu kerja Blender untuk memisah bagian |
| Pesan ke 3D artist | Sesuai kebutuhan, bagian sudah terpisah | Biaya dan waktu |
| Buat sendiri di Blender (low-poly stylized) | Kontrol penuh, gratis | Butuh waktu belajar |

Model pihak ketiga wajib berlisensi yang mengizinkan distribusi di aplikasi (CC BY, CC0, atau lisensi komersial) dan dicatat di `apps/mobile/assets/models/LICENSES.md`. Bagian yang tidak terpisah cukup ditandai titik sentuh; tidak perlu memotong mesh.
