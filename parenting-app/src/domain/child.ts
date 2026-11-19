import { z } from 'zod';
import type { SyncStatus } from './activity';
import type { ChildSex } from './age';

export interface Child {
  id: string;
  familyId: string | null;
  name: string;
  /** Local calendar date, YYYY-MM-DD. */
  birthDate: string;
  sex: ChildSex;
  /** Gestational age at birth in weeks; used later for prematurity-corrected growth charts. */
  gestationalWeeks: number | null;
  photoUri: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;
  syncStatus: SyncStatus;
}

export const childDraftSchema = z.object({
  name: z.string().trim().min(1, 'name_required').max(60),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'birth_date_invalid'),
  sex: z.enum(['female', 'male', 'unspecified']),
  gestationalWeeks: z.number().int().min(22).max(44).nullable(),
  photoUri: z.string().nullable(),
  notes: z.string().trim().max(2000).nullable(),
});
export type ChildDraft = z.infer<typeof childDraftSchema>;

export interface Measurement {
  id: string;
  childId: string;
  /** YYYY-MM-DD */
  measuredAt: string;
  weightG: number | null;
  lengthMm: number | null;
  headCircumferenceMm: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;
  syncStatus: SyncStatus;
}

export const measurementDraftSchema = z
  .object({
    measuredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    weightG: z.number().int().min(300).max(40000).nullable(),
    lengthMm: z.number().int().min(200).max(1400).nullable(),
    headCircumferenceMm: z.number().int().min(150).max(700).nullable(),
    notes: z.string().trim().max(1000).nullable(),
  })
  .refine((m) => m.weightG !== null || m.lengthMm !== null || m.headCircumferenceMm !== null, { message: 'measurement_empty' });
export type MeasurementDraft = z.infer<typeof measurementDraftSchema>;
