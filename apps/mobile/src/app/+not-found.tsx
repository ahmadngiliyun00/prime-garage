import { Link, Stack } from 'expo-router';
import { Text } from 'react-native';
import { EmptyState, Screen } from '@/components/ui';

export default function NotFound() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Tidak ditemukan' }} />
      <EmptyState
        icon="help-circle-outline"
        title="Halaman tidak ditemukan"
        message="Halaman yang kamu buka tidak ada."
        action={
          <Link href="/">
            <Text className="font-semibold text-brand-600">Kembali ke garasi</Text>
          </Link>
        }
      />
    </Screen>
  );
}
