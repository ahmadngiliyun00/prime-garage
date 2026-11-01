import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SERVICE_ACTION_LABELS, formatInterval, getPart, type RuleDto } from '@prime-garage/shared';
import { Body, Button, Card, Chip, ErrorState, Field, Heading, Loading, Muted, Screen, SwitchRow } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { numOrNull, todayString } from '@/lib/form';
import { useResetRule, useRules, useUpdateRule } from '@/lib/hooks';

function RuleEditor({ rule, vehicleId }: { rule: RuleDto; vehicleId: string }) {
  const update = useUpdateRule(vehicleId);
  const reset = useResetRule(vehicleId);
  const [km, setKm] = useState(rule.intervalKm != null ? String(rule.intervalKm) : '');
  const [months, setMonths] = useState(rule.intervalMonths != null ? String(rule.intervalMonths) : '');
  const [error, setError] = useState<string | null>(null);
  const snoozed = rule.snoozedUntil != null && rule.snoozedUntil >= todayString();

  const save = async () => {
    setError(null);
    try {
      await update.mutateAsync({ ruleId: rule.id, input: { intervalKm: numOrNull(km), intervalMonths: numOrNull(months) } });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const snooze = (days: number | null) => {
    const until = days == null ? null : new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
    update.mutate({ ruleId: rule.id, input: { snoozedUntil: until } });
  };

  return (
    <Card className="mb-3">
      <View className="flex-row items-center justify-between">
        <Heading>
          {getPart(rule.partCode)?.name ?? rule.partCode} <Muted>· {SERVICE_ACTION_LABELS[rule.action]}</Muted>
        </Heading>
      </View>
      <Muted className="mb-2">
        Saat ini tiap {formatInterval(rule.intervalKm, rule.intervalMonths)}
        {rule.isCustomized ? ' (diubah)' : ' (default)'}
      </Muted>
      <View className="flex-row gap-3">
        <Field className="flex-1" label="Interval km" value={km} onChangeText={setKm} keyboardType="number-pad" placeholder="kosong = tidak dipakai" />
        <Field className="flex-1" label="Interval bulan" value={months} onChangeText={setMonths} keyboardType="number-pad" placeholder="kosong = tidak dipakai" />
      </View>
      {error ? <Text className="mb-2 text-red-600">{error}</Text> : null}
      <View className="flex-row gap-2">
        <Button title="Simpan" small className="flex-1" onPress={() => void save()} loading={update.isPending} />
        {rule.isCustomized ? <Button title="Kembalikan default" variant="secondary" small className="flex-1" onPress={() => reset.mutate(rule.id)} loading={reset.isPending} /> : null}
      </View>
      <SwitchRow label="Pengingat aktif" value={rule.isEnabled} onChange={(v) => update.mutate({ ruleId: rule.id, input: { isEnabled: v } })} />
      <View className="flex-row flex-wrap items-center">
        <Muted className="mr-2">{snoozed ? `Ditunda sampai ${rule.snoozedUntil}` : 'Tunda pengingat:'}</Muted>
        {snoozed ? (
          <Chip label="Batalkan tunda" active={false} onPress={() => snooze(null)} />
        ) : (
          <>
            <Chip label="7 hari" active={false} onPress={() => snooze(7)} />
            <Chip label="30 hari" active={false} onPress={() => snooze(30)} />
          </>
        )}
      </View>
    </Card>
  );
}

/** FR-MNT-02 (custom intervals) and FR-NTF-05 (snooze). */
export default function RulesScreen() {
  const { id, partCode } = useLocalSearchParams<{ id: string; partCode?: string }>();
  const { data, isLoading, error } = useRules(id);
  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState message={errorMessage(error)} />;
  const rules = partCode ? data.filter((r) => r.partCode === partCode) : data;
  return (
    <Screen>
      <Body className="mb-4">
        Interval default adalah estimasi umum. Sesuaikan dengan buku servis kendaraanmu. Status dihitung dari km atau bulan, mana yang lebih dulu tercapai.
      </Body>
      {rules.map((r) => (
        <RuleEditor key={`${r.id}:${r.intervalKm}:${r.intervalMonths}`} rule={r} vehicleId={id} />
      ))}
    </Screen>
  );
}
