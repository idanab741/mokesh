import { Check } from 'lucide-react-native';
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

/** Resolved look of a child's 3D baby. */
export function useBabyLook(child: Child, now: Date) {
  const config = parseAvatar(child.avatar);
  const months = ageParts(child.birthDate, now)?.totalMonths ?? 0;
  return { config, months, stage: resolveStage(config, months) };
}

/** The sheet where a parent makes the 3D baby look like their child. A live preview stays on top. */
export function BabyCustomizeSheet({ child, now, open, onClose }: { child: Child; now: Date; open: boolean; onClose: () => void }) {
  const { setAvatar } = useChildMutations();
  const { config, months, stage } = useBabyLook(child, now);
  const update = (patch: Partial<AvatarConfig>) => setAvatar.mutate({ id: child.id, avatar: JSON.stringify({ ...config, ...patch }) });
  return (
    <Sheet visible={open} onClose={onClose} title={`המראה של ${child.name}`}>
      <View style={styles.preview}>
        {open ? <Baby3D stage={stage} config={config} height={190} label={`תצוגה מקדימה של ${child.name}`} /> : null}
        {child.photoUri ? <View style={styles.previewPhoto}><Avatar name={child.name} uri={child.photoUri} size={52} /></View> : null}
      </View>
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
  );
}

const styles = StyleSheet.create({
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchLight: { borderColor: colors.borderStrong },
  swatchSelected: { borderColor: colors.textPrimary, borderWidth: 3 },
  preview: { height: 190, borderRadius: radius.xl, backgroundColor: '#FFF1F5', overflow: 'hidden' },
  previewPhoto: { position: 'absolute', top: spacing.md, start: spacing.md, borderRadius: 30, borderWidth: 3, borderColor: colors.white },
});
