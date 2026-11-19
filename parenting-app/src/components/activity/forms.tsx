import { Pause, Play, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { DateTimeField, FieldGroup, Stepper, TextField } from '@/components/ui/inputs';
import { Button, Chip, ChipGroup, Notice, Segmented } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, fonts, radius, spacing } from '@/design/tokens';
import { LIMITS } from '@/domain/activity';
import { useNow } from '@/hooks/data';
import { amountLabel, diaperColorLabel, diaperKindLabel, diaperTextureLabel, milkTypeLabel, solidsAmountLabel, solidsTextureLabel } from '@/i18n/he';
import { formatClock, formatDuration } from '@/lib/time';
import { type StateOf, nursingTotals } from './formState';

const options = <T extends string>(labels: Record<T, string>) => (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

interface FormProps<T extends import('@/domain/activity').ActivityType> {
  state: StateOf<T>;
  set: (patch: Partial<StateOf<T>>) => void;
}

const Notes = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <TextField label="הערות (לא חובה)" value={value} onChangeText={onChange} multiline maxLength={LIMITS.notesMax} placeholder="משהו שכדאי לזכור" />
);

/* ---------- Bottle ---------- */
export function BottleForm({ state, set, lastAmount }: FormProps<'bottle'> & { lastAmount: number | null }) {
  return (
    <>
      <FieldGroup label="סוג החלב">
        <Segmented options={options(milkTypeLabel)} value={state.milkType} onChange={(milkType) => set({ milkType })} />
      </FieldGroup>
      <FieldGroup label="כמות" hint={lastAmount ? `בפעם הקודמת: ${lastAmount} מ״ל` : undefined}>
        <View style={styles.bigValue}>
          <Stepper label="כמות" unit="מ״ל" value={state.amountMl} onChange={(amountMl) => set({ amountMl })} step={10} min={0} max={LIMITS.bottleMaxMl} large />
        </View>
        <View style={styles.presets}>
          {[60, 90, 120, 150, 180].map((ml) => (
            <Chip key={ml} label={String(ml)} selected={state.amountMl === ml} onPress={() => set({ amountMl: ml })} tone={activityTones.bottle} />
          ))}
        </View>
      </FieldGroup>
      <DateTimeField label="מתי" value={state.at} onChange={(at) => set({ at })} />
      <Notes value={state.notes} onChange={(notes) => set({ notes })} />
    </>
  );
}

