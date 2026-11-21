import { captureInviteFromUrl } from '@/services/family';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import { ToastHost } from '@/components/ui/overlays';
import { colors } from '@/design/tokens';
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
    font.href = 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap';
    document.head.appendChild(font);
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'he');
  }
} else {
  I18nManager.allowRTL(true);
  if (!I18nManager.isRTL) I18nManager.forceRTL(true);
}

function AuthBridge() {
  const { syncNow } = useServices();
  useEffect(() => initAuth(() => void syncNow()), [syncNow]);
  return null;
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <ServicesProvider>
      <AuthBridge />
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="activity/[type]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="child/edit" options={{ presentation: 'modal' }} />
      </Stack>
      <ToastHost />
    </ServicesProvider>
  );
}

