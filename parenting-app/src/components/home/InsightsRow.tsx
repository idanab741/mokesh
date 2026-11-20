import { ScrollView, StyleSheet, View } from 'react-native';
import { activityIcons } from '@/components/ui/Icons';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, radius, spacing } from '@/design/tokens';
import type { Insight } from '@/domain/insights';

/** Swipeable cards with observations from the family's own data. */
export function InsightsRow({ insights, daysMissing }: { insights: Insight[]; daysMissing: number }) {
  if (insights.length === 0) {
    return (
      <View style={[styles.card, styles.placeholder]}>
        <Text variant="bodyStrong">התובנות בדרך</Text>
        <Text variant="caption" color={colors.textSecondary}>
          {daysMissing > 0
            ? `אחרי עוד ${daysMissing === 1 ? 'יום אחד' : `${daysMissing} ימים`} של תיעוד נוכל להראות כאן דפוסים: מרווחים בין האכלות, שינה לעומת הממוצע שלכם ועוד.`
            : 'כשיצטבר מעט יותר תיעוד יופיעו כאן דפוסים מהשגרה שלכם.'}
        </Text>
      </View>
    );
  }
  return (
    // Negative margin lets the cards scroll edge to edge inside the padded screen.
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.xl }}
      contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
      {insights.map((insight) => {
        const tone = activityTones[insight.tone];
        const Icon = activityIcons[insight.tone];
        return (
          <View key={insight.id} style={[styles.card, { backgroundColor: tone.bg }]} accessible
            accessibilityLabel={`${insight.title}. ${insight.body} ${insight.basis}`}>
            <View style={styles.icon}><Icon size={20} color={tone.ink} /></View>
            <Text variant="bodyStrong" numberOfLines={3}>{insight.title}</Text>
            <Text variant="label" color={colors.textPrimary} numberOfLines={3}>{insight.body}</Text>
            <View style={{ flex: 1 }} />
            <Text variant="caption" color={tone.ink} numberOfLines={2}>{insight.basis}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { width: 250, minHeight: 176, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  placeholder: { width: 'auto', minHeight: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
});
