import { router } from 'expo-router';
import { Screen } from '@/components/ui';
import { VehicleForm } from '@/features/vehicles/VehicleForm';
import { useCreateVehicle } from '@/lib/hooks';

export default function NewVehicleScreen() {
  const create = useCreateVehicle();
  return (
    <Screen>
      <VehicleForm
        mode="create"
        onSubmit={async (input) => {
          const v = await create.mutateAsync(input);
          router.replace(`/vehicles/${v.id}`);
        }}
      />
    </Screen>
  );
}
