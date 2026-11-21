import { router } from 'expo-router';
import { BellRing, Clock, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { TextField } from '@/components/ui/inputs';
import { Button, Chip, Notice } from '@/components/ui/primitives';
import { SheetCard, SkyScreen } from '@/components/ui/SkyScreen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/overlays';
import { ReminderRow } from '@/components/reminders/ReminderRow';
import { colors, spacing, themed } from '@/design/tokens';
import { parseClock } from '@/domain/health';
import { GAP_CHOICES, type ReminderSettings, clockText } from '@/domain/reminders';
import { learnRoutine } from '@/domain/routine';
import { useActiveChild, useEventsBetween } from '@/hooks/data';
import { useReminders } from '@/hooks/reminders';
import { formatDuration } from '@/lib/time';
import { NOTIFIES_WHEN_CLOSED, type NotifyState, askToNotify, notifyState } from '@/services/notify';

/** The web switch takes its "on" colours from props of its own. */
const WEB_SWITCH = { activeThumbColor: '#FFFFFF' } as object;
const gapLabel = (h: number) => (h === 2 ? 'שעתיים' : `${String(h).replace('.5', '½')} שעות`);

export default function RemindersScreen() {
  const { child } = useActiveChild();
  const r = useReminders(child?.id);
  const toast = useToast((x) => x.show);
  const now = useMemo(() => new Date(), [r.due.length, r.upcoming.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const from = useMemo(() => new Date(now.getTime() - 14 * 86_400_000), [now]);
  const history = useEventsBetween(child?.id, from, now);
  const routine = useMemo(() => learnRoutine(history.data ?? [], now), [history.data, now]);

  const [notify, setNotify] = useState<NotifyState>('unsupported');
  useEffect(() => { void notifyState().then(setNotify); }, []);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('08:00');
  const [error, setError] = useState<string | null>(null);

  const s = r.settings;
  const set = (patch: Partial<ReminderSettings>) => r.save({ ...s, ...patch });
  const addDaily = () => {
    const clock = parseClock(time);
    if (!title.trim()) return setError('צריך לכתוב על מה להזכיר.');
    if (!clock) return setError('השעה צריכה להיות בצורה 08:00.');
    if (s.daily.length >= 12) return setError('אפשר לשמור עד 12 תזכורות יומיות.');
    set({ daily: [...s.daily, { id: `${Date.now()}`, title: title.trim(), hour: clock.h, minute: clock.m }] });
    setTitle(''); setError(null); toast('התזכורת נוספה');
  };

  const gapCard = (kind: 'feed' | 'diaper') => {
    const key = kind === 'feed' ? 'feedAfterHours' : 'diaperAfterHours';
    const value = s[key];
    const usual = kind === 'feed' ? routine.feed.gapMin : routine.diaper.gapMin;
    const name = kind === 'feed' ? 'האכלה' : 'חיתול';
    return (
      <SheetCard>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text variant="heading" color={colors.ink}>{`אחרי ${name}`}</Text>
            <Text variant="caption" color={colors.textSecondary}>{`תזכורת כשעובר הזמן שבחרתם מאז ה${name} האחרון${kind === 'feed' ? 'ה' : ''} שתועד${kind === 'feed' ? 'ה' : ''}`}</Text>
          </View>
          <Switch value={value !== null} onValueChange={(on) => set({ [key]: on ? 3 : null })} accessibilityLabel={`תזכורת אחרי ${name}`}
            trackColor={{ true: colors.primaryStrong, false: '#D9D2D6' }} thumbColor={colors.white} {...WEB_SWITCH} />
        </View>
        {value !== null ? (
          <>
            <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={`כמה זמן אחרי ${name}`}>
              {GAP_CHOICES.map((h) => <Chip key={h} label={gapLabel(h)} selected={value === h} onPress={() => set({ [key]: h })} />)}
            </View>
            {usual ? <Text variant="caption" color={colors.textSecondary}>{`לפי היומן שלכם, בדרך כלל עוברות אצלכם ${formatDuration(usual)} בערך.`}</Text> : null}
          </>
        ) : null}
      </SheetCard>
    );
  };

  return (
    <SkyScreen title="תזכורות" subtitle="אתם קובעים מתי, האפליקציה רק מזכירה" mascot="point"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/child'))}>
      <SheetCard>
        <Text variant="heading" color={colors.ink}>עכשיו ובהמשך</Text>
        {r.due.length === 0 && r.upcoming.length === 0 ? (
          <Text color={colors.textSecondary}>אין תזכורות פתוחות. מה שתפעילו למטה יופיע כאן וגם בעמוד הבית.</Text>
        ) : (
          <View style={{ gap: spacing.md }}>
            {r.due.map((x) => <ReminderRow key={x.key} reminder={x} now={now} due onDone={() => r.done(x.key)} />)}
            {r.upcoming.slice(0, 6).map((x) => <ReminderRow key={x.key} reminder={x} now={now} due={false} />)}
          </View>
        )}
      </SheetCard>

      {gapCard('feed')}
      {gapCard('diaper')}

      <SheetCard>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text variant="heading" color={colors.ink}>ביקורים</Text>
            <Text variant="caption" color={colors.textSecondary}>בערב שלפני ביקור שהזנתם במסך הבריאות, ובבוקר של אותו יום</Text>
          </View>
          <Switch value={s.visits} onValueChange={(on) => set({ visits: on })} accessibilityLabel="תזכורת לפני ביקורים"
            trackColor={{ true: colors.primaryStrong, false: '#D9D2D6' }} thumbColor={colors.white} {...WEB_SWITCH} />
        </View>
      </SheetCard>

      <SheetCard>
        <Text variant="heading" color={colors.ink}>תזכורות יומיות</Text>
        <Text variant="caption" color={colors.textSecondary}>כל דבר שאתם רוצים לזכור בכל יום באותה שעה. אתם כותבים מה ומתי.</Text>
        {s.daily.map((d) => (
          <View key={d.id} style={styles.row}>
            <View style={styles.rowIcon}><Clock size={18} color={colors.primaryStrong} strokeWidth={2} /></View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" color={colors.ink}>{d.title}</Text>
              <Text variant="caption" color={colors.textSecondary}>{`כל יום ב-${clockText(d.hour, d.minute)}`}</Text>
            </View>
            <Pressable onPress={() => set({ daily: s.daily.filter((x) => x.id !== d.id) })} accessibilityRole="button" accessibilityLabel={`מחיקת התזכורת ${d.title}`} hitSlop={10} style={styles.trash}>
              <Trash2 size={18} color={colors.textSecondary} strokeWidth={1.9} />
            </Pressable>
          </View>
        ))}
        <View style={styles.addRow}>
          <View style={{ flex: 1 }}><TextField label="על מה להזכיר" value={title} onChangeText={setTitle} placeholder="למשל ויטמין D" maxLength={40} /></View>
          <View style={{ width: 96 }}><TextField label="שעה" value={time} onChangeText={setTime} placeholder="08:00" keyboardType="numbers-and-punctuation" maxLength={5} /></View>
        </View>
        {error ? <Text variant="caption" color={colors.danger} accessibilityRole="alert">{error}</Text> : null}
        <Button label="הוספת תזכורת יומית" variant="secondary" size="md" onPress={addDaily} />
      </SheetCard>

      <SheetCard>
        <View style={styles.cardHead}>
          <View style={styles.rowIcon}><BellRing size={18} color={colors.primaryStrong} strokeWidth={2} /></View>
          <Text variant="heading" color={colors.ink} style={{ flex: 1 }}>התראות במכשיר</Text>
        </View>
        {notify === 'granted' ? <Text color={colors.textSecondary}>ההתראות מופעלות.</Text>
          : notify === 'ask' ? <Button label="הפעלת התראות" size="md" onPress={() => void askToNotify().then(setNotify)} />
            : notify === 'denied' ? <Text color={colors.textSecondary}>ההתראות חסומות בהגדרות המכשיר או הדפדפן. אפשר לפתוח אותן שם.</Text>
              : <Text color={colors.textSecondary}>המכשיר או הדפדפן הזה לא תומכים בהתראות.</Text>}
        {NOTIFIES_WHEN_CLOSED ? null : <Notice text="בגרסת האתר התראה קופצת רק כשהאפליקציה פתוחה. התזכורות עצמן מחכות תמיד כאן ובעמוד הבית." />}
      </SheetCard>

      <Text variant="caption" color={colors.textSecondary} center>התזכורות נשמרות במכשיר הזה בלבד.</Text>
    </SkyScreen>
  );
}

const styles = themed(() => StyleSheet.create({
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, minHeight: 40, borderRadius: 20, backgroundColor: colors.primaryLight },
  trash: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
}));
