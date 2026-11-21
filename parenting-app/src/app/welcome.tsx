import { pendingInvite } from '@/services/family';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { CalendarHeart, ChartColumn, UsersRound } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { BabyFigure } from '@/components/baby/BabyFigure';
import { babyClips, babyLooks } from '@/components/baby/clips';
import { Logo } from '@/components/brand/Logo';
import { Mascot } from '@/components/home/Companion';
import { Float, Rise } from '@/components/ui/motion';
import { Button, Notice, Screen } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, shadow, spacing, themed } from '@/design/tokens';
import { parseAvatar } from '@/domain/avatar';
import { THEMES } from '@/domain/theme';
import { useChildren } from '@/hooks/data';
import { config } from '@/services/config';
import { useSession } from '@/state/session';

const POINTS = [
  { icon: CalendarHeart, title: 'תיעוד מהיר', body: 'שינה, אוכל וחיתול בשתי לחיצות' },
  { icon: ChartColumn, title: 'השגרה שלכם', body: 'נלמדת מהיומן שלכם' },
  { icon: UsersRound, title: 'כל המשפחה', body: 'משתפים רק את מי שבוחרים' },
] as const;

const SKY = THEMES.rose.sky;
const AVATAR = parseAvatar(null);
/** The characters a family can choose from, as small faces under the arch. */
const FACES = [
  { clip: babyClips.girl.stand, crawl: false }, { clip: babyClips.boy.stand, crawl: false },
  ...[...babyLooks.girl.slice(0, 2), ...babyLooks.boy.slice(1, 3)].map((l) => ({ clip: l.clips.crawl, crawl: true })),
].flatMap((f) => (f.clip ? [{ poster: f.clip.poster, crawl: f.crawl }] : []));

export default function WelcomeScreen() {
  const user = useSession((s) => s.user);
  const children = useChildren();
  // The girl and the boy take turns in the arch.
  const { height } = useWindowDimensions();
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTurn((n) => n + 1), 9000);
    return () => clearInterval(t);
  }, []);
  // A sync that finishes while this screen is open may bring the family's children with it.
  if (children.data && children.data.length > 0) return <Redirect href="/(tabs)" />;
  const sex = turn % 2 === 0 ? 'female' : 'male';
  // A short screen gets a smaller arch, so the way in stays within reach.
  const k = height < 740 ? 0.74 : 1;
  return (
    <Screen scroll wash={false} edges={['top']} contentStyle={styles.content}>
      <LinearGradient colors={SKY} locations={[0, 0.5, 1]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.sky} pointerEvents="none" />

      <Rise index={0}>
        <View style={styles.top}>
          <Logo size={34} color={colors.ink} />
          <Text variant="display" center color={colors.ink} accessibilityRole="header" style={styles.headline}>{'היום של התינוק שלכם,\nרגוע וברור'}</Text>
          <Text center color={THEMES.rose.onSky}>מהלידה ועד גיל שלוש</Text>
        </View>
      </Rise>

      <Rise index={1}>
        <View style={styles.stage}>
          <View style={styles.archRing}>
            <View style={[styles.arch, { width: 248 * k, height: 262 * k }]}>
              <BabyFigure key={sex} active mood="happy" stage="stand" config={AVATAR} sex={sex} height={Math.round(248 * k)} label="הדמות של התינוק באפליקציה" />
            </View>
          </View>
          <View style={styles.lili}>
            <Float distance={5} duration={3600}><Mascot pose="wave" size={86} /></Float>
            <View style={styles.bubble}>
              <Text variant="caption" color={colors.primaryStrong} style={{ fontWeight: '700' }}>היי, אני לילי</Text>
              <Text variant="label" color={colors.ink}>אלווה אתכם צעד אחר צעד</Text>
            </View>
          </View>
        </View>
      </Rise>

      <View style={styles.sheet}>
        {FACES.length > 0 ? (
          <View style={styles.faces} accessible accessibilityLabel="תינוק או תינוקת, בדמות שתבחרו">
            <View style={styles.faceRow}>
              {FACES.map((c, i) => (
                <View key={i} style={[styles.face, i > 0 && { marginStart: -12 }]}><Image source={c.poster} style={[styles.faceImage, c.crawl && styles.faceCrawl]} resizeMode="cover" accessibilityIgnoresInvertColors /></View>
              ))}
            </View>
            <Text variant="label" color={colors.textSecondary} style={{ flex: 1 }}>תינוק או תינוקת, בדמות שתבחרו</Text>
          </View>
        ) : null}

        <View style={styles.points}>
          {POINTS.map(({ icon: Icon, title, body }) => (
            <View key={title} style={styles.point}>
              <View style={styles.pointIcon}><Icon size={20} color={colors.primaryStrong} strokeWidth={2} /></View>
              <Text variant="label" center color={colors.ink} style={{ fontWeight: '700' }}>{title}</Text>
              <Text variant="caption" center color={colors.textSecondary}>{body}</Text>
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
      </View>
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  content: { flexGrow: 1, paddingTop: spacing.lg, paddingBottom: 0, gap: spacing.md },
  sky: { position: 'absolute', top: -120, start: -spacing.xl, end: -spacing.xl, height: 760 },
  top: { alignItems: 'center', gap: spacing.xs },
  headline: { fontSize: 27, lineHeight: 34, marginTop: spacing.xs },
  stage: { alignItems: 'center' },
  archRing: { padding: 7, borderTopLeftRadius: 131, borderTopRightRadius: 131, borderBottomLeftRadius: 38, borderBottomRightRadius: 38, backgroundColor: 'rgba(255,255,255,0.55)' },
  arch: { width: 248, height: 262, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.background, borderTopLeftRadius: 124, borderTopRightRadius: 124, borderBottomLeftRadius: 31, borderBottomRightRadius: 31 },
  lili: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: -40, alignSelf: 'stretch', justifyContent: 'center' },
  bubble: { backgroundColor: colors.white, borderRadius: 22, borderBottomStartRadius: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, marginTop: 30, ...shadow.card },
  sheet: { flexGrow: 1, marginHorizontal: -spacing.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg, backgroundColor: '#FDFBFA', borderTopLeftRadius: 34, borderTopRightRadius: 34 },
  faces: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  faceRow: { flexDirection: 'row' },
  face: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: colors.white, backgroundColor: colors.background },
  faceImage: { position: 'absolute', width: 76, height: 82, left: -20, top: -6 },
  // A crawling baby's head is lower and to the side of the picture.
  faceCrawl: { left: -11, top: -17 },
  points: { flexDirection: 'row', gap: spacing.sm },
  point: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: colors.primaryLight, borderRadius: 22, paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  pointIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
}));
