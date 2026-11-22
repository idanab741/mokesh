import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Stepper } from '@/components/ui/inputs';
import { PressScale } from '@/components/ui/motion';
import { Float } from '@/components/ui/motion';
import { Sheet, useToast } from '@/components/ui/overlays';
import { Button, Chip } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, radius, shadow, spacing, themed } from '@/design/tokens';
import type { Advice, MascotPose } from '@/domain/advisor';
import { STERILIZE_ITEMS, STERILIZE_TITLE, type SterilizeItem, type SterilizeState, sterilizeNotes } from '@/domain/sterilize';
import { CATALOG, type Milestone, catalogTitle } from '@/domain/milestones';
import type { ChildSex } from '@/domain/age';
import { useEventMutations } from '@/hooks/data';
import { errorMessage } from '@/i18n/he';
import { formatRelative } from '@/lib/time';
import { Droplets, Lock, Sparkles } from 'lucide-react-native';

const POSES: Record<MascotPose, number> = {
  wave: require('../../../assets/mascot/lili-wave.png'),
  point: require('../../../assets/mascot/lili-point.png'),
  think: require('../../../assets/mascot/lili-think.png'),
  cheer: require('../../../assets/mascot/lili-cheer.png'),
  sleep: require('../../../assets/mascot/lili-sleep.png'),
  heart: require('../../../assets/mascot/lili-heart.png'),
};

