import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import {
  VEHICLE_CATEGORIES,
  VEHICLE_CATEGORY_LABELS,
  createVehicleSchema,
  updateVehicleSchema,
  type CreateVehicleInput,
  type UpdateVehicleInput,
  type VehicleCategory,
  type VehicleDto,
} from '@prime-garage/shared';
import { Button, Card, Chip, Field, Heading, Muted, Select } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { apiFieldErrors, numOrNull, validate, type FieldErrors } from '@/lib/form';
import { useBrands, useModels } from '@/lib/hooks';

type Props =
  | { mode: 'create'; onSubmit: (input: CreateVehicleInput) => Promise<void>; vehicle?: undefined }
  | { mode: 'edit'; vehicle: VehicleDto; onSubmit: (input: UpdateVehicleInput) => Promise<void> };

/** FR-VEH-02..04: create from catalog or manually; edit vehicle data. */
export function VehicleForm(props: Props) {
  const v = props.vehicle;
  const { data: brands = [] } = useBrands();
  const { data: models = [] } = useModels();
  const [manual, setManual] = useState(props.mode === 'edit' ? v?.vehicleModelId == null : false);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [modelId, setModelId] = useState<number | null>(null);
  const [customBrand, setCustomBrand] = useState(v?.vehicleModelId == null ? (v?.brandName ?? '') : '');
  const [customModel, setCustomModel] = useState(v?.vehicleModelId == null ? (v?.modelName ?? '') : '');
  const [category, setCategory] = useState<VehicleCategory>((v?.category as VehicleCategory) ?? 'underbone');
  const [nickname, setNickname] = useState(v?.nickname ?? '');
  const [plateNumber, setPlateNumber] = useState(v?.plateNumber ?? '');
  const [year, setYear] = useState(v?.year ? String(v.year) : '');
  const [color, setColor] = useState(v?.color ?? '');
  const [engineCc, setEngineCc] = useState(v?.engineCc ? String(v.engineCc) : '');
  const [frameNumber, setFrameNumber] = useState(v?.frameNumber ?? '');
  const [engineNumber, setEngineNumber] = useState(v?.engineNumber ?? '');
  const [purchaseDate, setPurchaseDate] = useState(v?.purchaseDate ?? '');
  const [odometer, setOdometer] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const brandModels = useMemo(() => models.filter((m) => m.brandId === brandId), [models, brandId]);
  const selectedModel = models.find((m) => m.id === modelId);

  const submit = async () => {
    setFormError(null);
    const common = {
      nickname: nickname.trim() || (selectedModel ? selectedModel.name : customModel.trim()),
      plateNumber,
      year: numOrNull(year),
      color,
      engineCc: numOrNull(engineCc),
      frameNumber,
      engineNumber,
      purchaseDate: purchaseDate.trim() || null,
    };
    setBusy(true);
    try {
      if (props.mode === 'create') {
        const r = validate(createVehicleSchema, {
          ...common,
          vehicleModelId: manual ? null : modelId,
          kind: 'motorcycle',
          category: manual ? category : undefined,
          customBrand: manual ? customBrand : null,
          customModel: manual ? customModel : null,
          initialOdometerKm: numOrNull(odometer) ?? undefined,
        });
        if (r.errors) {
          setErrors(r.errors);
          return;
        }
        setErrors({});
        await props.onSubmit(r.data);
      } else {
        const r = validate(updateVehicleSchema, {
          ...common,
          ...(manual ? { customBrand, customModel, category } : {}),
        });
        if (r.errors) {
          setErrors(r.errors);
          return;
        }
        setErrors({});
        await props.onSubmit(r.data);
      }
    } catch (e) {
      setErrors(apiFieldErrors(e));
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      {props.mode === 'create' ? (
        <Card className="mb-4">
          <Heading className="mb-3">Jenis kendaraan</Heading>
          <View className="mb-3 flex-row">
            <Chip label="Dari katalog" active={!manual} onPress={() => setManual(false)} />
            <Chip label="Isi manual" active={manual} onPress={() => setManual(true)} />
          </View>
          {!manual ? (
            <>
              <Select
                label="Merek"
                value={brandId}
                options={brands.map((b) => ({ value: b.id, label: b.name }))}
                onChange={(id) => {
                  setBrandId(id);
                  setModelId(null);
                }}
              />
              <Select
                label="Model"
                value={modelId}
                searchable
                placeholder={brandId ? 'Pilih model' : 'Pilih merek dulu'}
                error={errors['vehicleModelId']}
                options={brandModels.map((m) => ({
                  value: m.id,
                  label: m.name,
                  description: `${VEHICLE_CATEGORY_LABELS[m.category]} · ${m.engineCc ?? '-'} cc${m.yearStart ? ` · ${m.yearStart}${m.yearEnd ? `-${m.yearEnd}` : '-sekarang'}` : ''}`,
                }))}
                onChange={(id) => {
                  setModelId(id);
                  const m = models.find((x) => x.id === id);
                  if (m && !nickname) setNickname(m.name);
                }}
              />
              <Muted>Model tidak ada? Pilih Isi manual.</Muted>
            </>
          ) : null}
        </Card>
      ) : null}

      {manual ? (
        <Card className="mb-4">
          <Heading className="mb-3">Data model</Heading>
          <Field label="Merek" value={customBrand} onChangeText={setCustomBrand} placeholder="Contoh: Honda" error={errors['customBrand']} />
          <Field label="Model" value={customModel} onChangeText={setCustomModel} placeholder="Contoh: Supra X 125" error={errors['customModel'] ?? errors['vehicleModelId']} />
          <Select
            label="Kategori"
            value={category}
            options={VEHICLE_CATEGORIES.filter((c) => !c.startsWith('car_')).map((c) => ({ value: c, label: VEHICLE_CATEGORY_LABELS[c] }))}
            onChange={setCategory}
            error={errors['category']}
          />
          <Muted>Kategori menentukan model 3D dan jadwal perawatan default.</Muted>
        </Card>
      ) : null}

      <Card className="mb-4">
        <Heading className="mb-3">Data kendaraan</Heading>
        <Field label="Nama panggilan" value={nickname} onChangeText={setNickname} placeholder="Contoh: Supra Hitam" error={errors['nickname']} testID="vehicle-nickname" />
        <Field label="Plat nomor" value={plateNumber} onChangeText={setPlateNumber} autoCapitalize="characters" placeholder="AB 1234 CD" error={errors['plateNumber']} />
        <View className="flex-row gap-3">
          <Field className="flex-1" label="Tahun" value={year} onChangeText={setYear} keyboardType="number-pad" error={errors['year']} />
          <Field className="flex-1" label="Warna" value={color} onChangeText={setColor} error={errors['color']} />
        </View>
        {props.mode === 'create' ? (
          <Field
            label="Odometer saat ini (km)"
            value={odometer}
            onChangeText={setOdometer}
            keyboardType="number-pad"
            placeholder="Contoh: 16200"
            error={errors['initialOdometerKm']}
            hint="Angka di speedometer saat ini."
            testID="vehicle-odometer"
          />
        ) : null}
        <Field label="Tanggal beli (opsional)" value={purchaseDate} onChangeText={setPurchaseDate} placeholder="YYYY-MM-DD" error={errors['purchaseDate']} hint="Isi jika motor dibeli baru, agar jadwal servis pertama bisa dihitung." />
        <Field label="Kapasitas mesin (cc)" value={engineCc} onChangeText={setEngineCc} keyboardType="number-pad" error={errors['engineCc']} />
        <Field label="Nomor rangka" value={frameNumber} onChangeText={setFrameNumber} autoCapitalize="characters" error={errors['frameNumber']} />
        <Field label="Nomor mesin" value={engineNumber} onChangeText={setEngineNumber} autoCapitalize="characters" error={errors['engineNumber']} />
      </Card>

      {formError ? <Text className="mb-3 text-center text-red-600">{formError}</Text> : null}
      <Button title={props.mode === 'create' ? 'Simpan kendaraan' : 'Simpan perubahan'} onPress={() => void submit()} loading={busy} testID="vehicle-submit" />
    </View>
  );
}
