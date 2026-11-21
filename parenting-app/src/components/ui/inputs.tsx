import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { colors, fonts, radius, spacing, themed } from '@/design/tokens';
import { addDays, dayKey, formatDayLabel, isSameDay } from '@/lib/time';
import { IconButton } from './primitives';
import { Text } from './Text';

/* ---------- Labelled group ---------- */
export function FieldGroup({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text variant="label" color={colors.textSecondary}>{label}</Text>
      {children}
      {error ? <Text variant="caption" color={colors.danger} accessibilityRole="alert">{error}</Text>
        : hint ? <Text variant="caption" color={colors.textSecondary}>{hint}</Text> : null}
    </View>
  );
}

/* ---------- Text field ---------- */
export function TextField({ label, hint, error, style, ...rest }: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  const [focused, setFocused] = useState(false);
  return (
    <FieldGroup label={label} hint={hint} error={error}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#A8959A"
        {...rest}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        style={[styles.input, rest.multiline && styles.multiline, focused && styles.focused, !!error && styles.errored, style]}
      />
    </FieldGroup>
  );
}

/* ---------- Numeric stepper ---------- */
export function Stepper({ value, onChange, step = 10, min = 0, max, unit, label, large }: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max: number;
  unit?: string;
  label: string;
  large?: boolean;
}) {
  const [text, setText] = useState(String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setText(String(value)); }, [value, editing]);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  // Tapping the number empties the field (the old value stays visible as a hint), so the
  // first key press starts a new number. Leaving it empty keeps the old value.
  const commit = (raw: string) => {
    setEditing(false);
    const digits = raw.replace(/[^\d]/g, '');
    const next = digits === '' ? value : clamp(Number(digits));
    onChange(next);
    setText(String(next));
  };
  return (
    <View style={styles.stepper}>
      <IconButton icon={Minus} tone="surface" size={large ? 52 : 44} label={`הפחתת ${step} ${unit ?? ''} מ${label}`} onPress={() => onChange(clamp(value - step))} disabled={value <= min} />
      <View style={styles.stepperValue}>
        <TextInput
          accessibilityLabel={`${label}${unit ? `, ${unit}` : ''}`}
          value={text}
          placeholder={String(value)}
          placeholderTextColor="#B9B2BD"
          onFocus={() => { setEditing(true); setText(''); }}
          onChangeText={(t) => setText(t.replace(/[^\d]/g, '').slice(0, 4))}
          onBlur={() => commit(text)}
          onSubmitEditing={() => commit(text)}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={4}
          style={[styles.stepperInput, large && styles.stepperInputLarge]}
        />
        {unit ? <Text variant="label" color={colors.textSecondary}>{unit}</Text> : null}
      </View>
      <IconButton icon={Plus} tone="surface" size={large ? 52 : 44} label={`הוספת ${step} ${unit ?? ''} ל${label}`} onPress={() => onChange(clamp(value + step))} disabled={value >= max} />
    </View>
  );
}

/* ---------- Date + time ---------- */
const two = (n: number) => String(n).padStart(2, '0');

function TimeInputs({ value, onChange, label }: { value: Date; onChange: (d: Date) => void; label: string }) {
  const [hh, setHh] = useState(two(value.getHours()));
  const [mm, setMm] = useState(two(value.getMinutes()));
  const [editing, setEditing] = useState<'h' | 'm' | null>(null);
  useEffect(() => { if (!editing) { setHh(two(value.getHours())); setMm(two(value.getMinutes())); } }, [value, editing]);
  // Same pattern as the stepper: focusing a part empties it, an empty part keeps its old value.
  const commit = (h: string, m: string) => {
    setEditing(null);
    const hour = h === '' ? value.getHours() : Math.min(23, Math.max(0, Number(h) || 0));
    const minute = m === '' ? value.getMinutes() : Math.min(59, Math.max(0, Number(m) || 0));
    const next = new Date(value);
    next.setHours(hour, minute, 0, 0);
    onChange(next);
    setHh(two(hour));
    setMm(two(minute));
  };
  const digits = (t: string) => t.replace(/[^\d]/g, '').slice(0, 2);
  return (
    // Clock digits always read left-to-right, also inside an RTL layout.
    <View style={styles.time} accessibilityLabel={label}>
      <TextInput accessibilityLabel={`${label}, שעה`} value={hh} placeholder={two(value.getHours())} placeholderTextColor="#B9B2BD"
        onFocus={() => { setEditing('h'); setHh(''); }} onChangeText={(t) => setHh(digits(t))} onBlur={() => commit(hh, mm)}
        keyboardType="number-pad" inputMode="numeric" maxLength={2} style={styles.timeInput} />
      <Text variant="heading" color={colors.textSecondary}>:</Text>
      <TextInput accessibilityLabel={`${label}, דקות`} value={mm} placeholder={two(value.getMinutes())} placeholderTextColor="#B9B2BD"
        onFocus={() => { setEditing('m'); setMm(''); }} onChangeText={(t) => setMm(digits(t))} onBlur={() => commit(hh, mm)}
        keyboardType="number-pad" inputMode="numeric" maxLength={2} style={styles.timeInput} />
    </View>
  );
}

