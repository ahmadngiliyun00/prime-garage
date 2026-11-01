import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { NotificationDto } from '@prime-garage/shared';
import { Body, Button, EmptyState, ErrorState, Loading, Muted, Screen, Title } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useMarkRead, useNotifications } from '@/lib/hooks';

const ICONS: Record<NotificationDto['type'], { name: 'alert-circle' | 'time' | 'speedometer' | 'information-circle'; color: string }> = {
  component_due: { name: 'alert-circle', color: '#dc2626' },
  component_soon: { name: 'time', color: '#eab308' },
  odometer_stale: { name: 'speedometer', color: '#2563eb' },
  system: { name: 'information-circle', color: '#64748b' },
};

/** FR-NTF-06: in-app notification center. */
export default function NotificationsScreen() {
  const { data, isLoading, error, refetch } = useNotifications();
  const markRead = useMarkRead();
  const items = data?.items ?? [];

  const open = (n: NotificationDto) => {
    if (!n.readAt) markRead.mutate(n.id);
    const url = (n.data?.['url'] as string | undefined) ?? (n.vehicleId ? `/vehicles/${n.vehicleId}` : null);
    if (url) router.push(url as never);
  };

  return (
    <Screen>
      <View className="mb-4 flex-row items-center justify-between">
        <Title>Notifikasi</Title>
        {items.some((n) => !n.readAt) ? <Button title="Tandai dibaca" variant="ghost" small onPress={() => markRead.mutate(undefined)} /> : null}
      </View>
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="notifications-outline" title="Belum ada notifikasi" message="Pengingat servis akan muncul di sini, dan juga dikirim lewat notifikasi HP serta email." />
      ) : (
        items.map((n) => {
          const icon = ICONS[n.type];
          return (
            <Pressable
              key={n.id}
              onPress={() => open(n)}
              className={`mb-2 flex-row gap-3 rounded-2xl border p-4 active:opacity-80 ${n.readAt ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900' : 'border-brand-100 bg-brand-50 dark:border-slate-700 dark:bg-slate-800'}`}
            >
              <Ionicons name={icon.name} size={22} color={icon.color} />
              <View className="flex-1">
                <Body className="font-semibold">{n.title}</Body>
                <Muted className="mt-1">{n.body}</Muted>
                <Muted className="mt-1">{new Date(n.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</Muted>
              </View>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
