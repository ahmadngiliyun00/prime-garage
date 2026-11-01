import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import {
  SERVICE_ACTIONS,
  SERVICE_ACTION_LABELS,
  formatRupiah,
  itemSubtotal,
  serviceRecordSchema,
  type ServiceAction,
  type ServiceRecordDto,
  type ServiceRecordInput,
} from '@prime-garage/shared';
import { Body, Button, Card, Chip, Field, Heading, IconButton, Muted, Select } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { apiFieldErrors, numOrNull, todayString, validate, type FieldErrors } from '@/lib/form';
import { useParts, useWorkshops } from '@/lib/hooks';
import type { PickedImage } from '@/lib/upload';

type ItemState = {
  key: string;
  partCode: string;
  customPartName: string;
  action: ServiceAction;
  productName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  subtotal: string;
};

let seq = 0;
const newItem = (partCode = '', action: ServiceAction = 'replace'): ItemState => ({
  key: `i${++seq}`,
  partCode,
  customPartName: '',
  action,
  productName: '',
  quantity: '',
  unit: '',
  unitPrice: '',
  subtotal: '',
});

/** FR-SVC-07: quick templates for common services. */
const TEMPLATES: { label: string; items: [string, ServiceAction][] }[] = [
  { label: 'Ganti oli', items: [['engine_oil', 'replace']] },
  {
    label: 'Servis rutin',
    items: [
      ['engine_oil', 'replace'],
      ['spark_plug', 'inspect'],
      ['air_filter', 'inspect'],
      ['drive_chain', 'adjust'],
      ['drive_chain', 'lubricate'],
      ['brake_pad_front', 'inspect'],
      ['brake_shoe_rear', 'inspect'],
      ['brake_fluid', 'inspect'],
      ['throttle_body', 'clean'],
    ],
  },
  { label: 'Ganti busi', items: [['spark_plug', 'replace']] },
  { label: 'Ganti kampas rem', items: [['brake_pad_front', 'replace'], ['brake_shoe_rear', 'replace']] },
];

function toItemState(dto: ServiceRecordDto['items'][number]): ItemState {
  const s = (n: number | null) => (n == null ? '' : String(n));
  return {
    key: `i${++seq}`,
    partCode: dto.partCode ?? '',
    customPartName: dto.customPartName ?? '',
    action: dto.action,
    productName: dto.productName ?? '',
    quantity: s(dto.quantity),
    unit: dto.unit ?? '',
    unitPrice: s(dto.unitPrice),
    subtotal: s(dto.subtotal),
  };
}

