# Logika Perawatan dan Pengingat

Dokumen ini mendefinisikan cara PrimeGarage memperkirakan sisa umur komponen dan kapan pengingat dikirim. Implementasi **hanya** ada di `packages/shared/src/maintenance/` sebagai fungsi murni (tanpa akses database, tanpa `Date.now()` langsung; waktu sekarang dikirim sebagai parameter) agar mudah diuji dan dipakai bersama oleh app dan worker.

## 1. Prinsip

1. Umur komponen ditentukan oleh **jarak tempuh (km) atau waktu (bulan), mana yang lebih dulu tercapai**.
2. Setiap komponen dapat punya lebih dari satu aturan, misalnya rantai: **lumasi** tiap 500 km, **setel** tiap 1.000 km, **ganti** tiap 20.000 km. Setiap aturan dihitung terpisah.
3. Titik acuan (**baseline**) adalah servis terakhir yang mengandung item untuk komponen tersebut dengan tindakan yang termasuk `reset_actions` aturan.
4. Angka bersifat **estimasi**; UI selalu menampilkan kata "perkiraan" dan mengajak pengguna memperbarui odometer.

## 2. Masukan

```ts
type RuleInput = {
  ruleId: string;
  partCode: string;
  action: ServiceAction;          // replace | top_up | inspect | adjust | clean | lubricate | repair | other
  intervalKm: number | null;
  intervalMonths: number | null;  // minimal salah satu interval terisi
  resetActions: ServiceAction[];
};

type VehicleInput = {
  initialOdometerKm: number;
  currentOdometerKm: number;
  currentOdometerAt: Date;
  purchaseDate: Date | null;
};

type ServiceHistoryItem = {      // item servis untuk partCode terkait
  serviceRecordId: string;
  serviceDate: Date;             // tanggal kalender
  odometerKm: number;
  action: ServiceAction;
};

type OdometerPoint = { km: number; recordedAt: Date };

computeComponentStatus(rule, vehicle, history, odometerLogs, now, timezone): ComponentStatusResult
```

## 3. Langkah perhitungan

### 3.1 Baseline
1. Ambil item riwayat dengan `action` termasuk `rule.resetActions`. Urutkan menurun berdasarkan `serviceDate`, lalu `odometerKm`. Yang pertama adalah baseline: `{ date, km, key: serviceRecordId, source: "service" }`.
2. Jika tidak ada riwayat **dan** `purchaseDate` terisi **dan** `initialOdometerKm <= 100` (kendaraan dibeli baru): baseline = `{ date: purchaseDate, km: 0, key: "purchase", source: "purchase" }`.
3. Selain itu: status **`NO_DATA`** (Belum ada data). UI meminta pengguna mencatat servis terakhir untuk komponen ini. Tidak ada pengingat untuk aturan ini.

### 3.2 Rata-rata km per hari
Dipakai untuk memperkirakan km saat ini dan tanggal jatuh tempo.
1. Ambil log odometer 90 hari terakhir. Jika ada minimal 2 titik dengan rentang minimal 7 hari: `avgDailyKm = (kmTerakhir - kmTerawal) / jumlahHari`.
2. Jika tidak: hitung dari baseline ke odometer saat ini, jika rentangnya minimal 7 hari.
3. Jika tidak: default **25 km/hari** (asumsi pemakaian harian komuter).
4. Batasi hasil ke rentang 0 sampai 300 km/hari untuk mengabaikan data salah.

### 3.3 Perkiraan km saat ini
```
daysSinceOdometer = selisih hari (now - currentOdometerAt)
estimatedKm      = currentOdometerKm + avgDailyKm * daysSinceOdometer
```
Jika `daysSinceOdometer` lebih dari 14, UI menandai angka sebagai "perkiraan, perbarui odometer".

### 3.4 Rasio pemakaian
```
kmRatio   = (estimatedKm - baseline.km) / intervalKm                          // jika intervalKm ada
dueByTime = addMonths(baseline.date, intervalMonths)                           // jika intervalMonths ada
timeRatio = hari(baseline.date → now) / hari(baseline.date → dueByTime)
usage     = max(kmRatio, timeRatio)   // hanya dari interval yang terisi
remainingPercent = round(clamp(1 - usage, 0, 1) * 100)
```

### 3.5 Status
| Status | Kondisi | Label UI | Warna |
|---|---|---|---|
| `GOOD` | `usage < 0.8` | Baik | hijau |
| `SOON` | `0.8 <= usage < 1.0` | Segera servis | kuning |
| `DUE` | `usage >= 1.0` | Jatuh tempo | merah |
| `NO_DATA` | tidak ada baseline | Belum ada data | abu-abu |

