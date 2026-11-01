import { router, useLocalSearchParams } from 'expo-router';
import { Button, ErrorState, Loading, Screen } from '@/components/ui';
import { WorkshopForm } from '@/features/workshops/WorkshopForm';
import { errorMessage } from '@/lib/api';
import { confirm } from '@/lib/dialogs';
import { useDeleteWorkshop, useSaveWorkshop, useWorkshop } from '@/lib/hooks';

export default function WorkshopDetailScreen() {
  const { workshopId } = useLocalSearchParams<{ workshopId: string }>();
  const { data, isLoading, error } = useWorkshop(workshopId);
  const save = useSaveWorkshop(workshopId);
  const del = useDeleteWorkshop();
  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState message={errorMessage(error)} />;
  return (
    <Screen>
      <WorkshopForm
        initial={data}
        onSubmit={async (input) => {
          await save.mutateAsync(input);
          router.back();
        }}
      />
      <Button
        title="Hapus bengkel"
        variant="danger"
        icon="trash-outline"
        className="mt-3"
        loading={del.isPending}
        onPress={() =>
          void confirm('Hapus bengkel?', `Catatan servis di ${data.name} tetap tersimpan tanpa nama bengkel.`, 'Hapus').then(async (ok) => {
            if (!ok) return;
            await del.mutateAsync(workshopId);
            router.back();
          })
        }
      />
    </Screen>
  );
}
