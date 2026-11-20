import { Redirect, router } from 'expo-router';
import { CalendarHeart, ChartColumn, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { MobileIllustration } from '@/components/brand/Illustrations';
import { Logo } from '@/components/brand/Logo';
import { Float } from '@/components/ui/motion';
import { Button, Notice, Screen } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, radius, spacing } from '@/design/tokens';
import { useChildren } from '@/hooks/data';
import { config } from '@/services/config';
import { useSession } from '@/state/session';

const POINTS = [
  { icon: CalendarHeart, tone: 'bottle', title: 'תיעוד בשתי לחיצות', body: 'בקבוק, חיתול ושינה – גם באמצע הלילה.' },
  { icon: ChartColumn, tone: 'sleep', title: 'תמונה ברורה של השגרה', body: 'יומן וסיכומים שנבנים רק ממה שתיעדתם.' },
  { icon: ShieldCheck, tone: 'diaper', title: 'המידע נשאר שלכם', body: 'נשמר במכשיר, ומשותף רק עם מי שתבחרו.' },
] as const;

export default function WelcomeScreen() {
  const user = useSession((s) => s.user);
  const children = useChildren();
  // A sync that finishes while this screen is open may bring the family's children with it.
  if (children.data && children.data.length > 0) return <Redirect href="/(tabs)" />;
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

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'space-between', paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: 24, padding: spacing.lg },
  pointIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
});
