import { router } from 'expo-router';
import { CalendarClock, ChevronRight, Pill, Plus, Syringe, Thermometer, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DateField, DateTimeField, TextField } from '@/components/ui/inputs';
import { ConfirmDialog, Sheet, useToast } from '@/components/ui/overlays';
import { Button, Card, Chip, EmptyState, IconButton, Notice, Screen, SectionHeader, Segmented } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing, themed } from '@/design/tokens';
import { type Visit, type VisitKind, parseClock, parseTemperature, visitKindLabel } from '@/domain/health';
import { useActiveChild, useCanManage, useHealth, useNow } from '@/hooks/data';
import { errorMessage } from '@/i18n/he';
import { dayKey, formatDateFull, formatRelative, formatTime, ltr, parseDayKey } from '@/lib/time';

type Tab = 'fever' | 'vaccines' | 'visits';
const TABS = [{ value: 'fever', label: 'חום ותרופות' }, { value: 'vaccines', label: 'חיסונים' }, { value: 'visits', label: 'ביקורים' }] as const;
const KINDS: VisitKind[] = ['tipat_halav', 'pediatrician', 'specialist', 'other'];
type SheetKind = 'temp' | 'med' | 'vaccine' | 'visit' | null;

export default function HealthScreen() {
  const { child } = useActiveChild();
  const h = useHealth(child?.id);
  const canManage = useCanManage(child?.familyId);
  const now = useNow(30_000);
  const toast = useToast((s) => s.show);
  const [tab, setTab] = useState<Tab>('fever');
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [error, setError] = useState<string | null>(null);
  const [when, setWhen] = useState(new Date());
  const [temp, setTemp] = useState('');
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [clock, setClock] = useState('');
  const [kind, setKind] = useState<VisitKind>('tipat_halav');
  const [place, setPlace] = useState('');
  const [editing, setEditing] = useState<Visit | null>(null);
  const [toDelete, setToDelete] = useState<{ what: 'record' | 'given' | 'visit'; id: string } | null>(null);
  if (!child) return <Screen><View /></Screen>;

  const openSheet = (k: Exclude<SheetKind, null>, visit?: Visit) => {
    setError(null); setWhen(new Date()); setTemp(''); setName(''); setDose(''); setNotes('');
    setDate(dayKey(new Date())); setClock(''); setKind('tipat_halav'); setPlace(''); setEditing(visit ?? null);
    if (visit) {
      const d = new Date(visit.at);
      setKind(visit.kind); setName(visit.title); setDate(dayKey(d)); setClock(formatTime(d)); setPlace(visit.location ?? ''); setNotes(visit.summary ?? '');
    }
    setSheet(k);
  };
  const finish = (message: string) => ({ onSuccess: () => { setSheet(null); toast(message); }, onError: (err: unknown) => setError(errorMessage(err)) });
  const save = () => {
    if (sheet === 'temp') {
      const t = parseTemperature(temp);
      if (t === null) return setError('יש להזין חום במעלות צלזיוס, למשל 37.8.');
      h.addTemperature.mutate({ at: when, temperatureC: t, notes }, finish('המדידה נשמרה'));
    } else if (sheet === 'med') {
      if (!name.trim()) return setError('יש לכתוב את שם התרופה.');
      h.give.mutate({ name, at: when, doseText: dose, notes }, finish('נשמר שהתרופה ניתנה'));
    } else if (sheet === 'vaccine') {
      const d = date ? parseDayKey(date) : null;
      if (!name.trim()) return setError('יש לכתוב את שם החיסון, כפי שמופיע בפנקס.');
      if (!d) return setError('יש להזין את תאריך החיסון.');
      // A vaccination has a date, not a time: noon keeps it on the same day in every time zone, but never ahead of now.
      d.setHours(12);
      h.addVaccination.mutate({ at: d.getTime() > Date.now() ? new Date() : d, title: name, notes }, finish('החיסון נשמר'));
    } else if (sheet === 'visit') {
      const d = date ? parseDayKey(date) : null;
      const c = clock.trim() ? parseClock(clock) : { h: 9, m: 0 };
      if (!d) return setError('יש להזין את תאריך הביקור.');
      if (!c) return setError('השעה צריכה להיות בצורה 09:30.');
      d.setHours(c.h, c.m, 0, 0);
      h.saveVisit.mutate({ id: editing?.id, kind, title: name.trim() || visitKindLabel[kind], at: d, location: place, summary: notes }, finish('הביקור נשמר'));
    }
  };
  const busy = h.addTemperature.isPending || h.give.isPending || h.addVaccination.isPending || h.saveVisit.isPending;
  const doDelete = () => {
    if (!toDelete) return;
    const m = toDelete.what === 'record' ? h.removeRecord : toDelete.what === 'given' ? h.removeGiven : h.removeVisit;
    m.mutate(toDelete.id, { onSuccess: () => { setToDelete(null); toast('נמחק'); }, onError: () => { setToDelete(null); toast('המחיקה לא הושלמה.', { tone: 'error' }); } });
  };

  const temps = h.temperatures.data ?? [];
  const given = h.given.data ?? [];
  const meds = h.medications.data ?? [];
  const vaccines = h.vaccinations.data ?? [];
  const visits = h.visits.data ?? [];
  const upcoming = visits.filter((v) => new Date(v.at).getTime() >= now.getTime()).reverse();
  const past = visits.filter((v) => new Date(v.at).getTime() < now.getTime());
  // One line per medicine: when it was last given. The clock is the whole point of this screen.
  const lastGiven = meds.map((m) => ({ med: m, last: given.find((g) => g.medicationId === m.id) })).filter((x) => x.last);
  const timeline = [
    ...temps.map((t) => ({ id: t.id, at: t.at, what: 'record' as const, title: `חום ${ltr(t.temperatureC.toFixed(1))}°`, detail: t.notes })),
    ...given.map((g) => ({ id: g.id, at: g.at, what: 'given' as const, title: g.name, detail: [g.doseText, g.notes].filter(Boolean).join(' · ') || null })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const dateTime = (iso: string) => { const d = new Date(iso); return `${formatDateFull(d)} · ${ltr(formatTime(d))}`; };

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.head}>
        <IconButton icon={ChevronRight} label="חזרה" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/child'))} tone="surface" />
        <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>בריאות</Text>
      </View>
      <Segmented options={TABS} value={tab} onChange={setTab} />
      {!canManage ? <Notice text="את המידע הרפואי רואים ומוסיפים ההורים. ההרשאה שלך היא לתיעוד היומי." /> : null}

      {tab === 'fever' ? (
        <>
          {canManage ? (
            <View style={styles.actions}>
              <Button label="מדידת חום" icon={Thermometer} size="md" style={{ flex: 1 }} onPress={() => openSheet('temp')} />
              <Button label="תרופה שניתנה" icon={Pill} size="md" variant="secondary" style={{ flex: 1 }} onPress={() => openSheet('med')} />
            </View>
          ) : null}
          {lastGiven.length > 0 ? (
            <Card style={{ gap: spacing.sm }}>
              <Text variant="heading" accessibilityRole="header">מתי ניתן לאחרונה</Text>
              {lastGiven.map(({ med, last }) => (
                <View key={med.id} style={styles.lastRow}>
                  <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{med.name}</Text>
                  <Text variant="bodyStrong" color={colors.primaryStrong}>{formatRelative(new Date(last!.at), now)}</Text>
                </View>
              ))}
            </Card>
          ) : null}
          {timeline.length === 0 ? (
            <Card><EmptyState icon={Thermometer} title="עוד לא תועד חום או תרופה" body="כשהילד/ה חולה, כאן רואים בבת אחת מה נמדד ומה ניתן, ומתי." /></Card>
          ) : (
            <Card style={styles.list}>
              {timeline.map((e) => (
                <View key={e.id} style={styles.row}>
                  <View style={styles.dot}>{e.what === 'record' ? <Thermometer size={18} color={colors.primaryStrong} /> : <Pill size={18} color={colors.primaryStrong} />}</View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{e.title}</Text>
                    <Text variant="caption" color={colors.textSecondary}>{dateTime(e.at)}{e.detail ? ` · ${e.detail}` : ''}</Text>
                  </View>
                  {canManage ? <IconButton icon={Trash2} label={`מחיקת ${e.title}`} onPress={() => setToDelete({ what: e.what, id: e.id })} /> : null}
                </View>
              ))}
            </Card>
          )}
          <Notice text="האפליקציה רק רושמת. היא לא מחשבת מינון, לא קובעת מתי מותר לתת שוב ולא מפרשת את החום. פועלים לפי הנחיות הרופא/ה או העלון, ובכל חשש פונים לרופא/ה." />
        </>
      ) : null}

      {tab === 'vaccines' ? (
        <>
          {canManage ? <Button label="הוספת חיסון" icon={Plus} size="md" onPress={() => openSheet('vaccine')} /> : null}
          {vaccines.length === 0 ? (
            <Card><EmptyState icon={Syringe} title="עוד לא הוזנו חיסונים" body="מעתיקים מפנקס החיסונים: שם החיסון והתאריך שבו ניתן." /></Card>
          ) : (
            <Card style={styles.list}>
              {vaccines.map((v) => (
                <View key={v.id} style={styles.row}>
                  <View style={styles.dot}><Syringe size={18} color={colors.primaryStrong} /></View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{v.title}</Text>
                    <Text variant="caption" color={colors.textSecondary}>{formatDateFull(new Date(v.at))}{v.notes ? ` · ${v.notes}` : ''}</Text>
                  </View>
                  {canManage ? <IconButton icon={Trash2} label={`מחיקת ${v.title}`} onPress={() => setToDelete({ what: 'record', id: v.id })} /> : null}
                </View>
              ))}
            </Card>
          )}
          <Notice text="הרשימה היא מה שהזנתם. לוח החיסונים המומלץ ומה הבא בתור נקבעים בטיפת חלב." />
        </>
      ) : null}

      {tab === 'visits' ? (
        <>
          {canManage ? <Button label="הוספת ביקור" icon={Plus} size="md" onPress={() => openSheet('visit')} /> : null}
          {visits.length === 0 ? <Card><EmptyState icon={CalendarClock} title="עוד אין ביקורים" body="תור שנקבע לטיפת חלב או לרופא/ה, ואחריו מה שנאמר בביקור." /></Card> : null}
          {[{ title: 'ביקורים קרובים', items: upcoming }, { title: 'ביקורים שהיו', items: past }].map((group) => group.items.length === 0 ? null : (
            <View key={group.title} style={{ gap: spacing.md }}>
              <SectionHeader title={group.title} />
              <Card style={styles.list}>
                {group.items.map((v) => (
                  <Pressable key={v.id} disabled={!canManage} onPress={() => openSheet('visit', v)} accessibilityRole="button"
                    accessibilityLabel={`${v.title}, ${dateTime(v.at)}`} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
                    <View style={styles.dot}><CalendarClock size={18} color={colors.primaryStrong} /></View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong">{v.title}</Text>
                      <Text variant="caption" color={colors.textSecondary}>{dateTime(v.at)}{v.location ? ` · ${v.location}` : ''}</Text>
                      {v.summary ? <Text variant="label" numberOfLines={3}>{v.summary}</Text> : null}
                    </View>
                  </Pressable>
                ))}
              </Card>
            </View>
          ))}
        </>
      ) : null}

      <Sheet visible={sheet !== null} onClose={() => setSheet(null)}
        title={sheet === 'temp' ? 'מדידת חום' : sheet === 'med' ? 'תרופה שניתנה' : sheet === 'vaccine' ? 'הוספת חיסון' : editing ? 'עריכת ביקור' : 'הוספת ביקור'}>
        {sheet === 'temp' ? (
          <>
            <TextField label="חום (מעלות צלזיוס)" value={temp} onChangeText={(t) => { setTemp(t); setError(null); }} placeholder="37.8" keyboardType="decimal-pad" inputMode="decimal" maxLength={5} style={{ writingDirection: 'ltr' }} />
            <DateTimeField label="מתי" value={when} onChange={setWhen} />
            <TextField label="הערה (לא חובה)" value={notes} onChangeText={setNotes} placeholder="איפה נמדד, איך הרגיש/ה" maxLength={300} />
          </>
        ) : null}
        {sheet === 'med' ? (
          <>
            {meds.length > 0 ? (
              <View style={styles.chips}>
                {meds.map((m) => <Chip key={m.id} label={m.name} selected={name.trim().toLowerCase() === m.name.toLowerCase()} onPress={() => { setName(m.name); setDose(m.doseText ?? ''); setError(null); }} />)}
              </View>
            ) : null}
            <TextField label="שם התרופה" value={name} onChangeText={(t) => { setName(t); setError(null); }} placeholder="כפי שכתוב על האריזה" maxLength={120} />
            <TextField label="כמה ניתן (לא חובה)" value={dose} onChangeText={setDose} placeholder="כפי שהורה הרופא/ה או העלון" maxLength={120} />
            <DateTimeField label="מתי" value={when} onChange={setWhen} />
            <TextField label="הערה (לא חובה)" value={notes} onChangeText={setNotes} maxLength={300} />
          </>
        ) : null}
        {sheet === 'vaccine' ? (
          <>
            <TextField label="שם החיסון" value={name} onChangeText={(t) => { setName(t); setError(null); }} placeholder="כפי שמופיע בפנקס החיסונים" maxLength={160} />
            <DateField label="תאריך" value={date} onChange={setDate} />
            <TextField label="הערה (לא חובה)" value={notes} onChangeText={setNotes} placeholder="מנה, איפה ניתן" maxLength={300} />
          </>
        ) : null}
        {sheet === 'visit' ? (
          <>
            <View style={styles.chips}>
              {KINDS.map((k) => <Chip key={k} label={visitKindLabel[k]} selected={k === kind} onPress={() => setKind(k)} />)}
            </View>
            <TextField label="כותרת (לא חובה)" value={name} onChangeText={setName} placeholder={visitKindLabel[kind]} maxLength={160} />
            <DateField label="תאריך" value={date} onChange={setDate} />
            <TextField label="שעה (לא חובה)" value={clock} onChangeText={(t) => { setClock(t); setError(null); }} placeholder="09:30" maxLength={5} style={{ writingDirection: 'ltr' }} />
            <TextField label="מקום (לא חובה)" value={place} onChangeText={setPlace} maxLength={200} />
            <TextField label="מה נאמר בביקור (לא חובה)" value={notes} onChangeText={setNotes} multiline maxLength={2000} />
          </>
        ) : null}
        {error ? <Notice tone="danger" text={error} /> : null}
        <Button label="שמירה" loading={busy} onPress={save} />
        {sheet === 'visit' && editing ? <Button label="מחיקת הביקור" icon={Trash2} variant="ghost" size="md" onPress={() => { setSheet(null); setToDelete({ what: 'visit', id: editing.id }); }} /> : null}
      </Sheet>

      <ConfirmDialog visible={toDelete !== null} destructive title="למחוק את הרישום?" body="הרישום יוסר גם אצל שאר בני המשפחה."
        confirmLabel="מחיקה" onCancel={() => setToDelete(null)} onConfirm={doDelete} />
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  list: { paddingVertical: spacing.xs, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  lastRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 36 },
  dot: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
}));
