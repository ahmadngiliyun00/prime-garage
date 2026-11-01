import { Platform } from 'react-native';
import type { AttachmentDto } from '@prime-garage/shared';
import { http } from './api';

export type PickedImage = { uri: string; mimeType?: string | null; fileName?: string | null };

/** Uploads a picked image (expo-image-picker asset) as multipart/form-data. */
export async function uploadImage(
  image: PickedImage,
  ownerType: 'service_record' | 'vehicle',
  ownerId: string,
): Promise<AttachmentDto> {
  const form = new FormData();
  form.append('ownerType', ownerType);
  form.append('ownerId', ownerId);
  const type = image.mimeType ?? 'image/jpeg';
  const name = image.fileName ?? `photo.${type.split('/')[1] ?? 'jpg'}`;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(image.uri)).blob();
    form.append('file', blob, name);
  } else {
    // React Native's FormData accepts { uri, name, type } file descriptors.
    form.append('file', { uri: image.uri, name, type } as unknown as Blob);
  }
  return http.post<AttachmentDto>('/attachments', form);
}
