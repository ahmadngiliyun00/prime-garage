import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { formatKm } from '@prime-garage/shared';
import { Body, Button, Card, ErrorState, Field, Heading, IconButton, Loading, Muted, Screen } from '@/components/ui';
import { ApiError, errorMessage } from '@/lib/api';
import { confirm } from '@/lib/dialogs';
import { numOrNull } from '@/lib/form';
import { useAddOdometer, useDeleteOdometer, useOdometer, useVehicle } from '@/lib/hooks';
import { queryClient, qk } from '@/lib/query-client';

const SOURCE_LABEL = { initial: 'Awal', manual: 'Manual', service: 'Servis' } as const;

/** FR-VEH-06, FR-VEH-07 */
export default function OdometerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicle = useVehicle(id);
  const logs = useOdometer(id);
  const add = useAddOdometer(id);
  const del = useDeleteOdometer(id);
  const [km, setKm] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = async (confirmDecrease = false) => {
    setError(null);
    const value = numOrNull(km);
    if (value == null || Number.isNaN(value) || value < 0) {
      setError('Masukkan angka odometer yang valid');
      return;
    }
    try {
      await add.mutateAsync({ km: Math.round(value), note: note || null, confirmDecrease });
      await queryClient.invalidateQueries({ queryKey: qk.odometer(id) });
      setKm('');
      setNote('');
    } catch (e) {
      if (e instanceof ApiError && e.body.code === 'ODOMETER_DECREASE') {
        if (await confirm('Odometer lebih kecil', e.message, 'Simpan tetap')) await save(true);
        return;
      }
      setError(errorMessage(e));
    }
  };

  if (vehicle.isLoading) return <Loading />;
  if (!vehicle.data) return <ErrorState message={errorMessage(vehicle.error)} />;

  return (
    <Screen>
      <Card className="mb-4">
        <Muted>Odometer saat ini</Muted>
        <Heading className="text-3xl">{formatKm(vehicle.data.currentOdometerKm)}</Heading>
        <Muted>Dicatat {new Date(vehicle.data.currentOdometerAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</Muted>
      </Card>
      <Card className="mb-4">
        <Heading className="mb-3">Catat odometer</Heading>
        <Field label="Odometer (km)" value={km} onChangeText={setKm} keyboardType="number-pad" placeholder="Contoh: 16450" testID="odometer-input" />
        <Field label="Catatan (opsional)" value={note} onChangeText={setNote} />
        {error ? <Text className="mb-2 text-red-600">{error}</Text> : null}
        <Button title="Simpan" onPress={() => void save()} loading={add.isPending} testID="odometer-save" />
        <Muted className="mt-2">Perbarui minimal setiap 2 minggu agar perkiraan jadwal servis akurat.</Muted>
      </Card>
      <Heading className="mb-2">Riwayat</Heading>
      {logs.isLoading ? (
        <Loading />
      ) : (
        (logs.data ?? []).map((l) => (
          <View key={l.id} className="flex-row items-center justify-between border-b border-slate-200 py-2 dark:border-slate-800">
            <View>
              <Body>{formatKm(l.km)}</Body>
              <Muted>
                {new Date(l.recordedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })} · {SOURCE_LABEL[l.source]}
                {l.note ? ` · ${l.note}` : ''}
              </Muted>
            </View>
            {l.source === 'manual' ? (
              <IconButton
                icon="trash-outline"
                label="Hapus"
                color="#b91c1c"
                onPress={() => {
                  void confirm('Hapus catatan odometer?', formatKm(l.km), 'Hapus').then(async (ok) => {
                    if (!ok) return;
                    await del.mutateAsync(l.id);
                    await queryClient.invalidateQueries({ queryKey: qk.odometer(id) });
                  });
                }}
              />
            ) : null}
          </View>
        ))
      )}
    </Screen>
  );
}