/** Day stepper + HH:MM. Built in-house so it behaves identically on iOS, Android and web. */
export function DateTimeField({ label, value, onChange, maxDate, error }: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  /** Days after this one are not selectable (defaults to today). */
  maxDate?: Date;
  error?: string | null;
}) {
  const limit = maxDate ?? new Date();
  const canGoForward = dayKey(value) < dayKey(limit);
  const shift = (days: number) => onChange(addDays(value, days));
  // Typing "23:50" a little after midnight means last night, not a time that has not happened yet.
  const onTime = (next: Date) => {
    const soon = Date.now() + 5 * 60_000;
    onChange(next.getTime() > soon && isSameDay(next, new Date()) ? addDays(next, -1) : next);
  };
  return (
    <FieldGroup label={label} error={error}>
      <View style={styles.dateTimeRow}>
        <View style={styles.dayStepper}>
          <IconButton icon={ChevronRight} label="יום קודם" onPress={() => shift(-1)} size={40} />
          <Text variant="bodyStrong" style={{ flex: 1 }} center numberOfLines={1}>{formatDayLabel(value)}</Text>
          <IconButton icon={ChevronLeft} label="יום הבא" onPress={() => shift(1)} size={40} disabled={!canGoForward} />
        </View>
        <TimeInputs value={value} onChange={onTime} label={label} />
      </View>
    </FieldGroup>
  );
}

/** Calendar date as three numeric fields (day / month / year). Emits YYYY-MM-DD or null while incomplete. */
export function DateField({ label, value, onChange, error, hint: hint2 }: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string | null;
  hint?: string;
}) {
  const parts = value ? value.split('-') : ['', '', ''];
  const [d, setD] = useState(parts[2] ? String(Number(parts[2])) : '');
  const [m, setM] = useState(parts[1] ? String(Number(parts[1])) : '');
  const [y, setY] = useState(parts[0] ?? '');
  const emit = (dd: string, mm: string, yy: string) => {
    const day = Number(dd), month = Number(mm), year = Number(yy);
    if (!dd || !mm || yy.length !== 4) return onChange(null);
    const date = new Date(year, month - 1, day);
    const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    onChange(valid ? dayKey(date) : null);
  };
  const digits = (t: string, n: number) => t.replace(/[^\d]/g, '').slice(0, n);
  const common = { keyboardType: 'number-pad' as const, inputMode: 'numeric' as const, placeholderTextColor: '#A8959A' };
  // Tapping a filled part empties it so the first key press starts a new value;
  // leaving it empty puts the previous value back.
  const [held, setHeld] = useState<{ part: 'd' | 'm' | 'y'; value: string } | null>(null);
  const focus = (part: 'd' | 'm' | 'y', current: string, set: (v: string) => void) => () => {
    if (current === '') return;
    setHeld({ part, value: current });
    set('');
  };
  const blur = (part: 'd' | 'm' | 'y', current: string, set: (v: string) => void) => () => {
    if (held?.part === part && current === '') {
      set(held.value);
      emit(part === 'd' ? held.value : d, part === 'm' ? held.value : m, part === 'y' ? held.value : y);
    }
    setHeld(null);
  };
  const hint = (part: 'd' | 'm' | 'y', fallback: string) => (held?.part === part ? held.value : fallback);
  return (
    <FieldGroup label={label} error={error} hint={hint2}>
      <View style={styles.dateRow}>
        <TextInput {...common} accessibilityLabel={`${label}, יום`} placeholder={hint('d', 'יום')} value={d} maxLength={2}
          onFocus={focus('d', d, setD)} onBlur={blur('d', d, setD)}
          onChangeText={(t) => { const v = digits(t, 2); setD(v); emit(v, m, y); }} style={[styles.input, styles.datePart]} />
        <TextInput {...common} accessibilityLabel={`${label}, חודש`} placeholder={hint('m', 'חודש')} value={m} maxLength={2}
          onFocus={focus('m', m, setM)} onBlur={blur('m', m, setM)}
          onChangeText={(t) => { const v = digits(t, 2); setM(v); emit(d, v, y); }} style={[styles.input, styles.datePart]} />
        <TextInput {...common} accessibilityLabel={`${label}, שנה`} placeholder={hint('y', 'שנה')} value={y} maxLength={4}
          onFocus={focus('y', y, setY)} onBlur={blur('y', y, setY)}
          onChangeText={(t) => { const v = digits(t, 4); setY(v); emit(d, m, v); }} style={[styles.input, styles.datePart, { flex: 1.4 }]} />
      </View>
    </FieldGroup>
  );
}

export function isToday(d: Date) {
  return isSameDay(d, new Date());
}

const styles = themed(() => StyleSheet.create({
  group: { gap: spacing.sm },
  input: {
    // On web a text input has an intrinsic width; without minWidth 0 it refuses to shrink inside a row.
    minWidth: 0,
    minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg, ...fonts.regular, fontSize: 16, color: colors.textPrimary, textAlign: 'right',
  },
  multiline: { minHeight: 88, paddingTop: spacing.md, textAlignVertical: 'top' },
  focused: { borderColor: colors.primary },
  errored: { borderColor: colors.danger },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  stepperValue: { alignItems: 'center' },
  stepperInput: { ...fonts.bold, fontSize: 28, color: colors.textPrimary, textAlign: 'center', width: 96, paddingVertical: 2 },
  stepperInputLarge: { fontSize: 44, width: 132 },
  dateTimeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  dayStepper: {
    flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: 4,
  },
  time: {
    flexDirection: 'row', direction: 'ltr', alignItems: 'center', gap: 2, minHeight: 52, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: spacing.sm,
  },
  timeInput: { width: 40, ...fonts.semibold, fontSize: 18, color: colors.textPrimary, textAlign: 'center', paddingVertical: 8 },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  datePart: { flex: 1, flexBasis: 0, minWidth: 0, textAlign: 'center', paddingHorizontal: spacing.sm },
}));
