import { acceptPendingInvite } from '@/services/family';
import { router } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { TextField } from '@/components/ui/inputs';
import { Button, EmptyState, Notice } from '@/components/ui/primitives';
import { SheetCard, SkyScreen } from '@/components/ui/SkyScreen';
import { THEMES } from '@/domain/theme';
import { signIn, signUp } from '@/state/auth';
import { track } from '@/services/analytics';
import { useServices } from '@/state/services';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const isSignUp = mode === 'sign-up';
  const { syncNow, syncAfterJoin } = useServices();

  const submit = async () => {
    if (!EMAIL.test(email.trim())) return setError('כתובת האימייל אינה תקינה.');
    if (password.length < 8) return setError('הסיסמה צריכה להכיל לפחות 8 תווים.');
    setError(null);
    setBusy(true);
    const result = isSignUp ? await signUp(email, password, name) : await signIn(email, password);
    if (result.ok) track(isSignUp ? 'signup_done' : 'signin_done');
    if (!result.ok) {
      setBusy(false);
      return setError(result.message);
    }
    if (result.needsEmailConfirmation) {
      setBusy(false);
      return setSent(true);
    }
    // On a new device the family's data lives on the server: fetch it before deciding where to go,
    // otherwise an existing family would be sent through onboarding again.
    // Someone who came through an invitation joins that family before the first sync, so its children arrive with it.
    const invite = await acceptPendingInvite().catch(() => 'none');
    if (invite === 'joined') await syncAfterJoin(); else await syncNow();
    setBusy(false);
    router.replace('/');
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/welcome'));
  // The same rose sky as the welcome page, whatever was open before.
  const sky = THEMES.rose.sky;

  if (sent) {
    return (
      <SkyScreen title="כמעט שם" onBack={() => router.replace('/auth/sign-in')} mascot="heart" sky={sky}>
        <SheetCard>
          <EmptyState icon={MailCheck} title="שלחנו אליך אימייל לאישור"
            body={`נשלח קישור אל ${email.trim()}. אחרי האישור אפשר להיכנס עם האימייל והסיסמה.`}
            actionLabel="למסך הכניסה" onAction={() => router.replace('/auth/sign-in')} />
        </SheetCard>
      </SkyScreen>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <SkyScreen title={isSignUp ? 'יצירת חשבון' : 'כניסה'} onBack={back} mascot="wave" sky={sky}
        subtitle={isSignUp ? 'חשבון מאפשר גיבוי, סנכרון בין מכשירים ושיתוף עם בן/בת הזוג.' : 'טוב לראות אותך שוב.'}>
        <SheetCard>
          {isSignUp ? <TextField label="השם שלך" value={name} onChangeText={setName} autoComplete="name" textContentType="name" maxLength={80} /> : null}
          <TextField label="אימייל" value={email} onChangeText={setEmail} keyboardType="email-address" inputMode="email" autoCapitalize="none"
            autoCorrect={false} autoComplete="email" textContentType="emailAddress" style={{ textAlign: 'left', writingDirection: 'ltr' }} />
          <TextField label="סיסמה" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none"
            autoComplete={isSignUp ? 'new-password' : 'current-password'} textContentType={isSignUp ? 'newPassword' : 'password'}
            hint={isSignUp ? 'לפחות 8 תווים' : undefined} style={{ textAlign: 'left', writingDirection: 'ltr' }} onSubmitEditing={() => void submit()} />
        </SheetCard>
        {error ? <Notice tone="danger" text={error} /> : null}
        <Button label={isSignUp ? 'יצירת חשבון' : 'כניסה'} onPress={() => void submit()} loading={busy} />
        <Button variant="ghost" size="md" label={isSignUp ? 'כבר יש לי חשבון' : 'אין לי חשבון עדיין'}
          onPress={() => router.replace(isSignUp ? '/auth/sign-in' : '/auth/sign-up')} />
      </SkyScreen>
    </KeyboardAvoidingView>
  );
}
