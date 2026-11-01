import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useNotifications } from '@/lib/hooks';

export default function TabsLayout() {
  const dark = useColorScheme() === 'dark';
  const { data } = useNotifications();
  const unread = data?.items.filter((n) => !n.readAt).length ?? 0;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#dc2626',
        headerTintColor: dark ? '#fff' : '#0f172a',
        headerStyle: { backgroundColor: dark ? '#020617' : '#ffffff' },
        tabBarStyle: { backgroundColor: dark ? '#020617' : '#ffffff' },
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
