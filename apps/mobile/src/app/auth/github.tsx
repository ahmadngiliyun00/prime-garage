import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Loading, Screen } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/**
 * Return page of the GitHub login (web redirect, or a deep link on native when the auth
 * session did not capture it). Trades the one-time code for a session.
 */
export default function GithubReturnScreen() {
  const auth = useAuth();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const [error, setError] = useState<string | null>(params.error ?? null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !params.code || auth.status === 'signedIn') return;
    started.current = true;
    auth.exchangeGithubCode(params.code).catch((e: unknown) => setError(errorMessage(e)));
  }, [auth, params.code]);

  if (auth.status === 'signedIn') return <Redirect href="/" />;
  if (!error && params.code) return <Loading label="Masuk dengan GitHub..." />;

  return (
    <Screen>
      <View className="mt-16">
        <Card>
          <Text className="mb-4 text-center text-base text-red-600">{error ?? 'Login GitHub tidak selesai'}</Text>
          <Button title="Kembali ke halaman masuk" icon="arrow-back" onPress={() => router.replace('/login')} />
        </Card>
      </View>
    </Screen>
  );
}
