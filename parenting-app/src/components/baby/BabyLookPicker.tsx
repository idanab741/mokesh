import { Check } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Sheet } from '@/components/ui/overlays';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing, themed } from '@/design/tokens';
import { type BabyStage, defaultStageForAge, parseAvatar, stageLabel } from '@/domain/avatar';
import { ageParts } from '@/domain/age';
import { stageFromMilestones } from '@/domain/milestones';
import { Chip } from '@/components/ui/primitives';
import { THEMES, THEME_KEYS, resolveTheme } from '@/domain/theme';
import { LinearGradient } from 'expo-linear-gradient';
import type { Child } from '@/domain/child';
import { useChildMutations, useMilestones } from '@/hooks/data';
import { babyClips, babyLooks } from './clips';

/** The characters a parent can choose between for this child (same sex, other hair, eyes and skin). */
export function looksFor(sex: Child['sex']) {
  const who = sex === 'female' ? 'girl' : 'boy';
  const base = babyClips[who];
  const first = base.tummy ?? base.crawl ?? base.stand ?? base.sit;
  if (!first || babyLooks[who].length === 0) return [];
  return [
    { key: 'auto', label: 'עור בהיר, שיער חום־בהיר', poster: first.poster, standing: !!base.stand && !!base.crawl },
    ...babyLooks[who].map((l) => ({ key: l.key, label: l.label, poster: (l.clips.tummy ?? l.clips.crawl ?? l.clips.stand ?? l.clips.sit)!.poster, standing: !!l.clips.stand && !!l.clips.crawl })),
  ];
}

export function BabyLookPicker({ child, open, onClose }: { child: Child; open: boolean; onClose: () => void }) {
  const { setAvatar } = useChildMutations();
  const config = parseAvatar(child.avatar);
  const looks = looksFor(child.sex);
  const saved = config.look === 'blonde' ? 'porcelain' : config.look === 'dark' ? 'deep' : config.look;
  const current = looks.some((l) => l.key === saved) ? saved : 'auto';
  // Which pose "automatic" gives right now, and why: a moment the family marked, or the age.
  const marked = useMilestones(child.id);
  const fromMoments = stageFromMilestones(marked.data ?? []);
  const autoStage = fromMoments ?? defaultStageForAge(ageParts(child.birthDate, new Date())?.totalMonths ?? 0);
  // Only poses the chosen character really has a clip for.
  const who = child.sex === 'female' ? 'girl' : 'boy';
  const has = babyLooks[who].find((l) => l.key === current)?.clips ?? babyClips[who];
  const POSES: (BabyStage | 'auto')[] = ['auto', ...(['tummy', 'crawl', 'stand'] as const).filter((p) => has[p])];
  const set = (patch: object) => setAvatar.mutate({ id: child.id, avatar: JSON.stringify({ ...config, ...patch }) });
  return (
    <Sheet visible={open} onClose={onClose} title={`הדמות של ${child.name}`}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="label" color={colors.textSecondary}>צבע הרקע</Text>
        <View style={styles.themes} accessibilityRole="radiogroup">
          {THEME_KEYS.map((key) => {
            const t = THEMES[key];
            const selected = resolveTheme(config.theme, child.sex).key === key;
            return (
              <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: selected }} aria-checked={selected} accessibilityLabel={t.label}
                onPress={() => setAvatar.mutate({ id: child.id, avatar: JSON.stringify({ ...config, theme: key }) })} style={styles.themeItem}>
                <LinearGradient colors={t.sky} style={[styles.swatch, selected && { borderColor: colors.textPrimary }]}>
                  {selected ? <Check size={20} color={colors.textPrimary} strokeWidth={3} /> : null}
                </LinearGradient>
                <Text variant="caption" center color={colors.textSecondary}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        <Text variant="label" color={colors.textSecondary}>תנוחה</Text>
        <View style={styles.poses}>
          {POSES.map((p) => (
            <Chip key={p} selected={config.stage === p || (p === 'auto' && config.stage === 'sit')} onPress={() => set({ stage: p })}
              label={p === 'auto' ? `אוטומטי (${stageLabel[autoStage === 'sit' ? 'crawl' : autoStage]})` : stageLabel[p]} />
          ))}
        </View>
        <Text variant="caption" color={colors.textSecondary}>
          {fromMoments ? 'אוטומטי הולך לפי הרגע האחרון שסימנתם ב"רגעים ואבני דרך".' : 'אוטומטי הולך לפי הגיל. סימון "זוחל/ת" או "עומד/ת" ברגעים יקבע את התנוחה במקומו.'}
        </Text>
      </View>
      {looks.length > 0 ? <Text variant="label" color={colors.textSecondary}>הדמות</Text> : null}
      <View style={styles.row} accessibilityRole="radiogroup">
        {looks.map((l) => {
          const selected = l.key === current;
          return (
            <Pressable key={l.key} accessibilityRole="radio" accessibilityState={{ checked: selected }} aria-checked={selected} accessibilityLabel={l.label}
              onPress={() => { setAvatar.mutate({ id: child.id, avatar: JSON.stringify({ ...config, look: l.key }) }); onClose(); }}
              style={[styles.tile, selected && styles.tileSelected]}>
              <View style={styles.poster}><Image source={l.poster} style={styles.posterImage} resizeMode="cover" accessibilityIgnoresInvertColors /></View>
              {selected ? <View style={styles.check}><Check size={16} color={colors.white} strokeWidth={3} /></View> : null}
              <Text variant="caption" center color={colors.textSecondary} numberOfLines={2}>{l.label}</Text>
              {l.standing ? null : <Text variant="caption" center color={colors.warning}>חסרות תנוחות</Text>}
            </Pressable>
          );
        })}
      </View>
      {looks.some((l) => !l.standing) ? <Text variant="caption" color={colors.textSecondary}>לדמות שמסומנת "חסרות תנוחות" עוד אין סרטון לכל גיל. עד שנוסיף, היא תופיע בתנוחה הקרובה ביותר שיש לה.</Text> : null}
    </Sheet>
  );
}

const styles = themed(() => StyleSheet.create({
  poses: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  themes: { flexDirection: 'row', gap: spacing.md },
  themeItem: { flex: 1, alignItems: 'center', gap: 4 },
  swatch: { alignSelf: 'stretch', height: 56, borderRadius: radius.lg, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexBasis: '30%', flexGrow: 1, maxWidth: '32%', gap: 4, padding: 6, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.background },
  tileSelected: { borderColor: colors.primaryStrong },
  poster: { width: '100%', aspectRatio: 668 / 720, borderRadius: radius.md, overflow: 'hidden' },
  posterImage: { width: '100%', height: '100%' },
  check: { position: 'absolute', top: 10, end: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primaryStrong, alignItems: 'center', justifyContent: 'center' },
}));
