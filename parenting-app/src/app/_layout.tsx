import { captureInviteFromUrl } from '@/services/family';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import { ToastHost } from '@/components/ui/overlays';
import { AccountPrompt } from '@/components/AccountPrompt';
import { trackPath } from '@/services/analytics';
import { usePathname } from 'expo-router';
import { colors, setAccent } from '@/design/tokens';
import { useAppTheme } from '@/hooks/data';
import { initAuth } from '@/state/auth';
import { ServicesProvider, useServices } from '@/state/services';

void SplashScreen.preventAutoHideAsync().catch(() => {});
// An invitation link carries its code in the address; keep it before anything navigates.
captureInviteFromUrl();

// Hebrew-first: the whole layout is right-to-left. On native this is also set at build
// time by the expo-localization config plugin (forcesRTL), so the very first launch is RTL.
if (Platform.OS === 'web') {
  if (typeof document !== 'undefined') {
    // The app's typeface. If it cannot be fetched, the system face from the font stack is used.
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&family=Amatic+SC:wght@700&display=swap';
    document.head.appendChild(font);
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'he');
  }
} else {
  I18nManager.allowRTL(true);
  if (!I18nManager.isRTL) I18nManager.forceRTL(true);
}

/** Counts which screen was opened (anonymous, see services/analytics). */
function ScreenCounter() {
  const path = usePathname();
  useEffect(() => { trackPath(path); }, [path]);
  return null;
}

function AuthBridge() {
  const { syncNow } = useServices();
  useEffect(() => initAuth(() => void syncNow()), [syncNow]);
  return null;
}

/** Sets the accent before anything below renders; a new colour world remounts the screens so every style picks it up. */
function Themed({ children }: { children: React.ReactNode }) {
  const theme = useAppTheme();
  setAccent({ key: theme.key, accent: theme.accent, accentSoft: theme.accentSoft, button: theme.button, ink: theme.ink });
  return <View key={theme.key} style={{ flex: 1 }}>{children}</View>;
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <ServicesProvider>
      <AuthBridge />
      <ScreenCounter />
      <StatusBar style="dark" />
      <Themed>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="activity/[type]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="child/edit" options={{ presentation: 'modal' }} />
      </Stack>
      </Themed>
      <AccountPrompt />
      <ToastHost />
    </ServicesProvider>
  );
}

