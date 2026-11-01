/**
 * Part catalog and education content (seeded into the `parts` table, also bundled in the app as offline fallback).
 * Text is user-facing Indonesian.
 */
import type { PartGroup, VehicleCategory } from '../enums.js';

export type PartDefinition = {
  code: string;
  name: string;
  nameEn: string;
  group: PartGroup;
  appliesTo: VehicleCategory[];
  summary: string;
  functionText: string;
  symptomsText: string;
  careTipsText: string;
  tourOrder: number | null;
  sortOrder: number;
};

const MOTO: VehicleCategory[] = ['underbone', 'scooter', 'sport', 'trail'];
const CHAIN_MOTO: VehicleCategory[] = ['underbone', 'sport', 'trail'];

export const PARTS: PartDefinition[] = [
  {
    code: 'engine_oil',
    name: 'Oli Mesin',
    nameEn: 'Engine Oil',
    group: 'fluid',
    appliesTo: MOTO,
    summary: 'Pelumas utama mesin. Bagian yang paling sering perlu diganti.',
    functionText:
      'Melumasi piston, kruk as, klep, dan gigi transmisi agar logam tidak saling bergesekan langsung. Oli juga membantu mendinginkan mesin dan membawa kotoran hasil pembakaran.',
    symptomsText:
      'Suara mesin lebih kasar, mesin cepat panas, perpindahan gigi terasa keras, oli terlihat hitam pekat atau berkurang banyak saat dicek, konsumsi bensin naik.',
    careTipsText:
      'Ganti sesuai interval (km atau bulan, mana yang lebih dulu). Gunakan oli dengan kekentalan dan standar sesuai buku servis. Cek level oli lewat tutup pengisian setiap 2 minggu dengan motor tegak di tanah datar.',
    tourOrder: 1,
    sortOrder: 10,
  },
  {
    code: 'spark_plug',
    name: 'Busi',
    nameEn: 'Spark Plug',
    group: 'electrical',
    appliesTo: MOTO,
    summary: 'Pemercik api yang menyalakan campuran bensin dan udara di ruang bakar.',
    functionText:
      'Menghasilkan percikan listrik bertegangan tinggi di ruang bakar sehingga campuran bensin dan udara terbakar dan mendorong piston.',
    symptomsText:
      'Motor susah dihidupkan, tarikan tersendat atau brebet, langsam tidak stabil, boros bensin, elektroda busi hitam berkerak atau aus.',
    careTipsText:
      'Periksa dan bersihkan secara berkala, ganti sesuai interval. Gunakan tipe busi sesuai spesifikasi pabrikan dan kencangkan dengan torsi yang benar.',
    tourOrder: 2,
    sortOrder: 20,
  },
  {
    code: 'air_filter',
    name: 'Filter Udara',
    nameEn: 'Air Filter',
    group: 'engine',
    appliesTo: MOTO,
    summary: 'Saringan udara yang masuk ke mesin.',
    functionText: 'Menyaring debu dan kotoran dari udara sebelum masuk ke throttle body atau karburator dan ruang bakar.',
    symptomsText: 'Tarikan berat, mesin terasa kurang tenaga, konsumsi bensin naik, filter terlihat sangat kotor atau sobek.',
    careTipsText:
      'Ganti sesuai interval, lebih cepat jika sering melewati jalan berdebu. Filter tipe kertas kering atau viscous tidak boleh dicuci; ikuti petunjuk buku servis.',
    tourOrder: 3,
    sortOrder: 30,
  },
  {
    code: 'drive_chain',
    name: 'Rantai dan Gir',
    nameEn: 'Drive Chain and Sprockets',
    group: 'drivetrain',
    appliesTo: CHAIN_MOTO,
    summary: 'Penyalur tenaga dari mesin ke roda belakang.',
    functionText: 'Rantai bersama gir depan dan gir belakang meneruskan putaran mesin ke roda belakang.',
    symptomsText:
      'Rantai berbunyi atau terlalu kendur, hentakan saat gas dibuka-tutup, gigi gir runcing atau tidak rata, rantai berkarat dan kaku.',
    careTipsText:
      'Lumasi rantai rutin terutama setelah hujan, setel kekenduran sesuai buku servis (umumnya 2 sampai 3 cm), ganti rantai dan kedua gir sekaligus sebagai satu set.',
    tourOrder: 4,
    sortOrder: 40,
  },
  {
    code: 'brake_pad_front',
    name: 'Kampas Rem Depan',
    nameEn: 'Front Brake Pads',
    group: 'brake',
    appliesTo: MOTO,
    summary: 'Bantalan rem cakram depan, penentu utama daya pengereman.',
    functionText: 'Kampas dijepit kaliper ke piringan cakram sehingga roda depan melambat. Rem depan menanggung sebagian besar daya pengereman.',
    symptomsText: 'Bunyi mencicit atau gesekan logam saat mengerem, rem kurang pakem, tuas rem terasa lebih dalam, ketebalan kampas tinggal tipis.',
    careTipsText: 'Periksa ketebalan kampas secara berkala dan ganti sebelum habis agar piringan cakram tidak tergores.',
    tourOrder: 5,
    sortOrder: 50,
  },
  {
    code: 'brake_fluid',
    name: 'Minyak Rem',
    nameEn: 'Brake Fluid',
    group: 'fluid',
    appliesTo: MOTO,
    summary: 'Cairan hidrolik yang meneruskan tekanan tuas rem ke kaliper.',
    functionText: 'Meneruskan tekanan dari tuas rem di setang ke piston kaliper sehingga kampas menjepit cakram.',
    symptomsText: 'Tuas rem terasa lembek atau harus dipompa, level minyak di tabung master di bawah garis LOWER, warna minyak gelap.',
    careTipsText:
      'Cek level di jendela tabung master rem. Tambah dengan tipe DOT yang sama jika kurang, dan ganti seluruhnya secara berkala karena minyak rem menyerap air.',
    tourOrder: 6,
    sortOrder: 60,
  },
  {
    code: 'brake_shoe_rear',
    name: 'Kampas Rem Belakang',
    nameEn: 'Rear Brake Shoes',
    group: 'brake',
    appliesTo: ['underbone', 'scooter'],
    summary: 'Kampas rem tromol roda belakang.',
    functionText: 'Kampas di dalam tromol mengembang dan menekan dinding tromol untuk memperlambat roda belakang.',
    symptomsText: 'Pedal rem harus diinjak lebih dalam, rem belakang kurang pakem, bunyi saat mengerem, indikator keausan di tromol sudah di batas.',
    careTipsText: 'Setel jarak main pedal rem dan periksa keausan kampas saat servis rutin. Ganti jika indikator sudah mencapai batas.',
    tourOrder: 7,
    sortOrder: 70,
  },
  {
    code: 'tire_front',
    name: 'Ban Depan',
    nameEn: 'Front Tire',
    group: 'wheel',
    appliesTo: MOTO,
    summary: 'Ban depan, penentu kendali dan cengkeraman saat berbelok dan mengerem.',
    functionText: 'Memberi cengkeraman ke jalan, meredam getaran, dan menentukan stabilitas kemudi.',
    symptomsText: 'Alur ban tipis atau sudah mencapai TWI (tanda keausan), retak di dinding ban, sering kempes, setang terasa bergetar.',
    careTipsText: 'Cek tekanan angin setiap minggu sesuai stiker spesifikasi, ganti saat alur mencapai batas TWI atau ban sudah retak karena usia.',
    tourOrder: 8,
    sortOrder: 80,
  },
  {
    code: 'tire_rear',
    name: 'Ban Belakang',
    nameEn: 'Rear Tire',
    group: 'wheel',
    appliesTo: MOTO,
    summary: 'Ban belakang, menerima tenaga mesin dan menanggung beban terbesar.',
    functionText: 'Menyalurkan tenaga ke jalan dan menopang sebagian besar beban pengendara serta boncengan.',
    symptomsText: 'Alur ban tipis, bagian tengah ban rata, retak, sering kempes, motor terasa limbung.',
    careTipsText: 'Ban belakang biasanya lebih cepat aus daripada ban depan. Jaga tekanan angin sesuai beban, terutama saat berboncengan.',
    tourOrder: 9,
    sortOrder: 90,
  },
  {
    code: 'battery',
    name: 'Aki',
    nameEn: 'Battery',
    group: 'electrical',
    appliesTo: MOTO,
    summary: 'Sumber listrik untuk starter, lampu, dan sistem injeksi.',
    functionText: 'Menyimpan listrik untuk menyalakan starter elektrik, klakson, lampu, dan modul injeksi (ECU).',
    symptomsText: 'Starter lemah atau tidak berfungsi, klakson pelan, lampu redup saat mesin mati, motor injeksi sulit hidup.',
    careTipsText: 'Periksa tegangan aki saat servis (sekitar 12,5 volt saat mesin mati). Hindari menyalakan aksesori listrik lama saat mesin mati.',
    tourOrder: 10,
    sortOrder: 100,
  },
  {
    code: 'throttle_body',
    name: 'Throttle Body dan Injektor',
    nameEn: 'Throttle Body and Injector',
    group: 'fuel',
    appliesTo: MOTO,
    summary: 'Pengatur jumlah udara dan bensin yang masuk ke mesin pada motor injeksi.',
    functionText: 'Katup di throttle body mengatur aliran udara sesuai bukaan gas, sementara injektor menyemprotkan bensin dalam jumlah yang diatur ECU.',
    symptomsText: 'Langsam naik turun atau mati saat berhenti, tarikan tersendat, boros bensin, lampu indikator injeksi (MIL) menyala.',
    careTipsText: 'Bersihkan throttle body secara berkala dengan cairan khusus, gunakan bensin berkualitas sesuai rekomendasi oktan.',
    tourOrder: 11,
    sortOrder: 110,
  },
  {
    code: 'clutch',
    name: 'Kopling',
    nameEn: 'Clutch',
    group: 'drivetrain',
    appliesTo: MOTO,
    summary: 'Penghubung dan pemutus tenaga mesin ke transmisi saat pindah gigi.',
    functionText: 'Pada motor bebek, kopling otomatis (sentrifugal) bekerja saat tuas persneling ditekan sehingga perpindahan gigi halus.',
    symptomsText: 'Motor terasa selip (putaran mesin naik tapi laju tidak bertambah), perpindahan gigi keras atau menyentak.',
    careTipsText: 'Setel kopling sesuai buku servis dan gunakan oli mesin yang sesuai standar untuk kopling basah.',
    tourOrder: null,
    sortOrder: 120,
  },
  {
    code: 'valve_clearance',
    name: 'Celah Katup (Klep)',
    nameEn: 'Valve Clearance',
    group: 'engine',
    appliesTo: MOTO,
    summary: 'Jarak kecil pada mekanisme klep yang harus tepat agar mesin bekerja optimal.',
    functionText: 'Celah katup memastikan klep masuk dan buang menutup sempurna saat mesin panas sehingga kompresi terjaga.',
    symptomsText: 'Bunyi tik-tik dari kepala silinder, tenaga berkurang, mesin susah hidup saat dingin.',
    careTipsText: 'Setel celah katup oleh mekanik dalam kondisi mesin dingin sesuai spesifikasi pabrikan.',
    tourOrder: null,
    sortOrder: 130,
  },
  {
    code: 'front_fork',
    name: 'Suspensi Depan',
    nameEn: 'Front Fork',
    group: 'suspension',
    appliesTo: MOTO,
    summary: 'Peredam kejut roda depan.',
    functionText: 'Menyerap guncangan jalan pada roda depan sehingga kemudi stabil dan ban tetap menapak.',
    symptomsText: 'Rembesan oli di tabung shock, bunyi saat melewati jalan rusak, suspensi terasa terlalu empuk atau mentok.',
    careTipsText: 'Periksa kebocoran seal dan ganti oli shock sesuai rekomendasi bengkel.',
    tourOrder: null,
    sortOrder: 140,
  },
  {
    code: 'rear_shock',
    name: 'Suspensi Belakang',
    nameEn: 'Rear Shock Absorber',
    group: 'suspension',
    appliesTo: MOTO,
    summary: 'Peredam kejut roda belakang.',
    functionText: 'Meredam guncangan pada roda belakang dan menjaga kenyamanan serta kestabilan saat berboncengan.',
    symptomsText: 'Motor memantul berlebihan setelah melewati polisi tidur, rembesan oli, bunyi pada dudukan shock.',
    careTipsText: 'Sesuaikan setelan preload dengan beban dan ganti jika sudah bocor atau tidak meredam.',
    tourOrder: null,
    sortOrder: 150,
  },
  {
    code: 'lighting',
    name: 'Lampu dan Klakson',
    nameEn: 'Lights and Horn',
    group: 'electrical',
    appliesTo: MOTO,
    summary: 'Lampu utama, sein, rem, dan klakson untuk keselamatan.',
    functionText: 'Memberi penerangan, isyarat ke pengguna jalan lain, dan peringatan suara.',
    symptomsText: 'Lampu mati atau redup, sein berkedip terlalu cepat, klakson lemah atau tidak berbunyi.',
    careTipsText: 'Cek semua lampu dan klakson sebelum perjalanan jauh. Ganti bohlam yang mati dengan watt sesuai spesifikasi.',
    tourOrder: null,
    sortOrder: 160,
  },
  {
    code: 'exhaust',
    name: 'Knalpot',
    nameEn: 'Exhaust',
    group: 'engine',
    appliesTo: MOTO,
    summary: 'Saluran pembuangan gas sisa pembakaran.',
    functionText: 'Mengalirkan gas buang, meredam suara mesin, dan pada motor modern dilengkapi katalis untuk mengurangi emisi.',
    symptomsText: 'Suara lebih keras atau pecah, keluar asap putih atau hitam berlebihan, knalpot bocor atau berkarat.',
    careTipsText: 'Hindari mengganti knalpot dengan yang tidak sesuai standar karena memengaruhi tenaga dan emisi.',
    tourOrder: null,
    sortOrder: 170,
  },
  {
    code: 'fuel_tank',
    name: 'Tangki Bensin',
    nameEn: 'Fuel Tank',
    group: 'fuel',
    appliesTo: MOTO,
    summary: 'Penampung bensin. Pada motor bebek letaknya di bawah jok.',
    functionText: 'Menyimpan bensin dan menyalurkannya ke pompa bensin dan injektor.',
    symptomsText: 'Bau bensin menyengat, rembesan di sekitar tangki, indikator bensin tidak akurat.',
    careTipsText: 'Jangan membiarkan bensin terlalu sering hampir habis agar kotoran di dasar tangki tidak tersedot ke pompa.',
    tourOrder: null,
    sortOrder: 180,
  },
];

export const PART_CODES = PARTS.map((p) => p.code);

export function getPart(code: string): PartDefinition | undefined {
  return PARTS.find((p) => p.code === code);
}
