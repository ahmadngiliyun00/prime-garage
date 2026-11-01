import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import type { UserDto } from '@prime-garage/shared';
import { Body, Button, Card, Field, Heading, Muted, Screen, SwitchRow, Title } from '@/components/ui';
import { errorMessage, http } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirm, notify } from '@/lib/dialogs';

export default function SettingsScreen() {
  const auth = useAuth();
  const user = auth.user;
  const [name, setName] = useState(user?.name ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'Asia/Jakarta');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const update = async (patch: Partial<Pick<UserDto, 'name' | 'timezone' | 'notifyPush' | 'notifyEmail'>>) => {
    setSaving(true);
    try {
      auth.setUser(await http.patch<UserDto>('/me', patch));
    } catch (e) {
      notify('Gagal menyimpan', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    const ok = await confirm(
      'Hapus akun?',
      'Semua garasi, kendaraan, riwayat servis, bengkel, dan foto nota akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.',
      'Hapus permanen',
    );
    if (!ok) return;
    try {
      await http.delete('/me');
      await auth.signOut();
    } catch (e) {
      notify('Gagal menghapus akun', errorMessage(e));
    }
  };

  return (
    <Screen>
      <Title className="mb-4">Pengaturan</Title>

      <Card className="mb-4">
        <Heading className="mb-3">Profil</Heading>
        <Muted className="mb-3">{user.email}</Muted>
        <Field label="Nama" value={name} onChangeText={setName} />
        <Field label="Zona waktu" value={timezone} onChangeText={setTimezone} hint="Contoh: Asia/Jakarta (WIB), Asia/Makassar (WITA), Asia/Jayapura (WIT)" autoCapitalize="none" />
        <Button title="Simpan profil" onPress={() => void update({ name: name.trim(), timezone: timezone.trim() })} loading={saving} />
      </Card>

      <Card className="mb-4">
        <Heading className="mb-1">Pengingat</Heading>
        <Muted className="mb-2">Dikirim setiap hari pukul 07.00 WIB jika ada komponen yang perlu perhatian.</Muted>
        <SwitchRow
          label="Notifikasi HP"
          description={Platform.OS === 'web' ? 'Aktif di aplikasi Android' : 'Push notification Android'}
          value={user.notifyPush}
          onChange={(v) => void update({ notifyPush: v })}
        />
        <SwitchRow label="Email" description={user.email} value={user.notifyEmail} onChange={(v) => void update({ notifyEmail: v })} />
      </Card>

      <Card className="mb-4">
        <Heading className="mb-3">Akun</Heading>
        <View className="gap-2">
          <Button title="Kebijakan privasi" variant="secondary" icon="document-text-outline" onPress={() => router.push('/privacy')} />
          <Button title="Keluar" variant="secondary" icon="log-out-outline" onPress={() => void auth.signOut()} testID="logout" />
          <Button title="Hapus akun" variant="danger" icon="trash-outline" onPress={() => void deleteAccount()} />
        </View>
      </Card>

      <Body className="text-center text-xs text-slate-400">PrimeGarage v{Constants.expoConfig?.version ?? '1.0.0'}</Body>
      {Platform.OS === 'web' ? (
        <Button title="Pasang di Mac (PWA)" variant="ghost" small icon="desktop-outline" onPress={() => notify('Pasang PrimeGarage', 'Safari: menu File, lalu Add to Dock. Chrome: ikon Install di bilah alamat.')} />
      ) : (
        <Button title="Buka versi web" variant="ghost" small icon="globe-outline" onPress={() => void Linking.openURL('https://primegarage.ngiliyun.my.id')} />
      )}
    </Screen>
  );
}
