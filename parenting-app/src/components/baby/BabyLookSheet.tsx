import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Sheet } from '@/components/ui/overlays';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/design/tokens';
import { type AvatarConfig, CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, SKIN_TONES, lookColors, parseAvatar } from '@/domain/avatar';
import type { Child } from '@/domain/child';
import { useChildMutations } from '@/hooks/data';
import { BabyClip } from './BabyClip';
import type { BabyClips } from './clips';

interface Option { key: string; label: string; swatch: string }

function Palette({ title, options, value, onPick }: { title: string; options: readonly Option[]; value: string; onPick: (key: string) => void }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" color={colors.textSecondary}>{title}</Text>
      <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel={title}>
        {options.map((o) => {
          const selected = o.key === value;
          return (
            <Pressable key={o.key} onPress={() => onPick(o.key)} accessibilityRole="radio" accessibilityState={{ checked: selected }}
              aria-checked={selected} accessibilityLabel={`${title}: ${o.label}`}
              style={[styles.swatch, { backgroundColor: o.swatch }, selected && styles.swatchSelected]}>
              {selected ? <Check size={18} color={isDark(o.swatch) ? colors.white : colors.textPrimary} strokeWidth={3} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const isDark = (hex: string) => [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0) < 380;

/** The look editor of the video character: skin tone, hair, eye and clothing colours, with a live preview. */
export function BabyLookSheet({ child, clips, open, onClose }: { child: Child; clips: BabyClips; open: boolean; onClose: () => void }) {
  const { setAvatar } = useChildMutations();
  const config = parseAvatar(child.avatar);
  const update = (patch: Partial<AvatarConfig>) => setAvatar.mutate({ id: child.id, avatar: JSON.stringify({ ...config, ...patch }) });

  return (
    <Sheet visible={open} onClose={onClose} title={`המראה של ${child.name}`}>
      <View style={styles.preview}>
        {open ? <BabyClip clips={clips} height={230} label={`תצוגה מקדימה של ${child.name}`} active look={lookColors(config)} greet={false} /> : null}
      </View>
      <Palette title="גוון העור" options={SKIN_TONES} value={config.skin} onPick={(skin) => update({ skin: skin as AvatarConfig['skin'] })} />
      <Palette title="צבע השיער" options={HAIR_COLORS} value={config.hair} onPick={(hair) => update({ hair: hair as AvatarConfig['hair'] })} />
      <Palette title="צבע העיניים" options={EYE_COLORS} value={config.eyes} onPick={(eyes) => update({ eyes: eyes as AvatarConfig['eyes'] })} />
      <Palette title="צבע הבגדים" options={CLOTH_COLORS} value={config.cloth} onPick={(cloth) => update({ cloth: cloth as AvatarConfig['cloth'] })} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  preview: { height: 230, alignItems: 'center', justifyContent: 'center' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong },
  swatchSelected: { borderColor: colors.textPrimary, borderWidth: 3 },
});
