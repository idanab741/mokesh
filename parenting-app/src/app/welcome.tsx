import { pendingInvite } from '@/services/family';
import { Redirect, router } from 'expo-router';
import { CalendarHeart, ChartColumn, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mascot } from '@/components/home/Companion';
import type { MascotPose } from '@/domain/advisor';
import { MobileIllustration } from '@/components/brand/Illustrations';
import { Logo } from '@/components/brand/Logo';
import { Float } from '@/components/ui/motion';
import { Button, Notice, Screen } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, radius, spacing, themed } from '@/design/tokens';
import { useChildren } from '@/hooks/data';
import { config } from '@/services/config';
import { useSession } from '@/state/session';

const POINTS = [
  { icon: CalendarHeart, tone: 'bottle', title: 'תיעוד בשתי לחיצות', body: 'בקבוק, חיתול ושינה – גם באמצע הלילה.' },
  { icon: ChartColumn, tone: 'sleep', title: 'תמונה ברורה של השגרה', body: 'יומן וסיכומים שנבנים רק ממה שתיעדתם.' },
  { icon: ShieldCheck, tone: 'diaper', title: 'המידע נשאר שלכם', body: 'נשמר במכשיר, ומשותף רק עם מי שתבחרו.' },
] as const;

/** The tour before the first screen: Lili shows, in four steps, what the app does. */
const TOUR: { pose: MascotPose; sky: readonly [string, string, string]; title: string; body: string }[] = [
  { pose: 'wave', sky: ['#FFD9C2', '#FFC3D3', '#E6CBFF'], title: 'נעים מאוד, אני לילי', body: 'אני אלווה אתכם ביום־יום עם התינוק: מה קרה, מה צפוי, ומה שווה לזכור.' },
  { pose: 'point', sky: ['#FFE7CC', '#C6E2FF', '#C9CEFF'], title: 'שינה, אוכל, חיתול', body: 'שלושת הדברים שהיום בנוי מהם, בלחיצה אחת. גם באמצע הלילה, גם ביד אחת.' },
  { pose: 'think', sky: ['#FFF1C4', '#CBEFD8', '#BFE3F5'], title: 'לומדת את השגרה שלכם', body: 'אחרי כמה ימים אדע לומר מתי בדרך כלל מגיעות ההאכלה והשינה הבאות. רק לפי מה שתיעדתם.' },
  { pose: 'heart', sky: ['#FFD9C2', '#FFC3D3', '#E6CBFF'], title: 'רגעים, בריאות ומשפחה', body: 'אלבום של רגעים ראשונים, חום וחיסונים, סטריליזטור, ושיתוף עם מי שמטפל יחד איתכם.' },
];

export default function WelcomeScreen() {
  const [step, setStep] = useState(0);
  const user = useSession((s) => s.user);
  const children = useChildren();
  // A sync that finishes while this screen is open may bring the family's children with it.
  if (children.data && children.data.length > 0) return <Redirect href="/(tabs)" />;
  if (step < TOUR.length) {
    const slide = TOUR[step];
    const last = step === TOUR.length - 1;
    return (
      <View style={styles.tour}>
        <LinearGradient colors={slide.sky} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.tourTop}>
          <Logo size={28} />
          <Pressable onPress={() => setStep(TOUR.length)} accessibilityRole="button" accessibilityLabel="דילוג על ההסבר" hitSlop={12} style={styles.skip}>
            <Text variant="label" color={colors.ink} style={{ fontWeight: '600' }}>דלג</Text>
          </Pressable>
        </View>
        <View style={styles.tourStage}>
          <View style={styles.tourArch}><Float distance={8} duration={3200}><Mascot pose={slide.pose} size={210} /></Float></View>
        </View>
        <View style={styles.tourSheet}>
          <View style={styles.dots} accessibilityLabel={`שלב ${step + 1} מתוך ${TOUR.length}`}>
            {TOUR.map((t, i) => <View key={t.title} style={[styles.dot, i === step && styles.dotOn]} />)}
          </View>
          <Text variant="title" color={colors.ink} center accessibilityRole="header">{slide.title}</Text>
          <Text color={colors.textSecondary} center style={{ minHeight: 70 }}>{slide.body}</Text>
          <Button label={last ? 'בואו נתחיל' : 'הבא'} onPress={() => setStep(step + 1)} />
        </View>
      </View>
    );
  }

  return (
    <Screen scroll edges={['top', 'bottom']} contentStyle={styles.content}>
      <View style={styles.hero}>
        <Logo size={40} />
        <Float><MobileIllustration size={240} /></Float>
        <Text variant="display" center accessibilityRole="header">כל מה שהורים צריכים, במקום אחד</Text>
        <Text color={colors.textSecondary} center>מעקב יומיומי רגוע אחרי האכלות, שינה, חיתולים ומוצקים – מהלידה ועד גיל שלוש.</Text>
      </View>

      <View style={{ gap: spacing.md }}>
        {POINTS.map(({ icon: Icon, title, body, tone }) => (
          <View key={title} style={styles.point}>
            <View style={[styles.pointIcon, { backgroundColor: activityTones[tone].bg }]}><Icon size={22} color={activityTones[tone].ink} strokeWidth={1.9} /></View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{title}</Text>
              <Text variant="label" color={colors.textSecondary}>{body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: spacing.sm }}>
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
      </View>
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  tour: { flex: 1, backgroundColor: colors.background },
  tourTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  skip: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  tourStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tourArch: { width: 280, height: 300, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderTopLeftRadius: 140, borderTopRightRadius: 140, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  tourSheet: { backgroundColor: '#FDFBFA', borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotOn: { width: 22, backgroundColor: colors.primaryStrong },
  content: { flexGrow: 1, justifyContent: 'space-between', paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: 24, padding: spacing.lg },
  pointIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
}));