Ambang 0,8 adalah konstanta `SOON_THRESHOLD` di `packages/shared`.

### 3.6 Perkiraan jatuh tempo
```
dueKm     = baseline.km + intervalKm
dueByKm   = now + ceil((dueKm - estimatedKm) / avgDailyKm) hari    // jika avgDailyKm > 0
dueDate   = tanggal paling awal dari dueByKm dan dueByTime
dueReason = "km" atau "time" (yang menentukan dueDate)
```
Jika sudah lewat: tampilkan "lewat X hari" atau "lewat X km".

### 3.7 Keluaran
```ts
type ComponentStatusResult = {
  ruleId: string;
  partCode: string;
  action: ServiceAction;
  status: "GOOD" | "SOON" | "DUE" | "NO_DATA";
  remainingPercent: number | null;
  usage: number | null;
  baseline: { date: string; km: number; key: string; source: "service" | "purchase" } | null;
  estimatedKm: number;
  avgDailyKm: number;
  avgDailySource: "odometer_logs" | "baseline" | "default";
  dueKm: number | null;
  dueDate: string | null;      // YYYY-MM-DD dalam zona waktu pengguna
  dueReason: "km" | "time" | null;
  isOdometerStale: boolean;
};
```

## 4. Contoh perhitungan

**Aturan**: oli mesin, `replace`, 2.000 km atau 3 bulan.
**Servis terakhir**: 10 Januari 2026 di km 15.000 (ganti oli di bengkel umum).
**Odometer terakhir**: 16.200 km pada 25 Februari 2026. Rata-rata dari log: 25 km/hari.
**Sekarang**: 1 Maret 2026.

| Langkah | Hasil |
|---|---|
| Perkiraan km saat ini | 16.200 + 25 × 4 hari = 16.300 km |
| kmRatio | (16.300 − 15.000) / 2.000 = 0,65 |
| dueByTime | 10 April 2026 (90 hari dari baseline) |
| timeRatio | 50 / 90 = 0,56 |
| usage | max(0,65; 0,56) = 0,65 |
| Sisa umur | 35%, status **Baik** |
| dueKm | 17.000 km |
| dueByKm | 1 Maret + ceil(700 / 25) = 1 Maret + 28 hari = 29 Maret 2026 |
| dueDate | 29 Maret 2026 (ditentukan oleh **km**) |

Jika pengguna jarang berkendara sehingga km tidak bertambah, `dueDate` menjadi 10 April 2026 (tiga bulan setelah servis), sesuai kebiasaan "3 bulan sekali servis".

## 5. Aturan pengingat (worker)

Worker berjalan setiap hari pukul **07.00 WIB** (00.00 UTC).

1. Untuk setiap kendaraan yang tidak diarsipkan, untuk setiap aturan `is_enabled = true` yang `snoozed_until` kosong atau sudah lewat: hitung status.
2. Buat baris `notifications` sesuai tabel di bawah. `dedupe_key` UNIQUE mencegah duplikat; jika insert gagal karena duplikat, lewati.

| Tipe | Kapan | `dedupe_key` |
|---|---|---|
| `component_soon` | Status `SOON` | `soon:{ruleId}:{baseline.key}` (sekali per siklus) |
| `component_due` | Status `DUE`, hari ke-0, 7, 14 setelah jatuh tempo, lalu setiap 30 hari | `due:{ruleId}:{baseline.key}:{n}` dengan `n` = urutan pengulangan |
| `odometer_stale` | Tidak ada log odometer lebih dari 14 hari | `odo:{vehicleId}:{tahun-minggu ISO}` (maks sekali per minggu) |

3. Siklus baru dimulai otomatis saat pengguna mencatat servis yang mereset aturan, karena `baseline.key` berubah.
4. **Pengiriman digabung**: semua notifikasi baru milik satu pengguna dalam satu kali jalan dikirim sebagai **satu push** dan **satu email** ringkasan (contoh: "3 komponen perlu perhatian: Oli mesin (jatuh tempo), Busi (segera), Rantai (segera)").
5. Hormati preferensi `users.notify_push` dan `users.notify_email`. Kanal yang dimatikan dicatat sebagai `skipped`.
6. Pengiriman gagal diulang maksimal 3 kali dengan jeda bertambah. Push token yang dinyatakan tidak valid oleh Expo dihapus.
7. Setelah notifikasi dibuat, pancarkan event realtime `notification.created` ke garasi terkait.

