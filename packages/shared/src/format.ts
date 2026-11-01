/** Display formatting helpers (Indonesian locale). */

export function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString('id-ID')} km`;
}

export function formatRupiah(amount: number): string {
  return `Rp${Math.round(amount).toLocaleString('id-ID')}`;
}

export function formatInterval(intervalKm: number | null, intervalMonths: number | null): string {
  const parts: string[] = [];
  if (intervalKm != null) parts.push(formatKm(intervalKm));
  if (intervalMonths != null) parts.push(`${intervalMonths} bulan`);
  return parts.join(' atau ');
}
