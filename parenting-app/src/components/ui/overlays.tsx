import { Check, CircleAlert, X } from 'lucide-react-native';
import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { colors, radius, shadow, spacing } from '@/design/tokens';
import { Button, IconButton } from './primitives';
import { Text } from './Text';

/* ---------- Bottom sheet ---------- */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [visible, progress]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sheetRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="סגירה" accessibilityRole="button" />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg), maxHeight: height * 0.88 },
            { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [360, 0] }) }] },
          ]}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>{title}</Text>
            <IconButton icon={X} label="סגירה" onPress={onClose} tone="surface" size={40} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.sm }}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ---------- Confirm dialog ---------- */
export function ConfirmDialog({ visible, title, body, confirmLabel, cancelLabel = 'ביטול', destructive, loading, onConfirm, onCancel }: {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.dialogRoot}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={onCancel} accessibilityLabel={cancelLabel} />
        <View style={styles.dialog} accessibilityViewIsModal accessibilityRole="alert">
          <Text variant="heading" center>{title}</Text>
          {body ? <Text variant="body" color={colors.textSecondary} center>{body}</Text> : null}
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Button label={confirmLabel} onPress={onConfirm} variant={destructive ? 'danger' : 'primary'} loading={loading} size="md" />
            <Button label={cancelLabel} onPress={onCancel} variant="ghost" size="md" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Toasts ---------- */
interface ToastState {
  toast: { id: number; message: string; tone: 'success' | 'error'; actionLabel?: string; onAction?: () => void } | null;
  show: (message: string, options?: { tone?: 'success' | 'error'; actionLabel?: string; onAction?: () => void }) => void;
  hide: () => void;
}
let toastSeq = 0;
export const useToast = create<ToastState>((set) => ({
  toast: null,
  show: (message, options) => set({ toast: { id: (toastSeq += 1), message, tone: options?.tone ?? 'success', actionLabel: options?.actionLabel, onAction: options?.onAction } }),
  hide: () => set({ toast: null }),
}));

export function ToastHost() {
  const { toast, hide } = useToast();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    const timer = setTimeout(hide, toast.actionLabel ? 5000 : 2600);
    return () => clearTimeout(timer);
  }, [toast, hide, opacity]);

  if (!toast) return null;
  const Icon = toast.tone === 'error' ? CircleAlert : Check;
  return (
    <Animated.View pointerEvents="box-none" style={[styles.toastWrap, { bottom: insets.bottom + 104, opacity }]}>
      <View style={[styles.toast, toast.tone === 'error' && { backgroundColor: colors.danger }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Icon size={18} color={colors.white} strokeWidth={2.2} />
        <Text variant="label" color={colors.white} style={{ flexShrink: 1 }}>{toast.message}</Text>
        {toast.actionLabel ? (
          <Pressable onPress={() => { toast.onAction?.(); hide(); }} accessibilityRole="button" hitSlop={12} style={styles.toastAction}>
            <Text variant="label" color={colors.white} style={{ fontWeight: '700', textDecorationLine: 'underline' }}>{toast.actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: spacing.md },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  dialogRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  dialog: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xxl, gap: spacing.sm, ...shadow.floating },
  toastWrap: { position: 'absolute', start: 0, end: 0, alignItems: 'center', paddingHorizontal: spacing.xl },
  toast: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.textPrimary, borderRadius: radius.pill, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, maxWidth: 480, ...shadow.floating },
  toastAction: { marginStart: spacing.sm },
});