Contoh isi pengingat:
- Push: **"Oli mesin Supra Hitam jatuh tempo"**, "Terakhir diganti 10 Jan 2026 di Garam Motor (15.000 km). Perkiraan sekarang 17.050 km."
- Email: subjek "PrimeGarage: 3 komponen kendaraanmu perlu perhatian", berisi tabel komponen, status, sisa umur, dan tombol "Catat servis".

## 6. Interval default: kategori bebek (underbone), acuan Honda Supra X 125 FI

**Penting**: nilai di bawah adalah **estimasi umum awal** dan **wajib diverifikasi dengan buku servis resmi** sebelum Fase 3 (lihat PRD Keputusan terbuka no. 5). Pengguna selalu dapat mengubahnya per kendaraan.

| part_code | Komponen | Tindakan | Interval km | Interval bulan | reset_actions |
|---|---|---|---|---|---|
| engine_oil | Oli mesin | replace | 2.000 | 3 | replace |
| spark_plug | Busi | inspect | 4.000 | 6 | inspect, clean, replace |
| spark_plug | Busi | replace | 8.000 | 12 | replace |
| air_filter | Filter udara | replace | 12.000 | 12 | replace |
| drive_chain | Rantai dan gir | lubricate | 500 | 1 | lubricate, adjust, replace |
| drive_chain | Rantai dan gir | adjust | 1.000 | 2 | adjust, replace |
| drive_chain | Rantai dan gir | replace | 20.000 | | replace |
| brake_pad_front | Kampas rem depan (cakram) | inspect | 4.000 | 4 | inspect, replace |
| brake_pad_front | Kampas rem depan (cakram) | replace | 12.000 | | replace |
| brake_shoe_rear | Kampas rem belakang (tromol) | inspect | 4.000 | 4 | inspect, adjust, replace |
| brake_shoe_rear | Kampas rem belakang (tromol) | replace | 15.000 | | replace |
| brake_fluid | Minyak rem | inspect | 4.000 | 4 | inspect, top_up, replace |
| brake_fluid | Minyak rem | replace | | 24 | replace |
| tire_front | Ban depan | inspect | 2.000 | 1 | inspect, replace |
| tire_front | Ban depan | replace | 20.000 | 48 | replace |
| tire_rear | Ban belakang | inspect | 2.000 | 1 | inspect, replace |
| tire_rear | Ban belakang | replace | 15.000 | 48 | replace |
| battery | Aki | inspect | | 6 | inspect, replace |
| battery | Aki | replace | | 24 | replace |
| throttle_body | Throttle body / injektor | clean | 8.000 | 12 | clean |
| valve_clearance | Celah katup (klep) | adjust | 8.000 | 12 | adjust |
| clutch | Kopling | inspect | 8.000 | 12 | inspect, adjust, replace |
| front_fork | Suspensi depan (shock) | inspect | 8.000 | 12 | inspect, repair, replace |
| lighting | Lampu dan klakson | inspect | | 3 | inspect, repair, replace |

Kategori lain (matic, sport, mobil) menambahkan komponen seperti `cvt_belt`, `gear_oil`, `coolant`, `roller_weights` dengan tabel interval sendiri saat kategori tersebut ditambahkan.

## 7. Kasus uji wajib (unit test `packages/shared`)

1. Contoh di bagian 4 menghasilkan status `GOOD`, sisa 35%, `dueDate` 2026-03-29, `dueReason` "km".
2. Aturan hanya bulan (aki, 24 bulan) mengabaikan km.
3. Aturan hanya km (rantai ganti 20.000 km) mengabaikan waktu.
4. Tanpa riwayat dan bukan kendaraan baru → `NO_DATA`.
5. Kendaraan baru (`initialOdometerKm <= 100`) tanpa riwayat → baseline dari tanggal beli.
6. Item `top_up` minyak rem **tidak** mereset aturan `replace` minyak rem, tetapi mereset aturan `inspect`.
7. `usage` tepat 0,8 → `SOON`; tepat 1,0 → `DUE`.
8. Odometer tidak diperbarui 20 hari → `isOdometerStale = true` dan `estimatedKm` memakai proyeksi.
9. Dua servis di tanggal sama → baseline memakai odometer terbesar.
10. Batas bulan: baseline 31 Januari + 1 bulan = 28/29 Februari (perilaku `addMonths` date-fns).