export function Mascot({ pose, size = 72 }: { pose: MascotPose; size?: number }) {
  return <Image source={POSES[pose]} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

/** Lili, the companion: one thing worth knowing right now, and a button that does something about it. */
export function Companion({ advice, onAction, step }: {
  advice: Advice; onAction: () => void;
  /** One of Lili's first steps with a new family: where it is in the list, and a way to put it off. */
  step?: { index: number; total: number; onSkip: () => void };
}) {
  return (
    <View style={styles.companion} testID="companion">
      <Float distance={5} duration={3600}><Mascot pose={advice.pose} /></Float>
      <View style={styles.bubble}>
        <Text variant="caption" color={colors.primaryStrong} style={{ fontWeight: '700' }}>{step ? `לילי · צעד ${step.index} מתוך ${step.total}` : 'לילי, המלווה שלכם'}</Text>
        <Text variant="body" color={colors.ink}>{advice.text}</Text>
        {advice.action ? (
          <View style={styles.bubbleRow}>
            <PressScale onPress={onAction} accessibilityRole="button" accessibilityLabel={`לילי מציעה: ${advice.action.label}`} style={styles.bubbleAction}>
              <Text variant="label" color={colors.white} style={{ fontWeight: '700' }}>{advice.action.label}</Text>
            </PressScale>
            {step ? (
              <Pressable onPress={step.onSkip} accessibilityRole="button" accessibilityLabel="לא עכשיו" hitSlop={8} style={styles.bubbleSkip}>
                <Text variant="label" color={colors.textSecondary}>לא עכשיו</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Sterilising: when the gear was last done, what was in the batch, and how many bottles of it are still clean. */
export function SterilizeCard({ state, now, onLog }: { state: SterilizeState | null; now: Date; onLog: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.sterIcon}><Droplets size={22} color="#1F6BC2" strokeWidth={1.9} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" color={colors.ink}>סטריליזטור</Text>
        {state ? (
          <>
            <Text variant="caption" color={colors.textSecondary}>
              {`הופעל ${formatRelative(state.at, now)}`}{state.bottles > 0 ? ' · נשארו ' : ''}
              {state.bottles > 0 ? <Text variant="caption" color="#1F6BC2" style={{ fontWeight: '700' }}>{state.cleanBottles === 1 ? 'בקבוק נקי אחד' : `${state.cleanBottles} בקבוקים נקיים`}</Text> : null}
            </Text>
            {state.items.length > 0 ? (
              <View style={styles.pills}>{state.items.map((it) => <View key={it} style={styles.pill}><Text variant="caption" color="#1F6BC2" style={{ fontWeight: '600', fontSize: 11 }}>{it}</Text></View>)}</View>
            ) : null}
          </>
        ) : <Text variant="caption" color={colors.textSecondary}>עוד לא תועד. נזכור בשבילכם מתי הופעל וכמה בקבוקים נקיים נשארו.</Text>}
      </View>
      <PressScale onPress={onLog} accessibilityRole="button" accessibilityLabel="תיעוד סטריליזטור" style={styles.sterBtn}>
        <Text variant="label" color={colors.white} style={{ fontWeight: '700' }}>הפעלתי</Text>
      </PressScale>
    </View>
  );
}

export function SterilizeSheet({ open, onClose, childId, last }: { open: boolean; onClose: () => void; childId: string; last: SterilizeState | null }) {
  const { create } = useEventMutations();
  const toast = useToast((s) => s.show);
  const [bottles, setBottles] = useState(last?.bottles || 6);
  const [items, setItems] = useState<SterilizeItem[]>(last?.items ?? ['פטמות']);
  const toggle = (it: SterilizeItem) => setItems((cur) => (cur.includes(it) ? cur.filter((x) => x !== it) : [...cur, it]));
  const save = () => {
    const iso = new Date().toISOString();
    create.mutate({ childId, draft: { type: 'other', occurredAt: iso, notes: sterilizeNotes(bottles, items), payload: { title: STERILIZE_TITLE } } }, {
      onSuccess: () => { onClose(); toast('נשמר: הסטריליזטור הופעל'); },
      onError: (err) => toast(errorMessage(err), { tone: 'error' }),
    });
  };
  return (
    <Sheet visible={open} onClose={onClose} title="מה נכנס לסטריליזטור?">
      <Stepper label="בקבוקים" unit="בקבוקים" value={bottles} onChange={setBottles} step={1} min={0} max={30} large />
      <View style={styles.chips}>
        {STERILIZE_ITEMS.map((it) => <Chip key={it} label={it} selected={items.includes(it)} onPress={() => toggle(it)} />)}
      </View>
      <Text variant="caption" color={colors.textSecondary}>כל בקבוק שתתעדו מעכשיו יורד מהמספר, כך שתמיד רואים כמה נקיים נשארו.</Text>
      <Button label={`שמירה: ${sterilizeNotes(bottles, items) || 'סטריליזטור'}`} loading={create.isPending} onPress={save} />
    </Sheet>
  );
}

/** The album: moments that were caught in colour, a few still waiting, and the count. */
export function Album({ marked, sex, name, onOpen }: { marked: readonly Milestone[]; sex: ChildSex; name: string; onOpen: () => void }) {
  const got = marked.slice(0, 5).map((m) => ({ key: m.id, title: m.title, on: true }));
  const keys = new Set(marked.map((m) => m.catalogKey));
  const waiting = CATALOG.filter((c) => !keys.has(c.key)).slice(0, Math.max(0, 5 - got.length)).map((c) => ({ key: c.key, title: catalogTitle(c, sex), on: false }));
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`הרגעים של ${name}: ${marked.length} רגעים. פתיחה`} style={[styles.card, { flexDirection: 'column', alignItems: 'stretch' }]}>
      <View style={styles.albumHead}>
        <Text variant="bodyStrong" color={colors.ink}>{`הרגעים של ${name}`}</Text>
        <Text variant="label" color={colors.primaryStrong} style={{ fontWeight: '600' }}>{marked.length === 0 ? 'הרגע הראשון' : marked.length === 1 ? 'רגע אחד' : `${marked.length} רגעים`}</Text>
      </View>
      <View style={styles.album}>
        {[...got, ...waiting].map((b) => (
          <View key={b.key} style={styles.badgeItem}>
            <View style={[styles.badge, b.on ? styles.badgeOn : styles.badgeOff]}>
              {b.on ? <Sparkles size={22} color={colors.white} strokeWidth={2} /> : <Lock size={18} color="#B9AEB3" strokeWidth={2} />}
            </View>
            <Text variant="caption" center numberOfLines={2} color={b.on ? colors.ink : colors.textSecondary} style={{ fontSize: 11, fontWeight: b.on ? '600' : '400' }}>{b.title}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
  companion: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bubble: { flex: 1, gap: 4, backgroundColor: colors.surface, borderRadius: 24, borderTopStartRadius: 8, padding: spacing.md, ...shadow.card },
  bubbleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 6, flexWrap: 'wrap' },
  bubbleSkip: { minHeight: 40, justifyContent: 'center' },
  bubbleAction: { backgroundColor: colors.primaryStrong, borderRadius: radius.pill, paddingHorizontal: spacing.lg, minHeight: 40, justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 24, padding: spacing.md, ...shadow.card },
  sterIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#E1EEFF', alignItems: 'center', justifyContent: 'center' },
  sterBtn: { backgroundColor: '#1F6BC2', borderRadius: radius.pill, paddingHorizontal: spacing.lg, minHeight: 40, justifyContent: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  pill: { backgroundColor: '#E1EEFF', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  albumHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  album: { flexDirection: 'row', justifyContent: 'space-between' },
  badgeItem: { width: '19%', alignItems: 'center', gap: 4 },
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  badgeOn: { backgroundColor: '#FF9EC4', ...shadow.card },
  badgeOff: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#D9D0D4' },
}));
