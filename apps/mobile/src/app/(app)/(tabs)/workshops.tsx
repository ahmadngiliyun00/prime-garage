import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { WORKSHOP_CERTIFICATION_LABELS, WORKSHOP_TYPE_LABELS } from '@prime-garage/shared';
import { Body, Button, Card, EmptyState, ErrorState, Heading, Loading, Muted, Screen, Title } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useWorkshops } from '@/lib/hooks';

export default function WorkshopsScreen() {
  const { data, isLoading, error, refetch } = useWorkshops();
  return (
    <Screen>
      <View className="mb-4 flex-row items-center justify-between">
        <Title>Bengkel</Title>
        <Button title="Tambah" icon="add" small onPress={() => router.push('/workshops/new')} />
      </View>
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon="build-outline"
          title="Belum ada bengkel"
          message="Simpan bengkel langgananmu, baik dealer resmi maupun bengkel umum, agar mudah dipilih saat mencatat servis."
        />
      ) : (
        (data ?? []).map((w) => (
          <Card key={w.id} className="mb-3" onPress={() => router.push(`/workshops/${w.id}`)}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Heading>{w.name}</Heading>
                <Muted>
                  {WORKSHOP_TYPE_LABELS[w.type]} · {WORKSHOP_CERTIFICATION_LABELS[w.certification]}
                </Muted>
                {w.city || w.address ? <Body className="mt-1">{[w.address, w.city].filter(Boolean).join(', ')}</Body> : null}
                <Muted className="mt-1">{w.serviceCount ?? 0} kali servis</Muted>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