export function ServiceForm({
  initial,
  defaultPartCode,
  defaultOdometerKm,
  onSubmit,
}: {
  initial?: ServiceRecordDto;
  defaultPartCode?: string;
  defaultOdometerKm: number;
  onSubmit: (input: ServiceRecordInput, images: PickedImage[]) => Promise<void>;
}) {
  const { data: parts = [] } = useParts();
  const { data: workshops = [] } = useWorkshops();
  const [serviceDate, setServiceDate] = useState(initial?.serviceDate ?? todayString());
  const [odometer, setOdometer] = useState(String(initial?.odometerKm ?? defaultOdometerKm));
  const [workshopId, setWorkshopId] = useState<string>(initial?.workshop?.id ?? '');
  const [mechanicName, setMechanicName] = useState(initial?.mechanicName ?? '');
  const [laborCost, setLaborCost] = useState(initial?.laborCost != null ? String(initial.laborCost) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [items, setItems] = useState<ItemState[]>(
    initial ? initial.items.map(toItemState) : [newItem(defaultPartCode ?? 'engine_oil', 'replace')],
  );
  const [images, setImages] = useState<PickedImage[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const partOptions = useMemo(
    () => [...parts.map((p) => ({ value: p.code, label: p.name })), { value: '__custom', label: 'Lainnya (tulis sendiri)' }],
    [parts],
  );

  const patch = (key: string, p: Partial<ItemState>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  const payloadItems = items.map((i) => ({
    partCode: i.partCode && i.partCode !== '__custom' ? i.partCode : null,
    customPartName: i.partCode === '__custom' || !i.partCode ? i.customPartName : null,
    action: i.action,
    productName: i.productName,
    quantity: numOrNull(i.quantity),
    unit: i.unit,
    unitPrice: numOrNull(i.unitPrice),
    subtotal: numOrNull(i.subtotal),
    notes: null,
  }));
  const total =
    payloadItems.reduce((sum, i) => sum + (Number.isNaN(itemSubtotal(i as never)) ? 0 : itemSubtotal(i as never)), 0) +
    (numOrNull(laborCost) ?? 0);

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    const existing = items.filter((i) => i.partCode || i.customPartName);
    setItems([...existing, ...t.items.filter(([p, a]) => !existing.some((e) => e.partCode === p && e.action === a)).map(([p, a]) => newItem(p, a))]);
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: 5 });
    if (!res.canceled) setImages((list) => [...list, ...res.assets].slice(0, 5));
  };

  const submit = async () => {
    setFormError(null);
    const r = validate(serviceRecordSchema, {
      serviceDate: serviceDate.trim(),
      odometerKm: numOrNull(odometer) ?? undefined,
      workshopId: workshopId || null,
      mechanicName,
      laborCost: numOrNull(laborCost),
      notes,
      items: payloadItems,
    });
    if (r.errors) {
      setErrors(r.errors);
      setFormError('Periksa kembali isian yang ditandai.');
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await onSubmit(r.data, images);
    } catch (e) {
      setErrors(apiFieldErrors(e));
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Card className="mb-4">
        <Heading className="mb-3">Servis</Heading>
        <View className="flex-row gap-3">
          <Field className="flex-1" label="Tanggal" value={serviceDate} onChangeText={setServiceDate} placeholder="YYYY-MM-DD" error={errors['serviceDate']} testID="service-date" />
          <Field className="flex-1" label="Odometer (km)" value={odometer} onChangeText={setOdometer} keyboardType="number-pad" error={errors['odometerKm']} testID="service-odometer" />
        </View>
        <Select
          label="Bengkel"
          value={workshopId}
          searchable
          options={[{ value: '', label: 'Tidak dicatat' }, ...workshops.map((w) => ({ value: w.id, label: w.name, description: w.city ?? undefined }))]}
          onChange={setWorkshopId}
          error={errors['workshopId']}
        />
        <Pressable onPress={() => router.push('/workshops/new')} className="-mt-1 mb-3">
          <Text className="text-sm font-semibold text-brand-600">+ Tambah bengkel baru</Text>
        </Pressable>
        <Field label="Nama mekanik (opsional)" value={mechanicName} onChangeText={setMechanicName} />
      </Card>

      <Card className="mb-4">
        <Heading>Pekerjaan</Heading>
        <Muted className="mb-2">Apa saja yang dikerjakan: ganti, tambah, periksa, setel, bersihkan, lumasi, atau perbaiki.</Muted>
        <View className="mb-2 flex-row flex-wrap gap-y-2">
          {TEMPLATES.map((t) => (
            <Chip key={t.label} label={`+ ${t.label}`} active={false} onPress={() => applyTemplate(t)} />
          ))}
        </View>
        {errors['items'] ? <Text className="mb-2 text-red-600">{errors['items']}</Text> : null}
        {items.map((item, index) => (
          <View key={item.key} className="mb-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700" testID={`service-item-${index}`}>
            <View className="mb-1 flex-row items-center justify-between">
              <Body className="font-semibold">Pekerjaan {index + 1}</Body>
              {items.length > 1 ? (
                <IconButton icon="trash-outline" label="Hapus pekerjaan" color="#b91c1c" onPress={() => setItems((l) => l.filter((i) => i.key !== item.key))} />
              ) : null}
            </View>
            <Select
              label="Bagian"
              value={item.partCode || (item.customPartName ? '__custom' : '')}
              options={partOptions}
              searchable
              onChange={(v) => patch(item.key, { partCode: v })}
              error={errors[`items.${index}.partCode`]}
            />
            {item.partCode === '__custom' ? (
              <Field label="Nama bagian" value={item.customPartName} onChangeText={(t) => patch(item.key, { customPartName: t })} placeholder="Contoh: Cuci motor" />
            ) : null}
            <Select
              label="Tindakan"
              value={item.action}
              options={SERVICE_ACTIONS.map((a) => ({ value: a, label: SERVICE_ACTION_LABELS[a] }))}
              onChange={(v) => patch(item.key, { action: v })}
            />
            <Field label="Produk/merek (opsional)" value={item.productName} onChangeText={(t) => patch(item.key, { productName: t })} placeholder="Contoh: Oli 10W-30 0,8 L" />
            <View className="flex-row gap-2">
              <Field className="flex-1" label="Jumlah" value={item.quantity} onChangeText={(t) => patch(item.key, { quantity: t })} keyboardType="decimal-pad" />
              <Field className="flex-1" label="Satuan" value={item.unit} onChangeText={(t) => patch(item.key, { unit: t })} placeholder="L / pcs" />
              <Field className="flex-1" label="Harga satuan" value={item.unitPrice} onChangeText={(t) => patch(item.key, { unitPrice: t })} keyboardType="number-pad" />
            </View>
            <Field
              label="Subtotal (opsional)"
              value={item.subtotal}
              onChangeText={(t) => patch(item.key, { subtotal: t })}
              keyboardType="number-pad"
              hint="Kosongkan untuk dihitung dari jumlah x harga satuan."
            />
          </View>
        ))}
        <Button title="Tambah pekerjaan" icon="add" variant="secondary" small onPress={() => setItems((l) => [...l, newItem('', 'replace')])} />
      </Card>

      <Card className="mb-4">
        <Heading className="mb-3">Biaya dan catatan</Heading>
        <Field label="Ongkos jasa (Rp)" value={laborCost} onChangeText={setLaborCost} keyboardType="number-pad" error={errors['laborCost']} />
        <Field label="Catatan" value={notes} onChangeText={setNotes} multiline numberOfLines={3} placeholder="Keluhan, saran mekanik, dll." />
        <View className="flex-row items-center justify-between">
          <Muted>Total</Muted>
          <Heading>{formatRupiah(total)}</Heading>
        </View>
      </Card>

      {!initial ? (
        <Card className="mb-4">
          <Heading className="mb-2">Foto nota (opsional)</Heading>
          <View className="flex-row flex-wrap gap-2">
            {images.map((img, i) => (
              <View key={img.uri}>
                <Image source={{ uri: img.uri }} className="h-20 w-20 rounded-lg" />
                <Pressable className="absolute -right-2 -top-2 rounded-full bg-white" onPress={() => setImages((l) => l.filter((_, j) => j !== i))}>
                  <Ionicons name="close-circle" size={22} color="#b91c1c" />
                </Pressable>
              </View>
            ))}
          </View>
          <Button title="Pilih foto" icon="image-outline" variant="secondary" small className="mt-2" onPress={() => void pickImage()} />
        </Card>
      ) : null}

      {formError ? <Text className="mb-3 text-center text-red-600">{formError}</Text> : null}
      <Button title={initial ? 'Simpan perubahan' : 'Simpan servis'} onPress={() => void submit()} loading={busy} testID="service-submit" />
    </View>
  );
}
