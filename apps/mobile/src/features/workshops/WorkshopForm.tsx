import { useState } from 'react';
import { Text, View } from 'react-native';
import {
  WORKSHOP_CERTIFICATIONS,
  WORKSHOP_CERTIFICATION_LABELS,
  WORKSHOP_TYPES,
  WORKSHOP_TYPE_LABELS,
  workshopSchema,
  type WorkshopCertification,
  type WorkshopDto,
  type WorkshopInput,
  type WorkshopType,
} from '@prime-garage/shared';
import { Button, Card, Field, Select } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { apiFieldErrors, validate, type FieldErrors } from '@/lib/form';

/** FR-WS-01 */
export function WorkshopForm({ initial, onSubmit }: { initial?: WorkshopDto; onSubmit: (input: WorkshopInput) => Promise<void> }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<WorkshopType>(initial?.type ?? 'general');
  const [certification, setCertification] = useState<WorkshopCertification>(initial?.certification ?? 'unknown');
  const [certificationNote, setCertificationNote] = useState(initial?.certificationNote ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setFormError(null);
    const r = validate(workshopSchema, { name, type, certification, certificationNote, address, city, phone, notes });
    if (r.errors) {
      setErrors(r.errors);
      return;
    }
    setBusy(true);
    try {
      await onSubmit(r.data);
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
        <Field label="Nama bengkel" value={name} onChangeText={setName} placeholder="Contoh: Garam Motor" error={errors['name']} testID="workshop-name" />
        <Select label="Jenis" value={type} options={WORKSHOP_TYPES.map((t) => ({ value: t, label: WORKSHOP_TYPE_LABELS[t] }))} onChange={setType} />
        <Select
          label="Status sertifikasi"
          value={certification}
          options={WORKSHOP_CERTIFICATIONS.map((c) => ({ value: c, label: WORKSHOP_CERTIFICATION_LABELS[c] }))}
          onChange={setCertification}
        />
        <Field label="Keterangan sertifikasi (opsional)" value={certificationNote} onChangeText={setCertificationNote} placeholder="Contoh: mekanik bersertifikat AHM" />
        <Field label="Alamat" value={address} onChangeText={setAddress} />
        <Field label="Kota" value={city} onChangeText={setCity} />
        <Field label="Telepon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Catatan" value={notes} onChangeText={setNotes} multiline />
      </Card>
      {formError ? <Text className="mb-3 text-center text-red-600">{formError}</Text> : null}
      <Button title="Simpan bengkel" onPress={() => void submit()} loading={busy} testID="workshop-submit" />
    </View>
  );
}
