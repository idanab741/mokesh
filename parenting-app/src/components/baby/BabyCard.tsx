import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Sheet } from '@/components/ui/overlays';
import { Chip, Notice } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/design/tokens';
import { ageParts } from '@/domain/age';
import {
  type AvatarConfig, type BabyStage, OUTFIT_COLORS, defaultStageForAge, outfitName, parseAvatar, resolveOutfit, resolveStage, stageLabel,
} from '@/domain/avatar';
import type { Child } from '@/domain/child';
import { useChildMutations } from '@/hooks/data';
import { BabyView } from './BabyView';

/** Resolved look of a child's baby character. */
export function useBabyLook(child: Child, now: Date) {
  const config = parseAvatar(child.avatar);
  const months = ageParts(child.birthDate, now)?.totalMonths ?? 0;
  return { config, months, stage: resolveStage(config, months) };
}

const STAGES: (BabyStage | 'auto')[] = ['auto', 'tummy', 'sit', 'crawl', 'stand'];

/** The look editor: the colour of the clothes, and the pose. */
export function BabyCustomizeSheet({ child, now, open, onClose }: { child: Child; now: Date; open: boolean; onClose: () => void }) {
  const { setAvatar } = useChildMutations();
  const { config, months, stage } = useBabyLook(child, now);
  const outfit = resolveOutfit(config, child.sex);
  const update = (patch: Partial<AvatarConfig>) => setAvatar.mutate({ id: child.id, avatar: JSON.stringify({ ...config, ...patch }) });

  return (
    <Sheet visible={open} onClose={onClose} title={`המראה של ${child.name}`}>
      <View style={styles.preview}>
        {open ? <BabyView stage={stage} config={config} sex={child.sex} height={220} label={`תצוגה מקדימה של ${child.name}`} /> : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" color={colors.textSecondary}>צבע הבגדים</Text>
        <View style={styles.swatches} accessibilityRole="radiogroup">
          {OUTFIT_COLORS.map((color) => {
            const selected = color === outfit;
            return (
              <Pressable key={color} onPress={() => update({ outfit: color })} accessibilityRole="radio" accessibilityState={{ checked: selected }}
                aria-checked={selected} accessibilityLabel={`בגדים בצבע ${outfitName[color]}`}
                style={[styles.swatch, { backgroundColor: color }, selected && styles.swatchSelected, color === '#FFFFFF' ? styles.swatchLight : null]}>
                {selected ? <Check size={20} color={colors.textPrimary} strokeWidth={3} /> : null}
              </Pressable>
            );
          })}
        </View>
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
      <Notice text="התנוחה לפי הגיל היא ברירת מחדל משחקית בלבד. כל ילד מתקדם בקצב שלו, ואפשר לבחור תנוחה אחרת בכל רגע." />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchLight: { borderColor: colors.borderStrong },
  swatchSelected: { borderColor: colors.textPrimary, borderWidth: 3 },
  preview: { height: 232, borderRadius: radius.xl, backgroundColor: '#FFF1F5', overflow: 'hidden', justifyContent: 'flex-end' },
});