/* ---------- Nursing ---------- */
export function NursingForm({ state, set }: FormProps<'nursing'>) {
  const now = useNow(1000, !!state.running);
  const totals = nursingTotals(state, now.getTime());
  const tone = activityTones.nursing;

  const toggle = (side: 'left' | 'right') => {
    const stamp = Date.now();
    const banked = nursingTotals(state, stamp);
    if (state.running?.side === side) {
      set({ leftSec: banked.left, rightSec: banked.right, running: null, lastSide: side });
    } else {
      // Starting a side (or switching sides): bank what ran so far, then run the new side.
      set({ leftSec: banked.left, rightSec: banked.right, running: { side, since: stamp }, lastSide: side });
    }
  };
  const setMinutes = (side: 'left' | 'right', minutes: number) =>
    set(side === 'left' ? { leftSec: minutes * 60 } : { rightSec: minutes * 60 });

  const renderSide = (side: 'left' | 'right', label: string) => {
    const running = state.running?.side === side;
    const seconds = side === 'left' ? totals.left : totals.right;
    return (
      <Pressable onPress={() => toggle(side)} accessibilityRole="button"
        accessibilityLabel={`צד ${label}, ${formatDuration(seconds / 60)}. ${running ? 'עצירה' : 'הפעלת טיימר'}`}
        style={({ pressed }) => [styles.side, running && { backgroundColor: tone.bg, borderColor: tone.ink }, pressed && { opacity: 0.8 }]}>
        <Text variant="label" color={running ? tone.ink : colors.textSecondary}>{label}</Text>
        <Text style={styles.sideClock} color={running ? tone.ink : colors.textPrimary}>{formatClock(seconds)}</Text>
        <View style={[styles.sideBtn, { backgroundColor: running ? tone.ink : colors.primaryLight }]}>
          {running ? <Pause size={20} color={colors.white} strokeWidth={2.2} /> : <Play size={20} color={colors.primaryStrong} strokeWidth={2.2} />}
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <FieldGroup label="טיימר לכל צד" hint="לחיצה על צד מפעילה אותו. לחיצה על הצד השני מעבירה אליו. הזמן נשמר גם אם האפליקציה נסגרת.">
        <View style={styles.sides}>
          {renderSide('right', 'ימין')}
          {renderSide('left', 'שמאל')}
        </View>
      </FieldGroup>
      <View style={styles.totalRow} accessibilityLiveRegion="none">
        <Text variant="label" color={colors.textSecondary}>משך כולל</Text>
        <Text variant="heading" style={{ writingDirection: 'ltr' }}>{formatClock(totals.left + totals.right)}</Text>
      </View>
      {!state.running ? (
        <FieldGroup label="או הזנה ידנית בדקות">
          <View style={styles.twoCols}>
            <View style={styles.col}>
              <Text variant="caption" color={colors.textSecondary} center>ימין</Text>
              <Stepper label="דקות בצד ימין" unit="ד׳" value={Math.round(state.rightSec / 60)} onChange={(m) => setMinutes('right', m)} step={1} max={240} />
            </View>
            <View style={styles.col}>
              <Text variant="caption" color={colors.textSecondary} center>שמאל</Text>
              <Stepper label="דקות בצד שמאל" unit="ד׳" value={Math.round(state.leftSec / 60)} onChange={(m) => setMinutes('left', m)} step={1} max={240} />
            </View>
          </View>
        </FieldGroup>
      ) : null}
      <DateTimeField label="מתי התחילה" value={state.at} onChange={(at) => set({ at })} />
      <Notes value={state.notes} onChange={(notes) => set({ notes })} />
    </>
  );
}

/* ---------- Pumping ---------- */
export function PumpingForm({ state, set }: FormProps<'pumping'>) {
  return (
    <>
      <FieldGroup label="כמות מכל צד">
        <View style={styles.twoCols}>
          <View style={styles.col}>
            <Text variant="caption" color={colors.textSecondary} center>ימין</Text>
            <Stepper label="כמות בצד ימין" unit="מ״ל" value={state.rightMl} onChange={(rightMl) => set({ rightMl })} step={10} max={LIMITS.pumpMaxMl} />
          </View>
          <View style={styles.col}>
            <Text variant="caption" color={colors.textSecondary} center>שמאל</Text>
            <Stepper label="כמות בצד שמאל" unit="מ״ל" value={state.leftMl} onChange={(leftMl) => set({ leftMl })} step={10} max={LIMITS.pumpMaxMl} />
          </View>
        </View>
      </FieldGroup>
      <View style={styles.totalRow}>
        <Text variant="label" color={colors.textSecondary}>כמות כוללת</Text>
        <Text variant="heading">{state.leftMl + state.rightMl} מ״ל</Text>
      </View>
      <FieldGroup label="משך השאיבה (לא חובה)">
        <Stepper label="משך השאיבה" unit="דקות" value={state.durationMin} onChange={(durationMin) => set({ durationMin })} step={5} max={240} />
      </FieldGroup>
      <DateTimeField label="מתי" value={state.at} onChange={(at) => set({ at })} />
      <Notes value={state.notes} onChange={(notes) => set({ notes })} />
    </>
  );
}

/* ---------- Sleep ---------- */
export function SleepForm({ state, set, isRunning, mode, onMode, isNew }: FormProps<'sleep'> & {
  /** The saved event is an active timer. */
  isRunning: boolean;
  mode: 'timer' | 'manual';
  onMode: (mode: 'timer' | 'manual') => void;
  isNew: boolean;
}) {
  const now = useNow(1000, isRunning && !state.end);
  const tone = activityTones.sleep;
  const duration = state.end ? Math.round((state.end.getTime() - state.start.getTime()) / 60_000) : null;
  return (
    <>
      {isNew ? (
        <Segmented value={mode} onChange={onMode} options={[{ value: 'timer', label: 'טיימר' }, { value: 'manual', label: 'הזנה בדיעבד' }]} />
      ) : null}

      {isRunning && !state.end ? (
        <View style={[styles.timerCard, { backgroundColor: tone.bg }]} accessibilityRole="timer">
          <Text variant="label" color={tone.ink}>זמן שעבר</Text>
          <Text variant="timer" color={tone.ink} style={{ writingDirection: 'ltr' }}>
            {formatClock((now.getTime() - state.start.getTime()) / 1000)}
          </Text>
          <Text variant="caption" color={tone.ink}>מחושב משעת ההתחלה, גם אם האפליקציה הייתה סגורה</Text>
        </View>
      ) : null}

      {isNew && mode === 'timer' ? (
        <Notice text="הטיימר יתחיל עכשיו וימשיך לרוץ ברקע. אפשר לסיים אותו ממסך הבית." />
      ) : (
        <>
          <DateTimeField label="שעת התחלה" value={state.start} onChange={(start) => set({ start })} />
          {state.end ? (
            <DateTimeField label="שעת סיום" value={state.end} onChange={(end) => set({ end })}
              error={duration !== null && duration < 0 ? 'שעת הסיום צריכה להיות אחרי שעת ההתחלה.' : null} />
          ) : null}
          {isRunning && !state.end ? (
            <Button label="הזנת שעת סיום ידנית" variant="secondary" size="md" onPress={() => set({ end: new Date() })} />
          ) : null}
          {isRunning && state.end ? (
            <Button label="ביטול שעת הסיום (השינה ממשיכה)" variant="ghost" size="md" onPress={() => set({ end: null })} />
          ) : null}
          {duration !== null && duration >= 0 ? (
            <View style={styles.totalRow}>
              <Text variant="label" color={colors.textSecondary}>משך השינה</Text>
              <Text variant="heading">{formatDuration(duration)}</Text>
            </View>
          ) : null}
        </>
      )}
      <Notes value={state.notes} onChange={(notes) => set({ notes })} />
    </>
  );
}

/* ---------- Diaper ---------- */
export function DiaperForm({ state, set }: FormProps<'diaper'>) {
  const hasStool = state.kind !== 'wet';
  return (
    <>
      <FieldGroup label="מה היה בחיתול">
        <Segmented options={options(diaperKindLabel)} value={state.kind} onChange={(kind) => set({ kind })} />
      </FieldGroup>
      <DateTimeField label="מתי" value={state.at} onChange={(at) => set({ at })} />
      {hasStool ? (
        <>
          <FieldGroup label="צבע (לא חובה)">
            <ChipGroup options={options(diaperColorLabel)} value={state.color} onChange={(color) => set({ color })} allowClear />
          </FieldGroup>
          <FieldGroup label="מרקם (לא חובה)">
            <ChipGroup options={options(diaperTextureLabel)} value={state.texture} onChange={(texture) => set({ texture })} allowClear />
          </FieldGroup>
        </>
      ) : null}
      <FieldGroup label="כמות משוערת (לא חובה)">
        <ChipGroup options={options(amountLabel)} value={state.amount} onChange={(amount) => set({ amount })} allowClear />
      </FieldGroup>
      <Notes value={state.notes} onChange={(notes) => set({ notes })} />
    </>
  );
}

/* ---------- Solids ---------- */
export function SolidsForm({ state, set, history }: FormProps<'solids'> & { history: { name: string; isAllergen: boolean }[] }) {
  const [name, setName] = useState('');
  const [allergen, setAllergen] = useState(false);
  const has = (n: string) => state.foods.some((f) => f.name.toLowerCase() === n.trim().toLowerCase());
  const toggle = (food: { name: string; isAllergen: boolean }) =>
    set({ foods: has(food.name) ? state.foods.filter((f) => f.name.toLowerCase() !== food.name.toLowerCase()) : [...state.foods, food] });
  const add = () => {
    const clean = name.trim();
    if (!clean) return;
    if (!has(clean)) set({ foods: [...state.foods, { name: clean, isAllergen: allergen }] });
    setName('');
    setAllergen(false);
  };
  const suggestions = history.filter((h) => !has(h.name)).slice(0, 12);

  return (
    <>
      <FieldGroup label="מה אכלו">
        {state.foods.length > 0 ? (
          <View style={styles.presets}>
            {state.foods.map((f) => (
              <Pressable key={f.name} onPress={() => toggle(f)} accessibilityRole="button" accessibilityLabel={`הסרת ${f.name}`}
                style={[styles.foodChip, { backgroundColor: activityTones.solids.bg, borderColor: activityTones.solids.ink }]}>
                <Text variant="label" color={activityTones.solids.ink}>{f.name}{f.isAllergen ? ' · אלרגן' : ''}</Text>
                <X size={14} color={activityTones.solids.ink} strokeWidth={2.4} />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text variant="caption" color={colors.textSecondary}>עוד לא נבחר מזון לארוחה הזו.</Text>
        )}
      </FieldGroup>

      {suggestions.length > 0 ? (
        <FieldGroup label="מזונות שכבר תיעדתם">
          <View style={styles.presets}>
            {suggestions.map((f) => <Chip key={f.name} label={f.name} onPress={() => toggle(f)} icon={Plus} />)}
          </View>
        </FieldGroup>
      ) : null}

      <FieldGroup label="הוספת מזון חדש">
        <View style={styles.addFood}>
          <TextInput value={name} onChangeText={setName} onSubmitEditing={add} placeholder="למשל: בטטה" placeholderTextColor="#A8959A"
            accessibilityLabel="שם המזון" maxLength={40} returnKeyType="done" style={styles.addFoodInput} />
          <Button label="הוספה" size="md" variant="secondary" onPress={add} disabled={!name.trim()} />
        </View>
        <View style={styles.switchRow}>
          <Text variant="label" style={{ flex: 1 }}>לסמן כמזון אלרגני</Text>
          <Switch value={allergen} onValueChange={setAllergen} accessibilityLabel="לסמן את המזון החדש כאלרגני"
            trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor={colors.white} />
        </View>
      </FieldGroup>

      <FieldGroup label="כמות משוערת (לא חובה)">
        <ChipGroup options={options(solidsAmountLabel)} value={state.amount} onChange={(amount) => set({ amount })} allowClear />
      </FieldGroup>
      <FieldGroup label="מרקם (לא חובה)">
        <ChipGroup options={options(solidsTextureLabel)} value={state.texture} onChange={(texture) => set({ texture })} allowClear />
      </FieldGroup>
      <DateTimeField label="מתי" value={state.at} onChange={(at) => set({ at })} />
      <TextField label="תגובה שנצפתה (לא חובה)" value={state.reaction} onChangeText={(reaction) => set({ reaction })} multiline maxLength={500}
        placeholder="מה ראיתם אחרי הארוחה" />
      <Notice text="הסימון והתיעוד נועדו לתיעוד בלבד. האפליקציה אינה קובעת אם קיימת אלרגיה. בכל חשש כדאי לפנות לרופא/ה." />
      <Notes value={state.notes} onChange={(notes) => set({ notes })} />
    </>
  );
}

/* ---------- Other ---------- */
export function OtherForm({ state, set }: FormProps<'other'>) {
  return (
    <>
      <TextField label="שם הפעילות" value={state.title} onChangeText={(title) => set({ title })} maxLength={80} placeholder="למשל: אמבטיה, זמן בטן, טיול" />
      <DateTimeField label="מתי" value={state.at} onChange={(at) => set({ at })} />
      <Notes value={state.notes} onChange={(notes) => set({ notes })} />
    </>
  );
}

const styles = StyleSheet.create({
  bigValue: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.lg },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sides: { flexDirection: 'row', gap: spacing.md },
  side: { flex: 1, alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  sideClock: { ...fonts.bold, fontSize: 30, lineHeight: 38, writingDirection: 'ltr' },
  sideBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, paddingHorizontal: spacing.lg, minHeight: 52 },
  twoCols: { gap: spacing.md },
  col: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, gap: spacing.xs },
  timerCard: { alignItems: 'center', borderRadius: radius.xl, paddingVertical: spacing.xxl, gap: spacing.xs },
  foodChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1 },
  addFood: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  addFoodInput: { flex: 1, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, ...fonts.regular, fontSize: 16, color: colors.textPrimary, textAlign: 'right' },
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
});
