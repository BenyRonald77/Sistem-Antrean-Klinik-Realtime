import { formatInTimeZone } from "date-fns-tz";

/**
 * Tanggal antrean (YYYY-MM-DD) dihitung berdasarkan timezone klinik, bukan
 * timezone server — ini yang membuat nomor antrean reset otomatis tiap hari
 * sesuai jam operasional klinik (FR-10).
 */
export function getQueueDateString(timezone: string, date: Date = new Date()): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}
