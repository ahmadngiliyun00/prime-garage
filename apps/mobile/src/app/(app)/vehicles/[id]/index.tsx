import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import {
  COMPONENT_STATUS_COLORS,
  SERVICE_ACTION_LABELS,
  VEHICLE_CATEGORY_LABELS,
  formatDateId,
  formatInterval,
  formatKm,
  formatRupiah,
  type ComponentStatusDto,
  type VehicleDto,
} from '@prime-garage/shared';
import {
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Heading,
  InfoRow,
  Loading,
  Muted,
  ProgressBar,
  Screen,
  SegmentedTabs,
  Select,
  StatusBadge,
} from '@/components/ui';
import { VehicleExplorer } from '@/features/viewer3d/VehicleExplorer';
import { absoluteUrl, errorMessage } from '@/lib/api';
import { confirm, notify } from '@/lib/dialogs';
import { useArchiveVehicle, useComponents, useDeleteVehicle, useParts, useServices, useVehicle } from '@/lib/hooks';
import { queryClient, qk } from '@/lib/query-client';
import { uploadImage } from '@/lib/upload';
import { BRAND } from '@/lib/theme';

type Tab = '3d' | 'condition' | 'services' | 'info';

export default function VehicleDetailScreen() {
  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(initialTab ?? '3d');
  const vehicle = useVehicle(id);
  const components = useComponents(id);

  if (vehicle.isLoading) return <Loading />;
  if (vehicle.error || !vehicle.data) return <ErrorState message={errorMessage(vehicle.error)} onRetry={() => void vehicle.refetch()} />;
  const v = vehicle.data;

  return (
    <Screen wide={tab === '3d'}>
      <Stack.Screen options={{ title: v.nickname }} />
      <View className="mb-3">
        <Heading>{v.displayName}</Heading>
        <Muted>
          {v.plateNumber ? `${v.plateNumber} · ` : ''}
          {formatKm(v.currentOdometerKm)}
          {v.archivedAt ? ' · Diarsipkan' : ''}
        </Muted>
      </View>
      <SegmentedTabs
        tabs={[
          { value: '3d', label: '3D', icon: 'cube-outline' },
          { value: 'condition', label: 'Kondisi', icon: 'pulse-outline' },
          { value: 'services', label: 'Servis', icon: 'construct-outline' },
          { value: 'info', label: 'Info', icon: 'information-circle-outline' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <View className="mt-4">
        {tab === '3d' ? <VehicleExplorer vehicle={v} components={components.data ?? []} /> : null}
        {tab === 'condition' ? <ConditionTab vehicle={v} components={components.data} loading={components.isLoading} /> : null}
        {tab === 'services' ? <ServicesTab vehicleId={v.id} /> : null}
        {tab === 'info' ? <InfoTab vehicle={v} /> : null}
      </View>
    </Screen>
  );
}

function ComponentRow({ c, vehicleId }: { c: ComponentStatusDto; vehicleId: string }) {
  return (
    <Pressable
      onPress={() => router.push(`/vehicles/${vehicleId}/services/new?partCode=${c.partCode}`)}
      className="border-b border-slate-100 py-3 active:opacity-70 dark:border-slate-800"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Body className="font-medium">
            {c.partName} <Muted>· {SERVICE_ACTION_LABELS[c.action]} tiap {formatInterval(c.intervalKm, c.intervalMonths)}</Muted>
          </Body>
        </View>
        <StatusBadge status={c.status} />
      </View>
      {c.remainingPercent != null ? (
        <View className="mt-2">
          <ProgressBar percent={c.remainingPercent} color={COMPONENT_STATUS_COLORS[c.status]} />
          <Muted className="mt-1">
            Sisa {c.remainingPercent}%
            {c.dueDate ? ` · ${c.status === 'DUE' && c.overdueDays > 0 ? `lewat ${c.overdueDays} hari` : `perkiraan ${formatDateId(c.dueDate)}`}` : ''}
            {c.dueKm != null ? ` · ${formatKm(c.dueKm)}` : ''}
          </Muted>
          {c.baseline ? (
            <Muted>
              Terakhir {formatDateId(c.baseline.date)} di {formatKm(c.baseline.km)}
              {c.baseline.source === 'purchase' ? ' (tanggal beli)' : ''}
            </Muted>
          ) : null}
        </View>
      ) : (
        <Muted className="mt-1">Belum ada data. Ketuk untuk mencatat servis terakhir bagian ini.</Muted>
      )}
    </Pressable>
  );
}

function ConditionTab({ vehicle, components, loading }: { vehicle: VehicleDto; components?: ComponentStatusDto[]; loading: boolean }) {
  if (loading) return <Loading />;
  const list = components ?? [];
  const stale = list[0]?.isOdometerStale;
  const known = list.filter((c) => c.status !== 'NO_DATA');
  const unknown = list.filter((c) => c.status === 'NO_DATA');
  return (
    <View>
      {stale ? (
        <Card className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-slate-900">
          <View className="flex-row items-center gap-2">
            <Ionicons name="speedometer-outline" size={20} color={BRAND.orangeStrong} />
            <Body className="flex-1">Odometer belum diperbarui lebih dari 14 hari. Angka di bawah memakai perkiraan.</Body>
          </View>
          <Button title="Perbarui odometer" small className="mt-3" onPress={() => router.push(`/vehicles/${vehicle.id}/odometer`)} />
        </Card>
      ) : null}
      <Card className="mb-4">
        <Heading className="mb-1">Kondisi komponen</Heading>
        <Muted>Estimasi dari jarak tempuh dan waktu sejak servis terakhir, mana yang lebih dulu tercapai.</Muted>
        {known.length === 0 ? (
          <Muted className="mt-3">Belum ada komponen dengan data servis.</Muted>
        ) : (
          known.map((c) => <ComponentRow key={c.ruleId} c={c} vehicleId={vehicle.id} />)
        )}
      </Card>
      {unknown.length > 0 ? (
        <Card className="mb-4">
          <Heading className="mb-1">Belum ada data</Heading>
          {unknown.map((c) => (
            <ComponentRow key={c.ruleId} c={c} vehicleId={vehicle.id} />
          ))}
        </Card>
      ) : null}
      <View className="flex-row gap-2">
        <Button title="Catat servis" icon="add" className="flex-1" onPress={() => router.push(`/vehicles/${vehicle.id}/services/new`)} />
        <Button title="Atur interval" icon="options-outline" variant="secondary" className="flex-1" onPress={() => router.push(`/vehicles/${vehicle.id}/rules`)} />
      </View>
    </View>
  );
}

function ServicesTab({ vehicleId }: { vehicleId: string }) {
  const [partCode, setPartCode] = useState<string>('');
  const { data: parts = [] } = useParts();
  const { data, isLoading, error, refetch } = useServices(vehicleId, partCode || undefined);
  return (
    <View>
      <Button title="Catat servis" icon="add" onPress={() => router.push(`/vehicles/${vehicleId}/services/new`)} testID="add-service" />
      <Select
        className="mt-3"
        label="Filter bagian"
        value={partCode}
        searchable
        options={[{ value: '', label: 'Semua bagian' }, ...parts.map((p) => ({ value: p.code, label: p.name }))]}
        onChange={setPartCode}
      />
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon="construct-outline" title="Belum ada catatan servis" message="Catat servis pertamamu, misalnya ganti oli terakhir, agar kondisi komponen bisa dihitung." />
      ) : (
        (data ?? []).map((s) => (
          <Card key={s.id} className="mb-3" onPress={() => router.push(`/vehicles/${vehicleId}/services/${s.id}`)}>
            <View className="flex-row items-center justify-between">
              <Heading>{formatDateId(s.serviceDate)}</Heading>
              <Body className="font-semibold">{formatRupiah(s.totalCost)}</Body>
            </View>
            <Muted>
              {formatKm(s.odometerKm)}
              {s.workshop ? ` · ${s.workshop.name}` : ''}
            </Muted>
            <Body className="mt-2" numberOfLines={2}>
              {s.items.map((i) => `${SERVICE_ACTION_LABELS[i.action]} ${i.partName.toLowerCase()}`).join(', ')}
            </Body>
            {s.attachments.length > 0 ? <Muted className="mt-1">{s.attachments.length} foto nota</Muted> : null}
          </Card>
        ))
      )}
    </View>
  );
}

function InfoTab({ vehicle }: { vehicle: VehicleDto }) {
  const archive = useArchiveVehicle(vehicle.id);
  const remove = useDeleteVehicle(vehicle.id);
  const [uploading, setUploading] = useState(false);
  const photo = absoluteUrl(vehicle.photoUrl);

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [4, 3] });
    if (res.canceled || !res.assets[0]) return;
    setUploading(true);
    try {
      await uploadImage(res.assets[0], 'vehicle', vehicle.id);
      await queryClient.invalidateQueries({ queryKey: qk.vehicle(vehicle.id) });
    } catch (e) {
      notify('Gagal mengunggah foto', errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async () => {
    if (!(await confirm('Hapus kendaraan?', `${vehicle.nickname} beserta seluruh riwayat servisnya akan dihapus permanen.`, 'Hapus'))) return;
    await remove.mutateAsync();
    router.replace('/');
  };

  return (
    <View>
      <Card className="mb-4">
        {photo ? <Image source={{ uri: photo }} className="mb-3 h-48 w-full rounded-xl" resizeMode="cover" /> : null}
        <Button title={photo ? 'Ganti foto' : 'Tambah foto kendaraan'} icon="camera-outline" variant="secondary" small onPress={() => void pickPhoto()} loading={uploading} />
      </Card>
      <Card className="mb-4">
        <InfoRow label="Merek dan model" value={vehicle.displayName} />
        <InfoRow label="Kategori" value={VEHICLE_CATEGORY_LABELS[vehicle.category]} />
        <InfoRow label="Plat nomor" value={vehicle.plateNumber} />
        <InfoRow label="Tahun" value={vehicle.year} />
        <InfoRow label="Warna" value={vehicle.color} />
        <InfoRow label="Kapasitas mesin" value={vehicle.engineCc ? `${vehicle.engineCc} cc` : null} />
        <InfoRow label="Nomor rangka" value={vehicle.frameNumber} />
        <InfoRow label="Nomor mesin" value={vehicle.engineNumber} />
        <InfoRow label="Tanggal beli" value={vehicle.purchaseDate ? formatDateId(vehicle.purchaseDate) : null} />
        <InfoRow label="Odometer" value={`${formatKm(vehicle.currentOdometerKm)} (${new Date(vehicle.currentOdometerAt).toLocaleDateString('id-ID')})`} />
      </Card>
      <View className="gap-2">
        <Button title="Perbarui odometer" icon="speedometer-outline" onPress={() => router.push(`/vehicles/${vehicle.id}/odometer`)} />
        <Button title="Ubah data kendaraan" icon="create-outline" variant="secondary" onPress={() => router.push(`/vehicles/${vehicle.id}/edit`)} />
        <Button title="Interval perawatan" icon="options-outline" variant="secondary" onPress={() => router.push(`/vehicles/${vehicle.id}/rules`)} />
        <Button
          title={vehicle.archivedAt ? 'Aktifkan kembali' : 'Arsipkan'}
          icon="archive-outline"
          variant="secondary"
          loading={archive.isPending}
          onPress={() => archive.mutate(!vehicle.archivedAt)}
        />
        <Button title="Hapus kendaraan" icon="trash-outline" variant="danger" loading={remove.isPending} onPress={() => void onDelete()} />
      </View>
    </View>
  );
}
