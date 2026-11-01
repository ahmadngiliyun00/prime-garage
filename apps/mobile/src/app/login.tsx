import { Ionicons } from '@expo/vector-icons';
import { Link, Redirect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { passwordLoginSchema } from '@prime-garage/shared';
import { Body, Button, Card, Field, Muted, Screen, Title } from '@/components/ui';
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { GOOGLE_WEB_CLIENT_ID, SHOW_DEV_LOGIN } from '@/lib/config';

export default function LoginScreen() {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('demo@primegarage.local');
  const [name, setName] = useState('Pengguna Demo');
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const onIdToken = useCallback(
    async (idToken: string) => {
      setError(null);
      await auth.signInWithGoogle(idToken);
    },
    [auth],
  );
  const onError = useCallback((m: string) => setError(m), []);

  if (auth.status === 'signedIn') return <Redirect href="/" />;

  const passwordLogin = async () => {
    const parsed = passwordLoginSchema.safeParse({ username, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Lengkapi username dan password');
      return;
    }
    setSigningIn(true);
    setError(null);
    try {
      await auth.signInWithPassword(parsed.data.username, parsed.data.password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSigningIn(false);
    }
  };

  const devLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await auth.devLogin(email.trim(), name.trim());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View className="mt-10 items-center">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-brand-600">
          <Ionicons name="speedometer-outline" size={44} color="#fff" />
        </View>
        <Title className="mt-4">PrimeGarage</Title>
        <Muted className="mt-1 text-center">Pantau kondisi kendaraanmu, servis tepat waktu.</Muted>
      </View>

      <Card className="mt-8">
        <Body className="mb-4 text-center">Masuk untuk menyimpan riwayat servis dan menerima pengingat.</Body>
        <Field
          label="Username atau email"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          testID="login-username"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={passwordLogin}
          returnKeyType="go"
          testID="login-password"
        />
        <Button title="Masuk" icon="log-in-outline" onPress={passwordLogin} loading={signingIn} testID="password-login" />
        {GOOGLE_WEB_CLIENT_ID ? (
          <View className="mt-3">
            <GoogleSignInButton onIdToken={onIdToken} onError={onError} />
          </View>
        ) : null}
        {error ? <Text className="mt-3 text-center text-sm text-red-600">{error}</Text> : null}
      </Card>

      {SHOW_DEV_LOGIN ? (
        <Card className="mt-4">
          <Body className="mb-2 font-semibold">Login pengembang</Body>
          <Muted className="mb-3">Hanya untuk development (AUTH_DEV_LOGIN_ENABLED=true di API).</Muted>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Nama" value={name} onChangeText={setName} />
          <Button title="Masuk (dev)" variant="secondary" onPress={devLogin} loading={busy} testID="dev-login" />
        </Card>
      ) : null}

      <View className="mt-6 items-center">
        <Link href="/privacy">
          <Text className="text-sm text-slate-500 underline">Kebijakan Privasi</Text>
        </Link>
      </View>
    </Screen>
  );
}
