import { pendingInvite } from '@/services/family';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Logo } from '@/components/brand/Logo';
import { WelcomePoster } from '@/components/brand/WelcomePoster';
import { POSTER_ASPECT, POSTER_HEADROOM, POSTER_SKY } from '@/components/brand/welcomePosterMeta';
import { Rise } from '@/components/ui/motion';
import { Button, Notice, Screen } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, spacing, themed } from '@/design/tokens';
import { THEMES } from '@/domain/theme';
import { useChildren } from '@/hooks/data';
import { config } from '@/services/config';
import { useServices } from '@/state/services';
import { useSession } from '@/state/session';
import { useState } from 'react';

/** The logo and the headline above the poster. */
const TOP = 104;

export default function WelcomeScreen() {
  const user = useSession((s) => s.user);
  const children = useChildren();
  const { width, height } = useWindowDimensions();
  const { enterDemo } = useServices();
  const [peeking, setPeeking] = useState(false);
  // A sync that finishes while this screen is open may bring the family's children with it.
  const cloud = config.isCloudConfigured && !user;
  if (!cloud && children.data && children.data.length > 0) return <Redirect href="/(tabs)" />;
  // The poster takes what the way in leaves free, so the main button is on screen without scrolling.
  const room = height - TOP - (cloud ? 236 : 150);
  const posterHeight = Math.round(Math.max(300, Math.min(room / (1 - POSTER_HEADROOM), Math.min(width, 520) / POSTER_ASPECT)));
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

      <View style={[styles.stage, { height: posterHeight, marginTop: -Math.round(posterHeight * POSTER_HEADROOM) }]}>
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
            <Button label="להציץ בלי חשבון" variant="ghost" size="md" loading={peeking} onPress={() => { setPeeking(true); void enterDemo().then(() => router.replace('/(tabs)')).finally(() => setPeeking(false)); }}
              accessibilityHint="תינוקת לדוגמה, לצפייה בלבד. כדי לתעד צריך חשבון." />
          </>
        ) : (
          <>
            <Button label="מתחילים" onPress={() => router.push('/child/edit')} />
            {!config.isCloudConfigured ? (
              <Notice text="בגרסה הזו הנתונים נשמרים במכשיר בלבד. גיבוי ושיתוף משפחתי יופעלו לאחר חיבור שרת." />
            ) : null}
          </>
        )}

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
}));
