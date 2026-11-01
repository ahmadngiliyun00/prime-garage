# Spesifikasi 3D Viewer dan Edukasi

Fitur prioritas utama pemilik proyek: pengguna melihat model 3D kendaraannya, menyentuh sebuah bagian, lalu langsung tahu nama, fungsi, dan kondisi bagian itu.

## 1. Pendekatan

- **Template per kategori** (ADR-006). MVP memakai satu model: `underbone_v1` (motor bebek, acuan bentuk Honda Supra X 125). Kendaraan apa pun berkategori `underbone` memakai model ini.
- Model spesifik per tipe (misal `honda_supra_x_125_fi_v1`) dapat ditambahkan kemudian **tanpa mengubah kode**, cukup mengikuti konvensi mesh di bagian 3 dan menambah baris `model_3d_assets`.
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
| `body__<nama>` | Bagian non-interaktif (rangka, bodi, jok) | `body__frame`, `body__seat` |

Aturan seleksi: saat mesh disentuh, telusuri ke atas (mesh lalu parent-nya) sampai menemukan node bernama `part__*`. Ambil `part_code` dari nama tersebut (buang akhiran `__<n>`). Jika tidak ditemukan, sentuhan diabaikan.

Bagian yang tersembunyi di dalam mesin (misal oli mesin, celah katup) diwakili oleh mesh penanda yang terlihat, contoh: tutup pengisian oli untuk `engine_oil`, tutup kepala silinder untuk `valve_clearance`.

### 3.3 Daftar bagian `underbone_v1`

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

## 7. Sumber model 3D (keputusan terbuka no. 3)

| Opsi | Kelebihan | Kekurangan |
|---|---|---|
| Beli model berlisensi (Sketchfab, CGTrader, TurboSquid) lalu dipisah dan diberi nama mesh di Blender | Cepat, kualitas visual baik | Lisensi harus mengizinkan penggunaan dalam aplikasi yang didistribusikan; perlu kerja Blender untuk memisah bagian |
| Pesan ke 3D artist | Sesuai kebutuhan, bagian sudah terpisah | Biaya dan waktu |
| Buat sendiri di Blender (low-poly stylized) | Kontrol penuh, gratis | Butuh waktu belajar |

Rekomendasi: mulai dengan **model low-poly stylized** (tidak harus fotorealistis). Lebih ringan, lebih mudah dipisah per bagian, dan menghindari masalah merek dagang. Untuk spike Fase 1, boleh memakai model placeholder sederhana (bentuk primitif bernama sesuai konvensi) agar pengembangan tidak menunggu model final.
