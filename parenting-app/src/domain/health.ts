/**
 * Health notes a parent keeps: temperature readings, medicines that were given, vaccinations
 * copied from the child's booklet, and visits. The app stores and shows them; it never computes
 * a dose, never says when a medicine may be given again, and never interprets a temperature.
 */
export interface TemperatureReading { id: string; childId: string; at: string; temperatureC: number; notes: string | null }
export interface Vaccination { id: string; childId: string; at: string; title: string; notes: string | null }
export interface Medication { id: string; childId: string; name: string; doseText: string | null }
export interface MedicationGiven { id: string; childId: string; medicationId: string; name: string; at: string; doseText: string | null; notes: string | null }
export type VisitKind = 'tipat_halav' | 'pediatrician' | 'specialist' | 'other';
export interface Visit { id: string; childId: string; kind: VisitKind; title: string; at: string; location: string | null; summary: string | null }

export const visitKindLabel: Record<VisitKind, string> = { tipat_halav: 'טיפת חלב', pediatrician: 'רופא/ת ילדים', specialist: 'רופא/ה מומחה/ית', other: 'אחר' };

export const TEMP_MIN = 34;
export const TEMP_MAX = 43;
/** Accepts "38.5" or "38,5"; null when it is not a plausible body temperature in Celsius. */
export function parseTemperature(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < TEMP_MIN || n > TEMP_MAX) return null;
  return Math.round(n * 10) / 10;
}
/** "HH:MM" into hours and minutes; null when it is not a time of day. */
export function parseClock(text: string): { h: number; m: number } | null {
  const match = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(text);
  if (!match) return null;
  const h = Number(match[1]); const m = Number(match[2]);
  return h <= 23 && m <= 59 ? { h, m } : null;
}
