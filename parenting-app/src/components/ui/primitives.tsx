import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, type PressableProps, ScrollView, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HIT, activityTones, colors, gradients, radius, shadow, spacing } from '@/design/tokens';
import type { ActivityType } from '@/domain/activity';
import { activityIcons } from './Icons';
import { useAppTheme } from '@/hooks/data';
import { PressScale } from './motion';
import { Text } from './Text';

/* ---------- Screen ---------- */
/** Every screen sits on the same soft colour wash, so the app never looks like flat grey panels. */
export function Screen({ children, scroll, edges = ['top'], contentStyle, footer, wash = true }: {
  /** False when the screen paints its own wash inside the scrolling content. */
  wash?: boolean;
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.screen}>
      {wash ? <LinearGradient colors={[theme.sky[1], theme.sky[2], colors.background]} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wash} pointerEvents="none" /> : null}
      <SafeAreaView style={{ flex: 1 }} edges={edges}>
        {scroll ? (
          <ScrollView contentContainerStyle={[styles.screenContent, contentStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.screenFill, contentStyle]}>{children}</View>
        )}
        {footer}
      </SafeAreaView>
    </View>
  );
}

/* ---------- Card ---------- */
export function Card({ children, style, onPress, accessibilityLabel }: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={[styles.card, style]}>
      {children}
    </PressScale>
  );
}

/* ---------- Button ---------- */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({ label, onPress, variant = 'primary', icon: Icon, loading, disabled, style, size = 'lg', accessibilityHint }: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: 'md' | 'lg';
  accessibilityHint?: string;
}) {
  const inactive = disabled || loading;
  const fg = variant === 'primary' ? colors.textOnPrimary : variant === 'danger' ? colors.danger : colors.primaryStrong;
  const flat = StyleSheet.flatten(style) ?? {};
  // A caller may recolour a primary button (e.g. the sleep banner); then the gradient is skipped.
  const custom = variant === 'primary' && !!flat.backgroundColor;
  return (
    <PressScale
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[
        styles.button,
        size === 'md' && styles.buttonMd,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        style,
      ]}>
      {variant === 'primary' && !custom ? (
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]} pointerEvents="none" />
      ) : null}
      {/* zIndex keeps the label above the absolutely-positioned gradient. */}
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {Icon ? <Icon size={20} color={fg} strokeWidth={2} /> : null}
            <Text variant="bodyStrong" color={fg}>{label}</Text>
          </>
        )}
      </View>
    </PressScale>
  );
}

/* ---------- Icon button ---------- */
export function IconButton({ icon: Icon, onPress, label, tone = 'plain', size = 44, badge, ...rest }: {
  icon: LucideIcon;
  onPress: () => void;
  /** Read by screen readers; icon-only buttons must always have one. */
  label: string;
  tone?: 'plain' | 'surface' | 'primary';
  size?: number;
  badge?: boolean;
} & Omit<PressableProps, 'style' | 'children' | 'onPress'>) {
  return (
    <Pressable
      {...rest}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={Math.max(0, (HIT - size) / 2)}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' },
        tone === 'surface' && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        tone === 'primary' && { backgroundColor: colors.primaryStrong },
        pressed && styles.pressed,
      ]}>
      <Icon size={22} color={tone === 'primary' ? colors.white : colors.textPrimary} strokeWidth={1.9} />
      {badge ? <View style={styles.badgeDot} /> : null}
    </Pressable>
  );
}

/* ---------- Activity badge ---------- */
export function ActivityBadge({ type, size = 44, soft }: { type: ActivityType; size?: number; soft?: boolean }) {
  const tone = activityTones[type];
  const Icon = activityIcons[type];
  if (soft) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={Math.round(size * 0.5)} color={tone.ink} />
      </View>
    );
  }
  return (
    <LinearGradient colors={tone.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size * 0.36, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={Math.round(size * 0.52)} color={colors.white} strokeWidth={2} />
    </LinearGradient>
  );
}

/* ---------- Chips ---------- */
export function Chip({ label, selected, onPress, icon: Icon, tone }: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: LucideIcon;
  tone?: { bg: string; ink: string };
}) {
  const bg = selected ? (tone?.bg ?? colors.primaryLight) : colors.surface;
  const fg = selected ? (tone?.ink ?? colors.primaryStrong) : colors.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, { backgroundColor: bg, borderColor: selected ? fg : colors.borderStrong }, pressed && styles.pressed]}>
      {Icon ? <Icon size={16} color={fg} strokeWidth={2} /> : null}
      <Text variant="label" color={fg} style={selected ? { fontWeight: '600' } : null}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup<T extends string>({ options, value, onChange, allowClear }: {
  options: readonly { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  allowClear?: boolean;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value}
          onPress={() => onChange(allowClear && o.value === value ? undefined : o.value)} />
      ))}
    </View>
  );
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected }} aria-selected={selected}
            style={[styles.segment, selected && styles.segmentSelected]}>
            <Text variant="label" color={selected ? colors.primaryStrong : colors.textSecondary}
              style={selected ? { fontWeight: '600' } : null}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Section header ---------- */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="heading" accessibilityRole="header">{title}</Text>
      {action}
    </View>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon: Icon, title, body, actionLabel, onAction }: {
  icon: LucideIcon;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon size={28} color={colors.primary} strokeWidth={1.6} />
      </View>
      <Text variant="heading" center>{title}</Text>
      {body ? <Text variant="body" color={colors.textSecondary} center>{body}</Text> : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} size="md" style={{ marginTop: spacing.sm, alignSelf: 'center', paddingHorizontal: spacing.xxl }} /> : null}
    </View>
  );
}

/* ---------- Inline notice ---------- */
export function Notice({ text, tone = 'info', icon: Icon }: { text: string; tone?: 'info' | 'warning' | 'danger'; icon?: LucideIcon }) {
  const bg = tone === 'danger' ? colors.dangerLight : tone === 'warning' ? colors.warningLight : colors.surfaceMuted;
  const fg = tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.textSecondary;
  return (
    <View style={[styles.notice, { backgroundColor: bg }]} accessibilityRole={tone === 'danger' ? 'alert' : undefined}>
      {Icon ? <Icon size={18} color={fg} strokeWidth={1.9} /> : null}
      <Text variant="caption" color={fg} style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  wash: { position: 'absolute', top: 0, start: 0, end: 0, height: 360, opacity: 0.55 },
  screenContent: { paddingHorizontal: spacing.xl, paddingBottom: 120, gap: spacing.lg },
  screenFill: { flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, ...shadow.card },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  button: { minHeight: 54, borderRadius: radius.pill, paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  buttonMd: { minHeight: HIT },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, zIndex: 1 },
  buttonPrimary: { backgroundColor: colors.primaryStrong, overflow: 'hidden', ...shadow.floating },
  buttonSecondary: { backgroundColor: colors.primaryLight },
  buttonDanger: { backgroundColor: colors.dangerLight },
  badgeDot: { position: 'absolute', top: 9, end: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.surface },
  chip: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  segmented: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segmentSelected: { backgroundColor: colors.surface, ...shadow.card },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
});
