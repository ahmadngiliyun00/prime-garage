import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useNotifications } from '@/lib/hooks';
import { BRAND } from '@/lib/theme';

export default function TabsLayout() {
  const dark = useColorScheme() === 'dark';
  const { data } = useNotifications();
  const unread = data?.items.filter((n) => !n.readAt).length ?? 0;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: BRAND.orange,
        tabBarInactiveTintColor: dark ? '#a3a3a3' : '#737373',
        tabBarStyle: { backgroundColor: dark ? BRAND.black : BRAND.white, borderTopColor: dark ? '#262626' : '#e5e5e5' },
        headerTintColor: dark ? '#fff' : '#171717',
        headerStyle: { backgroundColor: dark ? '#0a0a0a' : '#ffffff' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Garasi', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="workshops"
        options={{ title: 'Bengkel', tabBarIcon: ({ color, size }) => <Ionicons name="build-outline" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifikasi',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Pengaturan', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}
