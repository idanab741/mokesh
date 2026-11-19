import { router } from 'expo-router';
import { CalendarHeart, ChartColumn, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Button, Notice, Screen } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/design/tokens';
import { config } from '@/services/config';
import { useSession } from '@/state/session';

const POINTS = [
  { icon: CalendarHeart, title: 'תיעוד בשתי לחיצות', body: 'בקבוק, חיתול ושינה – גם באמצע הלילה.' },
  { icon: ChartColumn, title: 'תמונה ברורה של השגרה', body: 'יומן וסיכומים שנבנים רק ממה שתיעדתם.' },
  { icon: ShieldCheck, title: 'המידע נשאר שלכם', body: 'נשמר במכשיר, ומשותף רק עם מי שתבחרו.' },
];

export default function WelcomeScreen() {
  const user = useSession((s) => s.user);
  return (
    <Screen scroll edges={['top', 'bottom']} contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.mark}><CalendarHeart size={40} color={colors.primaryStrong} strokeWidth={1.5} /></View>
        <Text variant="display" center accessibilityRole="header">כל מה שהורים צריכים, במקום אחד</Text>
        <Text color={colors.textSecondary} center>מעקב יומיומי רגוע אחרי האכלות, שינה, חיתולים ומוצקים – מהלידה ועד גיל שלוש.</Text>
      </View>

      <View style={{ gap: spacing.md }}>
        {POINTS.map(({ icon: Icon, title, body }) => (
          <View key={title} style={styles.point}>
            <View style={styles.pointIcon}><Icon size={22} color={colors.primaryStrong} strokeWidth={1.7} /></View>
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
  content: { flexGrow: 1, justifyContent: 'space-between', paddingTop: spacing.xxxl, paddingBottom: spacing.xxl, gap: spacing.xxl },
  hero: { alignItems: 'center', gap: spacing.md },
  mark: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  pointIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
});
