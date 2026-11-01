import { Body, Heading, Muted, Screen, Title } from '@/components/ui';

const SECTIONS: [string, string][] = [
  [
    'Data yang kami kumpulkan',
    'Nama, alamat email, dan foto profil dari akun Google yang kamu pakai untuk masuk; data kendaraan (merek, model, plat nomor, odometer, nomor rangka dan mesin bila diisi); catatan servis, data bengkel, dan foto nota yang kamu unggah; serta token notifikasi perangkat.',
  ],
  [
    'Untuk apa data digunakan',
    'Menyimpan riwayat servis, menghitung perkiraan kondisi komponen, dan mengirim pengingat servis lewat notifikasi aplikasi dan email. Data tidak dijual dan tidak dibagikan ke pihak ketiga untuk iklan.',
  ],
  [
    'Penyimpanan dan keamanan',
    'Data disimpan di server PrimeGarage di Indonesia, dikirim lewat koneksi terenkripsi (HTTPS), dan hanya dapat diakses oleh pemilik garasi. Foto nota hanya dapat dibuka lewat tautan sementara.',
  ],
  [
    'Layanan pihak ketiga',
    'Google Sign-In untuk login, Expo Push Notification dan Firebase Cloud Messaging untuk notifikasi HP, serta Google Workspace untuk pengiriman email pengingat.',
  ],
  [
    'Hak kamu',
    'Kamu dapat mengubah atau menghapus data kapan saja di aplikasi, mematikan pengingat di menu Pengaturan, dan menghapus akun beserta seluruh datanya lewat Pengaturan, Hapus akun, atau halaman /delete-account. Penghapusan bersifat permanen.',
  ],
  ['Kontak', 'Pertanyaan tentang privasi dapat dikirim ke noreply@ngiliyun.my.id atau pengelola aplikasi Ahmad Ngiliyun.'],
];

export default function PrivacyScreen() {
  return (
    <Screen>
      <Title>Kebijakan Privasi PrimeGarage</Title>
      <Muted className="mb-4">Berlaku sejak 1 November 2026</Muted>
      {SECTIONS.map(([h, b]) => (
        <Body key={h} className="mb-4">
          <Heading>{h}</Heading>
          {'\n'}
          {b}
        </Body>
      ))}
    </Screen>
  );
}
