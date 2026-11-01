import { router, useLocalSearchParams } from 'expo-router';
import { ErrorState, Loading, Screen } from '@/components/ui';
import { VehicleForm } from '@/features/vehicles/VehicleForm';
import { errorMessage } from '@/lib/api';
import { useUpdateVehicle, useVehicle } from '@/lib/hooks';

export default function EditVehicleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error } = useVehicle(id);
  const update = useUpdateVehicle(id);
  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState message={errorMessage(error)} />;
  return (
    <Screen>
      <VehicleForm
        mode="edit"
        vehicle={data}
        onSubmit={async (input) => {
          await update.mutateAsync(input);
          router.back();
        }}
      />
    </Screen>
  );
}
