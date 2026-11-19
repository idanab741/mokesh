import { router } from 'expo-router';
import { ChevronRight, MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { TextField } from '@/components/ui/inputs';
import { Button, EmptyState, IconButton, Notice, Screen } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/design/tokens';
import { signIn, signUp } from '@/state/auth';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const isSignUp = mode === 'sign-up';

  const submit = async () => {
    if (!EMAIL.test(email.trim())) return setError('כתובת האימייל אינה תקינה.');
    if (password.length < 8) return setError('הסיסמה צריכה להכיל לפחות 8 תווים.');
    setError(null);
    setBusy(true);
    const result = isSignUp ? await signUp(email, password, name) : await signIn(email, password);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    if (result.needsEmailConfirmation) return setSent(true);
    router.replace('/');
  };

  if (sent) {
    return (
      <Screen edges={['top', 'bottom']} contentStyle={{ justifyContent: 'center', padding: spacing.xl }}>
        <EmptyState icon={MailCheck} title="שלחנו אליך אימייל לאישור"
          body={`נשלח קישור אל ${email.trim()}. אחרי האישור אפשר להיכנס עם האימייל והסיסמה.`}
          actionLabel="למסך הכניסה" onAction={() => router.replace('/auth/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: spacing.xl, paddingTop: spacing.md }}>
        <IconButton icon={ChevronRight} label="חזרה" tone="surface" onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} />
        <View style={{ gap: spacing.xs }}>
          <Text variant="display" accessibilityRole="header">{isSignUp ? 'יצירת חשבון' : 'כניסה'}</Text>
          <Text color={colors.textSecondary}>{isSignUp ? 'חשבון מאפשר גיבוי, סנכרון בין מכשירים ושיתוף עם בן/בת הזוג.' : 'טוב לראות אותך שוב.'}</Text>
        </View>
        {isSignUp ? <TextField label="השם שלך" value={name} onChangeText={setName} autoComplete="name" textContentType="name" maxLength={80} /> : null}
        <TextField label="אימייל" value={email} onChangeText={setEmail} keyboardType="email-address" inputMode="email" autoCapitalize="none"
          autoCorrect={false} autoComplete="email" textContentType="emailAddress" style={{ textAlign: 'left', writingDirection: 'ltr' }} />
        <TextField label="סיסמה" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none"
          autoComplete={isSignUp ? 'new-password' : 'current-password'} textContentType={isSignUp ? 'newPassword' : 'password'}
          hint={isSignUp ? 'לפחות 8 תווים' : undefined} style={{ textAlign: 'left', writingDirection: 'ltr' }} onSubmitEditing={() => void submit()} />
        {error ? <Notice tone="danger" text={error} /> : null}
        <Button label={isSignUp ? 'יצירת חשבון' : 'כניסה'} onPress={() => void submit()} loading={busy} />
        <Button variant="ghost" size="md" label={isSignUp ? 'כבר יש לי חשבון' : 'אין לי חשבון עדיין'}
          onPress={() => router.replace(isSignUp ? '/auth/sign-in' : '/auth/sign-up')} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
