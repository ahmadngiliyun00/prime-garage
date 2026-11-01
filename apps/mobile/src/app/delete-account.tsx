import { router } from 'expo-router';
import { Body, Button, Card, Heading, Muted, Screen } from '@/components/ui';
import { errorMessage, http } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirm, notify } from '@/lib/dialogs';

/** FR-AUTH-04: public account deletion page (Google Play requirement). */
export default function DeleteAccountScreen() {
  const auth = useAuth();
  const remove = async () => {
    if (!(await confirm('Hapus akun permanen?', 'Semua data garasi, kendaraan, servis, dan foto akan dihapus.', 'Hapus'))) return;
    try {
      await http.delete('/me');
      await auth.signOut();
      notify('Akun dihapus', 'Seluruh data kamu sudah dihapus.');
      router.replace('/login');
    } catch (e) {
      notify('Gagal menghapus akun', errorMessage(e));
    }
  };
  return (
    <Screen>
      <Card>
        <Heading>Hapus akun PrimeGarage</Heading>
        <Body className="mt-2">
          Menghapus akun akan menghapus permanen: profil, garasi, kendaraan, riwayat odometer dan servis, data bengkel, foto nota, notifikasi, dan token perangkat.
        </Body>
        {auth.status === 'signedIn' ? (
          <>
            <Muted className="mt-3">Masuk sebagai {auth.user.email}</Muted>
            <Button title="Hapus akun saya" variant="danger" icon="trash-outline" className="mt-4" onPress={() => void remove()} />
          </>
        ) : (
          <>
            <Muted className="mt-3">Masuk terlebih dahulu untuk menghapus akun.</Muted>
            <Button title="Masuk" className="mt-4" onPress={() => router.push('/login')} />
          </>
        )}
      </Card>
    </Screen>
  );
}
