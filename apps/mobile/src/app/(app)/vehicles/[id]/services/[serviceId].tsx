import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import {
  SERVICE_ACTION_LABELS,
  WORKSHOP_CERTIFICATION_LABELS,
  WORKSHOP_TYPE_LABELS,
  formatDateId,
  formatKm,
  formatRupiah,
} from '@prime-garage/shared';
import { Body, Button, Card, ErrorState, Heading, IconButton, InfoRow, Loading, Muted, Screen } from '@/components/ui';
import { ServiceForm } from '@/features/services/ServiceForm';
import { absoluteUrl, errorMessage, http } from '@/lib/api';
import { confirm, notify } from '@/lib/dialogs';
import { useDeleteService, useSaveService, useService } from '@/lib/hooks';
import { queryClient, qk } from '@/lib/query-client';
import { uploadImage } from '@/lib/upload';

export default function ServiceDetailScreen() {
  const { id, serviceId } = useLocalSearchParams<{ id: string; serviceId: string }>();
  const { data, isLoading, error } = useService(serviceId);
  const save = useSaveService(id, serviceId);
  const del = useDeleteService(id);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState message={errorMessage(error)} />;

  if (editing) {
    return (
      <Screen>
        <ServiceForm
          initial={data}
          defaultOdometerKm={data.odometerKm}
          onSubmit={async (input) => {
            await save.mutateAsync(input);
            setEditing(false);
          }}
        />
        <Button title="Batal" variant="ghost" className="mt-2" onPress={() => setEditing(false)} />
      </Screen>
    );
  }

  const addPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    setUploading(true);
    try {
      await uploadImage(res.assets[0], 'service_record', data.id);
      await queryClient.invalidateQueries({ queryKey: qk.service(data.id) });
    } catch (e) {
      notify('Gagal mengunggah foto', errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (attachmentId: string) => {
    if (!(await confirm('Hapus foto nota?', 'Foto akan dihapus permanen.', 'Hapus'))) return;
    await http.delete(`/attachments/${attachmentId}`);
    await queryClient.invalidateQueries({ queryKey: qk.service(data.id) });
  };

  const remove = async () => {
    if (!(await confirm('Hapus catatan servis?', 'Status komponen akan dihitung ulang.', 'Hapus'))) return;
    await del.mutateAsync(data.id);
    router.back();
  };

  return (
    <Screen>
      <Card className="mb-4">
        <Heading>{formatDateId(data.serviceDate)}</Heading>
        <Muted>{formatKm(data.odometerKm)}</Muted>
        <View className="mt-3">
          <InfoRow label="Bengkel" value={data.workshop?.name ?? 'Tidak dicatat'} />
          {data.workshop ? (
            <InfoRow
              label="Jenis"
              value={`${WORKSHOP_TYPE_LABELS[data.workshop.type]} · ${WORKSHOP_CERTIFICATION_LABELS[data.workshop.certification]}`}
            />
          ) : null}
          <InfoRow label="Mekanik" value={data.mechanicName} />
          <InfoRow label="Ongkos jasa" value={data.laborCost != null ? formatRupiah(data.laborCost) : null} />
          <InfoRow label="Total" value={formatRupiah(data.totalCost)} />
        </View>
      </Card>

      <Card className="mb-4">
        <Heading className="mb-2">Pekerjaan</Heading>
        {data.items.map((i) => (
          <View key={i.id} className="border-b border-slate-100 py-2 dark:border-slate-800">
            <View className="flex-row justify-between">
              <Body className="flex-1 font-medium">
                {SERVICE_ACTION_LABELS[i.action]} {i.partName.toLowerCase()}
              </Body>
              {i.subtotal != null ? <Body>{formatRupiah(i.subtotal)}</Body> : null}
            </View>
            {i.productName || i.quantity != null ? (
              <Muted>
                {[i.productName, i.quantity != null ? `${i.quantity} ${i.unit ?? ''}`.trim() : null].filter(Boolean).join(' · ')}
              </Muted>
            ) : null}
          </View>
        ))}
        {data.notes ? <Body className="mt-3">{data.notes}</Body> : null}
      </Card>

      <Card className="mb-4">
        <Heading className="mb-2">Foto nota</Heading>
        <View className="flex-row flex-wrap gap-2">
          {data.attachments.map((a) => {
            const url = absoluteUrl(a.url);
            return (
              <View key={a.id}>
                <Pressable onPress={() => url && void Linking.openURL(url)}>
                  <Image source={{ uri: url ?? undefined }} className="h-24 w-24 rounded-lg" />
                </Pressable>
                <View className="absolute -right-2 -top-2">
                  <IconButton icon="close-circle" label="Hapus foto" color="#b91c1c" onPress={() => void removePhoto(a.id)} />
                </View>
              </View>
            );
          })}
        </View>
        {data.attachments.length === 0 ? <Muted>Belum ada foto.</Muted> : null}
        <Button title="Tambah foto" icon="image-outline" variant="secondary" small className="mt-2" onPress={() => void addPhoto()} loading={uploading} />
      </Card>

      <View className="gap-2">
        <Button title="Ubah" icon="create-outline" onPress={() => setEditing(true)} />
        <Button title="Hapus" icon="trash-outline" variant="danger" onPress={() => void remove()} loading={del.isPending} />
      </View>
    </Screen>
  );
}
