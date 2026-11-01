import { Redirect, Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { usePushNotifications } from '@/lib/push';
import { useRealtimeSync } from '@/lib/realtime';

export default function AppLayout() {
  const auth = useAuth();
  const dark = useColorScheme() === 'dark';
  const signedIn = auth.status === 'signedIn';
  useRealtimeSync(signedIn);
  usePushNotifications(signedIn);

  if (auth.status === 'loading') return <Loading label="Menyiapkan garasi..." />;
  if (!signedIn) return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerTintColor: dark ? '#fff' : '#171717',
        headerStyle: { backgroundColor: dark ? '#0a0a0a' : '#ffffff' },
        contentStyle: { backgroundColor: dark ? '#0a0a0a' : '#fafafa' },
        headerBackTitle: 'Kembali',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="vehicles/new" options={{ title: 'Tambah Kendaraan' }} />
      <Stack.Screen name="vehicles/[id]/index" options={{ title: 'Kendaraan' }} />
      <Stack.Screen name="vehicles/[id]/edit" options={{ title: 'Ubah Kendaraan' }} />
      <Stack.Screen name="vehicles/[id]/odometer" options={{ title: 'Odometer' }} />
      <Stack.Screen name="vehicles/[id]/rules" options={{ title: 'Interval Perawatan' }} />
      <Stack.Screen name="vehicles/[id]/services/new" options={{ title: 'Catat Servis' }} />
      <Stack.Screen name="vehicles/[id]/services/[serviceId]" options={{ title: 'Detail Servis' }} />
      <Stack.Screen name="workshops/new" options={{ title: 'Tambah Bengkel' }} />
      <Stack.Screen name="workshops/[workshopId]" options={{ title: 'Bengkel' }} />
    </Stack>
  );
}
