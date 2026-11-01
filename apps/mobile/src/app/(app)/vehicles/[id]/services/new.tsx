import { router, useLocalSearchParams } from 'expo-router';
import { ErrorState, Loading, Screen } from '@/components/ui';
import { ServiceForm } from '@/features/services/ServiceForm';
import { errorMessage } from '@/lib/api';
import { notify } from '@/lib/dialogs';
import { useSaveService, useVehicle } from '@/lib/hooks';
import { uploadImage } from '@/lib/upload';

export default function NewServiceScreen() {
  const { id, partCode } = useLocalSearchParams<{ id: string; partCode?: string }>();
  const vehicle = useVehicle(id);
  const save = useSaveService(id);
  if (vehicle.isLoading) return <Loading />;
  if (!vehicle.data) return <ErrorState message={errorMessage(vehicle.error)} />;
  return (
    <Screen>
      <ServiceForm
        defaultPartCode={partCode}
        defaultOdometerKm={vehicle.data.currentOdometerKm}
        onSubmit={async (input, images) => {
          const record = await save.mutateAsync(input);
          const failed: string[] = [];
          for (const img of images) {
            try {
              await uploadImage(img, 'service_record', record.id);
            } catch (e) {
              failed.push(errorMessage(e));
            }
          }
          if (failed.length) notify('Servis tersimpan', `Namun ${failed.length} foto gagal diunggah: ${failed[0]}`);
          router.back();
        }}
      />
    </Screen>
  );
}
