import { Check, Palette } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Sheet } from '@/components/ui/overlays';
import { Chip, Notice } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/design/tokens';
import { ageParts } from '@/domain/age';
import {
  type AvatarConfig, type BabyStage, EYE_COLORS, HAIR_COLORS, OUTFIT_COLORS, SKIN_TONES,
  defaultStageForAge, parseAvatar, resolveStage, stageLabel,
} from '@/domain/avatar';
import type { Child } from '@/domain/child';
import { useChildMutations } from '@/hooks/data';
import { Baby3D } from './Baby3D';

function Swatches({ label, options, value, onChange, names }: {
  label: string; options: readonly (string | null)[]; value: string | null; onChange: (v: string | null) => void; names: (i: number, v: string | null) => string;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" color={colors.textSecondary}>{label}</Text>
      <View style={styles.swatches} accessibilityRole="radiogroup">
        {options.map((option, i) => {
          const selected = option === value;
          return (
            <Pressable key={option ?? 'none'} onPress={() => onChange(option)} accessibilityRole="radio" accessibilityState={{ checked: selected }} aria-checked={selected}
              accessibilityLabel={names(i, option)} hitSlop={4}
              style={[styles.swatch, { backgroundColor: option ?? colors.surface }, selected && styles.swatchSelected, option === '#FFFFFF' || option === null ? styles.swatchLight : null]}>
              {option === null ? <Text variant="caption" color={colors.textSecondary}>בלי</Text> : null}
              {selected && option !== null ? <Check size={18} color={i < 2 || option === '#FFFFFF' || option === '#EACB7C' ? colors.textPrimary : colors.white} strokeWidth={3} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const STAGES: (BabyStage | 'auto')[] = ['auto', 'tummy', 'crawl', 'stand'];

/** The 3D baby on Home, with the sheet that lets a parent make it look like their child. */
export function BabyCard({ child, now }: { child: Child; now: Date }) {
  const [open, setOpen] = useState(false);
  const { setAvatar } = useChildMutations();
  const config = parseAvatar(child.avatar);
  const months = ageParts(child.birthDate, now)?.totalMonths ?? 0;
  const stage = resolveStage(config, months);
  const update = (patch: Partial<AvatarConfig>) => setAvatar.mutate({ id: child.id, avatar: JSON.stringify({ ...config, ...patch }) });

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text variant="heading" accessibilityRole="header">{`${child.name} בתלת-ממד`}</Text>
          <Text variant="caption" color={colors.textSecondary}>{`${stageLabel[stage]} · גררו כדי לסובב`}</Text>
        </View>
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="התאמת המראה של הדמות" style={styles.edit} hitSlop={6}>
          <Palette size={18} color={colors.primaryStrong} strokeWidth={2} />
          <Text variant="label" color={colors.primaryStrong} style={{ fontWeight: '600' }}>התאמה</Text>
        </Pressable>
      </View>
      <Baby3D stage={stage} config={config} height={250} label={`דמות תלת-ממדית של ${child.name}, ${stageLabel[stage]}`} />

      <Sheet visible={open} onClose={() => setOpen(false)} title={`המראה של ${child.name}`}>
        {child.photoUri ? (
          <View style={styles.photoRow}>
            <Avatar name={child.name} uri={child.photoUri} size={56} />
            <Text variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>התמונה כאן לעזר: בחרו את הגוונים הכי קרובים אליה.</Text>
          </View>
        ) : null}
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color={colors.textSecondary}>תנוחה</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {STAGES.map((s) => (
              <Chip key={s} selected={config.stage === s} onPress={() => update({ stage: s })}
                label={s === 'auto' ? `לפי הגיל (${stageLabel[defaultStageForAge(months)]})` : stageLabel[s]} />
            ))}
          </View>
        </View>
        <Swatches label="גוון עור" options={SKIN_TONES} value={config.skin} onChange={(v) => v && update({ skin: v })} names={(i) => `גוון עור ${i + 1}`} />
        <Swatches label="שיער" options={[...HAIR_COLORS, null]} value={config.hair} onChange={(v) => update({ hair: v })} names={(i, v) => (v ? `צבע שיער ${i + 1}` : 'בלי שיער')} />
        <Swatches label="עיניים" options={EYE_COLORS} value={config.eyes} onChange={(v) => v && update({ eyes: v })} names={(i) => `צבע עיניים ${i + 1}`} />
        <Swatches label="בגד" options={OUTFIT_COLORS} value={config.outfit} onChange={(v) => v && update({ outfit: v })} names={(i, v) => (v === '#FFFFFF' ? 'חיתול בלבד' : `צבע בגד ${i}`)} />
        <Notice text="התנוחה לפי הגיל היא ברירת מחדל משחקית בלבד. כל ילד מתקדם בקצב שלו, ואפשר לבחור תנוחה אחרת בכל רגע." />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF7F9', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, paddingTop: spacing.lg, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, minHeight: 36, borderRadius: radius.pill },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchLight: { borderColor: colors.borderStrong },
  swatchSelected: { borderColor: colors.textPrimary, borderWidth: 3 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceMuted, borderRadius: radius.lg, padding: spacing.md },
});
