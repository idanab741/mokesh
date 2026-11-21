import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mascot } from '@/components/home/Companion';
import { colors, shadow, spacing, themed } from '@/design/tokens';
import type { MascotPose } from '@/domain/advisor';
import { useAppTheme } from '@/hooks/data';
import { Float } from './motion';
import { IconButton } from './primitives';
import { Text } from './Text';

/**
 * The layout every screen shares with Home: the child's sky at the top with the screen's name on
 * it, and a white sheet that rises over the sky and holds the content.
 */
export function SkyScreen({ title, subtitle, onBack, onClose, mascot, sky, action, hero, children, footer, tabs, edges, sheetStyle }: {
  title: string;
  subtitle?: string;
  /** A back arrow before the title (screens opened from another screen). */
  onBack?: () => void;
  /** A close button (screens that open as a sheet over the app). */
  onClose?: () => void;
  /** Lili beside the title. */
  mascot?: MascotPose;
  /** Another sky than the child's colour world (a form in its activity's colour). */
  sky?: readonly [string, string, string];
  /** A small control at the end of the title row. */
  action?: ReactNode;
  /** Drawn on the sky, between the title and the sheet. */
  hero?: ReactNode;
  children: ReactNode;
  /** Stays at the bottom of the screen, over the content (a form's save button). */
  footer?: ReactNode;
  /** True on the tab screens: leaves room for the floating bar. */
  tabs?: boolean;
  edges?: ('top' | 'bottom')[];
  sheetStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={edges ?? (tabs ? ['top'] : ['top', 'bottom'])}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LinearGradient colors={sky ?? theme.sky} locations={[0, 0.5, 1]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.sky} pointerEvents="none" />
          <View style={styles.head}>
            {onBack ? <IconButton icon={ChevronRight} label="חזרה" tone="surface" onPress={onBack} /> : null}
            {onClose ? <IconButton icon={X} label="סגירה" tone="surface" onPress={onClose} /> : null}
            <View style={{ flex: 1 }}>
              <Text variant="title" color={colors.ink} accessibilityRole="header" numberOfLines={2}>{title}</Text>
              {subtitle ? <Text variant="label" color={theme.onSky}>{subtitle}</Text> : null}
            </View>
            {action}
            {mascot ? <Float distance={4} duration={3600}><Mascot pose={mascot} size={62} /></Float> : null}
          </View>
          {hero ? <View style={styles.hero}>{hero}</View> : null}
          <View style={[styles.sheet, tabs && { paddingBottom: 130 }, sheetStyle]}>{children}</View>
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </View>
  );
}

/** A white card on the sheet: the unit every list, chart and form group sits in. */
export function SheetCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FDFBFA' },
  content: { flexGrow: 1 },
  sky: { position: 'absolute', top: -120, start: 0, end: 0, height: 520 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.md, minHeight: 70 },
  hero: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  sheet: { flexGrow: 1, marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg, backgroundColor: '#FDFBFA', borderTopLeftRadius: 34, borderTopRightRadius: 34 },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md, backgroundColor: '#FDFBFA' },
  card: { backgroundColor: colors.white, borderRadius: 26, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: 'rgba(58,34,51,0.05)', ...shadow.card },
}));
