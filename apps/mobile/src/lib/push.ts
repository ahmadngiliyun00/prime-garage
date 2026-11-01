import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { http } from './api';
import { BRAND } from '@/lib/theme';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * FR-NTF-01: registers the Expo push token with the API (Android/iOS physical devices only).
 * Requires an EAS project ID (EAS_PROJECT_ID at build time) and FCM credentials on EAS.
 */
async function register(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Pengingat servis',
      // eslint-disable-next-line import/namespace -- re-exported enum the import plugin cannot resolve
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: BRAND.orangeStrong,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const status = current.granted ? 'granted' : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;

  const projectId = (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
  if (!projectId) {
    console.warn('Push disabled: EAS projectId is not configured');
    return;
  }
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await http.post('/me/push-tokens', { token, platform: Platform.OS, deviceName: Device.deviceName ?? null });
}

export function usePushNotifications(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    register().catch((e: unknown) => console.warn('Push registration failed', e));

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = (response.notification.request.content.data as { url?: string } | undefined)?.url;
      if (url) router.push(url as never);
    });
    return () => sub.remove();
  }, [enabled]);
}
