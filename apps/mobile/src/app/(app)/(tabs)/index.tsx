import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, RefreshControl, ScrollView, Text, View } from 'react-native';
import {
  COMPONENT_STATUS_COLORS,
  SERVICE_ACTION_LABELS,
  formatDateId,
  formatKm,
  formatRupiah,
  type DashboardVehicleDto,
} from '@prime-garage/shared';
import { Body, Button, Card, EmptyState, ErrorState, Heading, Loading, Muted, StatusBadge, Title } from '@/components/ui';
import { absoluteUrl, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDashboard } from '@/lib/hooks';

function Count({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View className="flex-1 items-center rounded-xl py-2" style={{ backgroundColor: `${color}18` }}>
      <Text className="text-xl font-bold" style={{ color }}>
        {value}
      </Text>
      <Muted>{label}</Muted>
    </View>
  );
}

function VehicleCard({ item }: { item: DashboardVehicleDto }) {
  const { vehicle, counts, urgent, lastService } = item;
  const photo = absoluteUrl(vehicle.photoUrl);
  return (
    <Card className="mb-4" onPress={() => router.push(`/vehicles/${vehicle.id}`)}>
      <View className="flex-row items-center gap-3">
        {photo ? (
          <Image source={{ uri: photo }} className="h-14 w-14 rounded-xl" />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-xl bg-brand-50 dark:bg-slate-800">
            <Ionicons name="bicycle-outline" size={28} color="#dc2626" />
          </View>
        )}
        <View className="flex-1">
          <Heading>{vehicle.nickname}</Heading>
          <Muted>
            {vehicle.displayName}
            {vehicle.plateNumber ? ` · ${vehicle.plateNumber}` : ''}
          </Muted>
          <Muted>Odometer {formatKm(vehicle.currentOdometerKm)}</Muted>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </View>

      <View className="mt-3 flex-row gap-2">
        <Count value={counts.due} label="Jatuh tempo" color={COMPONENT_STATUS_COLORS.DUE} />
        <Count value={counts.soon} label="Segera" color={COMPONENT_STATUS_COLORS.SOON} />
        <Count value={counts.good} label="Baik" color={COMPONENT_STATUS_COLORS.GOOD} />
      </View>

      {urgent.length > 0 ? (
        <View className="mt-3">
          {urgent.slice(0, 3).map((c) => (
            <View key={c.ruleId} className="flex-row items-center justify-between border-t border-slate-100 py-2 dark:border-slate-800">
              <View className="flex-1 pr-2">
                <Body>
                  {c.partName} <Muted>({SERVICE_ACTION_LABELS[c.action].toLowerCase()})</Muted>
                </Body>
                <Muted>
                  {c.status === 'DUE' && c.overdueDays > 0 ? `Lewat ${c.overdueDays} hari` : c.dueDate ? `Perkiraan ${formatDateId(c.dueDate)}` : ''}
                </Muted>
              </View>
              <StatusBadge status={c.status} />
            </View>
          ))}
        </View>
      ) : counts.noData > 0 && counts.good === 0 ? (
        <Muted className="mt-3">Catat servis terakhir agar PrimeGarage bisa menghitung kondisi komponen.</Muted>
      ) : (
        <Muted className="mt-3">Semua komponen dalam kondisi baik.</Muted>
      )}

      {lastService ? (
        <Muted className="mt-2">
          Servis terakhir {formatDateId(lastService.serviceDate)}
          {lastService.workshopName ? ` di ${lastService.workshopName}` : ''} · {formatRupiah(lastService.totalCost)}
        </Muted>
      ) : null}
    </Card>
  );
}

export default function GarageScreen() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch, isRefetching } = useDashboard();

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      <View className="w-full max-w-3xl self-center px-4 pb-10 pt-4">
        <Muted>Halo, {user?.name?.split(' ')[0]}</Muted>
        <View className="mb-4 flex-row items-center justify-between">
          <Title>Garasi Saya</Title>
          <Button title="Tambah" icon="add" small onPress={() => router.push('/vehicles/new')} testID="add-vehicle" />
        </View>
        {isLoading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
        ) : data && data.vehicles.length > 0 ? (
          data.vehicles.map((v) => <VehicleCard key={v.vehicle.id} item={v} />)
        ) : (
          <EmptyState
            icon="bicycle-outline"
            title="Garasi masih kosong"
            message="Tambahkan motormu untuk mulai mencatat servis dan memantau kondisi komponen."
            action={<Button title="Tambah kendaraan" icon="add" onPress={() => router.push('/vehicles/new')} />}
          />
        )}
      </View>
    </ScrollView>
  );
}
