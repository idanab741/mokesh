import { pendingInvite } from '@/services/family';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { CalendarHeart, ChartColumn, UsersRound } from 'lucide-react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Logo } from '@/components/brand/Logo';
import { WelcomePoster } from '@/components/brand/WelcomePoster';
import { POSTER_ASPECT, POSTER_SKY } from '@/components/brand/welcomePosterMeta';
import { Rise } from '@/components/ui/motion';
import { Button, Notice, Screen } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, spacing, themed } from '@/design/tokens';
import { THEMES } from '@/domain/theme';
import { useChildren } from '@/hooks/data';
import { config } from '@/services/config';
import { useSession } from '@/state/session';

const POINTS = [
  { icon: CalendarHeart, title: 'תיעוד מהיר', body: 'שינה, אוכל וחיתול בשתי לחיצות' },
  { icon: ChartColumn, title: 'השגרה שלכם', body: 'נלמדת מהיומן שלכם' },
  { icon: UsersRound, title: 'כל המשפחה', body: 'משתפים רק את מי שבוחרים' },
] as const;

/** The logo and the headline above the poster. */
const TOP = 104;
/** How far the poster slides up under them: its own top is empty sky down to the moon. */
const UNDER = 0.15;

export default function WelcomeScreen() {
  const user = useSession((s) => s.user);
  const children = useChildren();
  const { width, height } = useWindowDimensions();
  // A sync that finishes while this screen is open may bring the family's children with it.
  if (children.data && children.data.length > 0) return <Redirect href="/(tabs)" />;
  const cloud = config.isCloudConfigured && !user;
  // The poster takes what the way in leaves free, so the main button is on screen without scrolling.
  const room = height - TOP - (cloud ? 236 : 150);
  const posterHeight = Math.round(Math.max(300, Math.min(room / (1 - UNDER), Math.min(width, 520) / POSTER_ASPECT)));
  return (
    <Screen scroll wash={false} edges={['top']} contentStyle={styles.content}>
      <View style={styles.skyTop} pointerEvents="none" />

      <View style={styles.top}>
        <Rise index={0}>
        <View style={styles.topInner}>
          <Logo size={32} color={colors.ink} />
          <Text variant="display" center color={colors.ink} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit style={styles.headline}>היום של התינוק שלכם, רגוע וברור</Text>
          <Text variant="label" center color={THEMES.rose.onSky}>מהלידה ועד גיל שלוש</Text>
        </View>
        </Rise>
      </View>

      <View style={[styles.stage, { height: posterHeight, marginTop: -Math.round(posterHeight * UNDER) }]}>
        <LinearGradient colors={POSTER_SKY} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={{ zIndex: 1 }}><WelcomePoster height={posterHeight} /></View>
      </View>

      <View style={styles.sheet}>
        {config.isCloudConfigured && !user && pendingInvite() ? (
          <Notice text="הוזמנת להצטרף למשפחה. אחרי יצירת חשבון או כניסה, הילדים והתיעוד של המשפחה יופיעו אצלך." />
        ) : null}
        {config.isCloudConfigured && !user ? (
          <>
            <Button label="יצירת חשבון" onPress={() => router.push('/auth/sign-up')} />
            <Button label="כבר יש לי חשבון" variant="secondary" onPress={() => router.push('/auth/sign-in')} />
            <Button label="להתחיל בלי חשבון" variant="ghost" size="md" onPress={() => router.push('/child/edit')}
              accessibilityHint="הנתונים יישמרו במכשיר הזה בלבד. אפשר לפתוח חשבון בהמשך." />
          </>
        ) : (
          <>
            <Button label="מתחילים" onPress={() => router.push('/child/edit')} />
            {!config.isCloudConfigured ? (
              <Notice text="בגרסה הזו הנתונים נשמרים במכשיר בלבד. גיבוי ושיתוף משפחתי יופעלו לאחר חיבור שרת." />
            ) : null}
          </>
        )}

        <View style={styles.points}>
          {POINTS.map(({ icon: Icon, title, body }) => (
            <View key={title} style={styles.point}>
              <View style={styles.pointIcon}><Icon size={20} color={colors.primaryStrong} strokeWidth={2} /></View>
              <Text variant="label" center color={colors.ink} style={{ fontWeight: '700' }}>{title}</Text>
              <Text variant="caption" center color={colors.textSecondary}>{body}</Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  content: { flexGrow: 1, paddingTop: spacing.md, paddingBottom: 0, gap: 0 },
  // The colour the poster's sky starts with, behind the logo and the headline.
  skyTop: { position: 'absolute', top: -200, start: -spacing.xl, end: -spacing.xl, height: 700, backgroundColor: POSTER_SKY[0] },
  top: { height: TOP, zIndex: 2 },
  topInner: { alignItems: 'center', gap: 2 },
  headline: { fontSize: 23, lineHeight: 32, marginTop: spacing.xs },
  stage: { marginHorizontal: -spacing.xl, alignItems: 'center', overflow: 'hidden' },
  sheet: { flexGrow: 1, marginTop: -26, marginHorizontal: -spacing.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm, backgroundColor: '#FDFBFA', borderTopLeftRadius: 34, borderTopRightRadius: 34 },
  points: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  point: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: colors.primaryLight, borderRadius: 22, paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  pointIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
}));
