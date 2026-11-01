import { router } from 'expo-router';
import { Screen } from '@/components/ui';
import { WorkshopForm } from '@/features/workshops/WorkshopForm';
import { useSaveWorkshop } from '@/lib/hooks';

export default function NewWorkshopScreen() {
  const save = useSaveWorkshop();
  return (
    <Screen>
      <WorkshopForm
        onSubmit={async (input) => {
          await save.mutateAsync(input);
          router.back();
        }}
      />
    </Screen>
  );
}
