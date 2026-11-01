import '@/lib/web-color-scheme';
import '../../global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/auth';
import { queryClient } from '@/lib/query-client';

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerTintColor: dark ? '#fff' : '#171717',
              headerStyle: { backgroundColor: dark ? '#0a0a0a' : '#ffffff' },
              contentStyle: { backgroundColor: dark ? '#0a0a0a' : '#fafafa' },
              headerBackTitle: 'Kembali',
            }}
          >
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false, title: 'Masuk' }} />
            <Stack.Screen name="auth/github" options={{ headerShown: false, title: 'Masuk dengan GitHub' }} />
            <Stack.Screen name="privacy" options={{ title: 'Kebijakan Privasi' }} />
            <Stack.Screen name="delete-account" options={{ title: 'Hapus Akun' }} />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
