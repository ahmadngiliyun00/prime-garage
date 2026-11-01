import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Component, useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, useColorScheme, useWindowDimensions } from 'react-native';
import {
  COMPONENT_STATUS_COLORS,
  FALLBACK_MODEL_KEY,
  MODEL_3D_ASSETS,
  PART_VIEWS_BY_MODEL,
  SERVICE_ACTION_LABELS,
  formatDateId,
  formatInterval,
  formatKm,
  worstStatusByPart,
  type ComponentStatusDto,
  type PartDto,
  type VehicleDto,
} from '@prime-garage/shared';
import { Body, Button, Chip, Heading, Muted, ProgressBar, StatusBadge } from '@/components/ui';
import { useCompleteTour, useModel3d, useParts, useServices } from '@/lib/hooks';
import { Viewer3D } from './Viewer3D';

class CanvasBoundary extends Component<{ onError: (e: Error) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type Tab = 'function' | 'symptoms' | 'tips' | 'history';

/**
 * 3D explorer for one vehicle: viewer, part info panel, education tour, status mode,
 * and the text part list fallback (FR-3D-01..06, FR-EDU-01..02).
 */
export function VehicleExplorer({ vehicle, components }: { vehicle: VehicleDto; components: ComponentStatusDto[] }) {
  const dark = useColorScheme() === 'dark';
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { data: parts = [] } = useParts();
  // A vehicle-specific model falls back to the procedural template if it cannot load on this device.
  const [modelKey, setModelKey] = useState(MODEL_3D_ASSETS.some((m) => m.key === vehicle.model3dKey) ? vehicle.model3dKey : FALLBACK_MODEL_KEY);
  const { data: model3d } = useModel3d(modelKey);
  const asset = MODEL_3D_ASSETS.find((m) => m.key === modelKey);
  const completeTour = useCompleteTour(vehicle.id);

  const [selected, setSelected] = useState<string | null>(null);
  const [statusMode, setStatusMode] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(vehicle.eduTourCompletedAt ? null : 0);

  const views = useMemo(
    () =>
      (model3d?.key === modelKey ? model3d.partViews : undefined) ?? PART_VIEWS_BY_MODEL[modelKey] ?? PART_VIEWS_BY_MODEL[FALLBACK_MODEL_KEY] ?? [],
    [model3d, modelKey],
  );
  const defaultCamera = useMemo(
    () => asset?.defaultCamera ?? { position: [2.1, 1.25, 2.3] as const, target: [0, 0.5, 0] as const },
    [asset],
  ) as { position: [number, number, number]; target: [number, number, number] };

  const availableParts = useMemo(() => {
    const codes = new Set(views.map((v) => v.partCode));
    return parts.filter((p) => codes.has(p.code) && p.appliesTo.includes(vehicle.category as never)).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [parts, views, vehicle.category]);
  const tourParts = useMemo(
    () => availableParts.filter((p) => p.tourOrder != null).sort((a, b) => (a.tourOrder ?? 0) - (b.tourOrder ?? 0)),
    [availableParts],
  );

  const worst = useMemo(() => worstStatusByPart(components), [components]);
  const partColors = useMemo(() => {
    if (!statusMode) return {};
    const colors: Record<string, string> = {};
    for (const [code, s] of Object.entries(worst)) if (s.status !== 'NO_DATA') colors[code] = COMPONENT_STATUS_COLORS[s.status];
    return colors;
  }, [statusMode, worst]);

  const tourPart = tourStep != null ? tourParts[tourStep] : undefined;
  const activePart = tourPart?.code ?? selected;
  const focusView = views.find((v) => v.partCode === activePart) ?? null;
  const onError = useCallback(
    (e: Error) => {
      if (modelKey !== FALLBACK_MODEL_KEY) setModelKey(FALLBACK_MODEL_KEY);
      else setViewerError(e.message);
    },
    [modelKey],
  );
  const select = useCallback((code: string | null) => {
    setTourStep(null);
    setSelected(code);
  }, []);

  const finishTour = () => {
    setTourStep(null);
    setSelected(null);
    if (!vehicle.eduTourCompletedAt) completeTour.mutate();
  };

  const viewer = viewerError ? (
    <View className="flex-1 items-center justify-center p-6">
      <Ionicons name="cube-outline" size={36} color="#a3a3a3" />
      <Body className="mt-2 text-center">Tampilan 3D tidak tersedia di perangkat ini.</Body>
      <Muted className="text-center">{viewerError}. Gunakan daftar bagian di bawah.</Muted>
    </View>
  ) : (
    <CanvasBoundary key={modelKey} onError={onError}>
      <Viewer3D
        key={modelKey}
        modelKey={modelKey}
        selectedPart={activePart}
        onSelectPart={select}
        partColors={partColors}
        focusView={focusView}
        defaultCamera={defaultCamera}
        onError={onError}
        dark={dark}
      />
    </CanvasBoundary>
  );

  const selectedDef = availableParts.find((p) => p.code === selected);

  return (
    <View className={wide ? 'flex-row gap-4' : ''}>
      <View className={wide ? 'flex-1' : ''}>
        <View
          className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-900"
          style={{ height: wide ? 520 : 360 }}
        >
          {viewer}
          {tourPart ? (
            <TourCard
              part={tourPart}
              step={tourStep ?? 0}
              total={tourParts.length}
              onBack={() => setTourStep((s) => Math.max(0, (s ?? 0) - 1))}
              onNext={() => ((tourStep ?? 0) + 1 >= tourParts.length ? finishTour() : setTourStep((s) => (s ?? 0) + 1))}
              onSkip={finishTour}
            />
          ) : (
            <View className="absolute left-2 top-2 flex-row">
              <Chip label={statusMode ? 'Mode kondisi: aktif' : 'Mode kondisi'} active={statusMode} onPress={() => setStatusMode((v) => !v)} />
            </View>
          )}
          {!tourPart && !viewerError ? (
            <View className="absolute bottom-2 left-2 right-2 flex-row items-center justify-between" pointerEvents="box-none">
              <Muted className="rounded-lg bg-white/80 px-2 py-1 dark:bg-slate-900/80">
                Sentuh bagian motor atau titik biru. Geser untuk memutar.
              </Muted>
            </View>
          ) : null}
        </View>

        {statusMode ? <StatusLegend /> : null}
        {asset?.attribution && !viewerError ? <Muted className="mt-1 text-xs">{asset.attribution}</Muted> : null}

        <View className="mt-3 flex-row flex-wrap gap-2">
          <Button
            title={showList || viewerError ? 'Sembunyikan daftar' : 'Daftar bagian'}
            icon="list-outline"
            variant="secondary"
            small
            onPress={() => setShowList((v) => !v)}
          />
          {tourParts.length > 0 && tourStep == null ? (
            <Button title="Ulangi tur edukasi" icon="school-outline" variant="secondary" small onPress={() => { setSelected(null); setTourStep(0); }} />
          ) : null}
        </View>

        {showList || viewerError ? (
          <PartList parts={availableParts} worst={worst} selected={selected} onSelect={(c) => select(c)} />
        ) : null}
      </View>

      <View className={wide ? 'w-[380px]' : 'mt-4'}>
        {selectedDef ? (
          <PartPanel
            part={selectedDef}
            vehicleId={vehicle.id}
            statuses={components.filter((c) => c.partCode === selectedDef.code)}
            onClose={() => setSelected(null)}
          />
        ) : !tourPart ? (
          <View className="rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
            <Heading>Kenali motormu</Heading>
            <Muted className="mt-1">
              Sentuh bagian pada model 3D atau pilih dari daftar bagian untuk melihat fungsi, gejala kerusakan, tips perawatan, kondisi, dan riwayat servisnya.
            </Muted>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function StatusLegend() {
  return (
    <View className="mt-2 flex-row flex-wrap gap-3">
      {(['GOOD', 'SOON', 'DUE'] as const).map((s) => (
        <View key={s} className="flex-row items-center gap-1">
          <View className="h-3 w-3 rounded-full" style={{ backgroundColor: COMPONENT_STATUS_COLORS[s] }} />
          <Muted>{s === 'GOOD' ? 'Baik' : s === 'SOON' ? 'Segera' : 'Jatuh tempo'}</Muted>
        </View>
      ))}
      <Muted>Tanpa warna: belum ada data</Muted>
    </View>
  );
}

function TourCard({
  part,
  step,
  total,
  onBack,
  onNext,
  onSkip,
}: {
  part: PartDto;
  step: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <View className="absolute bottom-2 left-2 right-2 rounded-2xl bg-white/95 p-4 shadow-lg dark:bg-slate-900/95" testID="tour-card">
      <View className="flex-row items-center justify-between">
        <Muted>
          Tur edukasi {step + 1} dari {total}
        </Muted>
        <Pressable onPress={onSkip} hitSlop={8}>
          <Text className="text-sm font-semibold text-slate-500">Lewati tur</Text>
        </Pressable>
      </View>
      <Heading className="mt-1">{part.name}</Heading>
      <Body className="mt-1">{part.summary}</Body>
      <Muted className="mt-1" numberOfLines={3}>
        {part.functionText}
      </Muted>
      <View className="mt-3 flex-row gap-2">
        <Button title="Kembali" variant="secondary" small onPress={onBack} disabled={step === 0} className="flex-1" />
        <Button title={step + 1 >= total ? 'Selesai' : 'Lanjut'} small onPress={onNext} className="flex-1" testID="tour-next" />
      </View>
    </View>
  );
}

function PartList({
  parts,
  worst,
  selected,
  onSelect,
}: {
  parts: PartDto[];
  worst: Record<string, ComponentStatusDto>;
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  return (
    <View className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" testID="part-list">
      {parts.map((p) => {
        const s = worst[p.code];
        return (
          <Pressable
            key={p.code}
            onPress={() => onSelect(p.code)}
            className={`flex-row items-center justify-between border-b border-slate-100 px-4 py-3 active:bg-slate-50 dark:border-slate-800 ${selected === p.code ? 'bg-brand-50 dark:bg-slate-800' : ''}`}
          >
            <View className="flex-1 pr-2">
              <Body>{p.name}</Body>
              <Muted numberOfLines={1}>{p.summary}</Muted>
            </View>
            {s ? <StatusBadge status={s.status} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function PartPanel({
  part,
  vehicleId,
  statuses,
  onClose,
}: {
  part: PartDto;
  vehicleId: string;
  statuses: ComponentStatusDto[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('function');
  const history = useServices(vehicleId, tab === 'history' ? part.code : undefined);
  const tabs: { value: Tab; label: string }[] = [
    { value: 'function', label: 'Fungsi' },
    { value: 'symptoms', label: 'Gejala' },
    { value: 'tips', label: 'Tips' },
    { value: 'history', label: 'Riwayat' },
  ];
  const text = tab === 'function' ? part.functionText : tab === 'symptoms' ? part.symptomsText : part.careTipsText;

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" testID="part-panel">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Heading>{part.name}</Heading>
          <Muted>{part.summary}</Muted>
        </View>
        <Pressable accessibilityLabel="Tutup" onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={22} color="#737373" />
        </Pressable>
      </View>

      {statuses.length > 0 ? (
        <View className="mt-3 gap-3">
          {statuses.map((s) => (
            <View key={s.ruleId}>
              <View className="flex-row items-center justify-between">
                <Body className="font-medium">
                  {SERVICE_ACTION_LABELS[s.action]} <Muted>(tiap {formatInterval(s.intervalKm, s.intervalMonths)})</Muted>
                </Body>
                <StatusBadge status={s.status} />
              </View>
              {s.remainingPercent != null ? (
                <View className="mt-1">
                  <ProgressBar percent={s.remainingPercent} color={COMPONENT_STATUS_COLORS[s.status]} />
                  <Muted className="mt-1">
                    Sisa {s.remainingPercent}% · perkiraan jatuh tempo {s.dueDate ? formatDateId(s.dueDate) : '-'}
                    {s.dueKm != null ? ` atau ${formatKm(s.dueKm)}` : ''}
                  </Muted>
                </View>
              ) : (
                <Muted className="mt-1">Belum ada catatan servis untuk bagian ini.</Muted>
              )}
            </View>
          ))}
        </View>
      ) : (
        <Muted className="mt-3">Bagian ini tidak punya jadwal perawatan berkala.</Muted>
      )}

      <View className="mt-4 flex-row rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {tabs.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setTab(t.value)}
            className={`flex-1 items-center rounded-lg py-1.5 ${tab === t.value ? 'bg-white dark:bg-slate-950' : ''}`}
          >
            <Text className={`text-sm ${tab === t.value ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-500'}`}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView className="mt-3 max-h-64">
        {tab === 'history' ? (
          history.isLoading ? (
            <Muted>Memuat riwayat...</Muted>
          ) : (history.data ?? []).length === 0 ? (
            <Muted>Belum ada servis untuk bagian ini.</Muted>
          ) : (
            (history.data ?? []).map((s) => (
              <Pressable key={s.id} onPress={() => router.push(`/vehicles/${vehicleId}/services/${s.id}`)} className="border-b border-slate-100 py-2 dark:border-slate-800">
                <Body>
                  {formatDateId(s.serviceDate)} · {formatKm(s.odometerKm)}
                </Body>
                <Muted>
                  {s.items
                    .filter((i) => i.partCode === part.code)
                    .map((i) => `${SERVICE_ACTION_LABELS[i.action]}${i.productName ? ` (${i.productName})` : ''}`)
                    .join(', ')}
                  {s.workshop ? ` · ${s.workshop.name}` : ''}
                </Muted>
              </Pressable>
            ))
          )
        ) : (
          <Body>{text}</Body>
        )}
      </ScrollView>

      <View className="mt-4 gap-2">
        <Button
          title="Catat servis bagian ini"
          icon="construct-outline"
          onPress={() => router.push(`/vehicles/${vehicleId}/services/new?partCode=${part.code}`)}
        />
        {statuses.length > 0 ? (
          <Button
            title="Ubah interval"
            icon="options-outline"
            variant="secondary"
            onPress={() => router.push(`/vehicles/${vehicleId}/rules?partCode=${part.code}`)}
          />
        ) : null}
      </View>
    </View>
  );
}
