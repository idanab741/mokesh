import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, spacing, svgFontFamily } from '@/design/tokens';
import type { ActivityEvent } from '@/domain/activity';
import { DAY, overlapMs, startOfDay } from '@/lib/time';

const TRACK_Y = 18;
const TRACK_H = 30;

/**
 * "Today at a glance": the 24 hours of the day as one strip. Sleep is drawn as blocks, feedings,
 * diapers and solids as dots, all at their real times. Nothing is drawn that was not logged.
 */
export function DayStrip({ events, now }: { events: readonly ActivityEvent[]; now: Date }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const dayStart = startOfDay(now).getTime();
  const x = (t: number) => ((t - dayStart) / DAY) * width;
  const live = events.filter((e) => e.deletedAt === null);

  const sleeps = live.filter((e) => e.type === 'sleep').map((e) => {
    const start = Date.parse(e.startedAt ?? e.occurredAt);
    const end = e.endedAt ? Date.parse(e.endedAt) : now.getTime();
    return { id: e.id, start: Math.max(start, dayStart), end: Math.min(end, dayStart + DAY), ms: overlapMs(start, end, dayStart, dayStart + DAY) };
  }).filter((s) => s.ms > 0);
  const dots = live.filter((e) => e.type !== 'sleep' && e.type !== 'other').map((e) => ({ id: e.id, t: Date.parse(e.occurredAt), type: e.type }))
    .filter((d) => d.t >= dayStart && d.t < dayStart + DAY);

  const legend = [
    { label: 'שינה', color: activityTones.sleep.solid, n: sleeps.length },
    { label: 'האכלה', color: activityTones.bottle.solid, n: dots.filter((d) => d.type === 'bottle' || d.type === 'nursing').length },
    { label: 'חיתול', color: activityTones.diaper.solid, n: dots.filter((d) => d.type === 'diaper').length },
    { label: 'מוצקים', color: activityTones.solids.solid, n: dots.filter((d) => d.type === 'solids').length },
  ];
  const summary = `היום במבט: ${legend.map((l) => `${l.label} ${l.n}`).join(', ')}`;

  return (
    <View style={{ gap: spacing.sm }}>
      {/* A timeline always reads left-to-right, also in a Hebrew layout. */}
      <View onLayout={onLayout} style={{ height: 72, direction: 'ltr' }} accessible accessibilityRole="image" accessibilityLabel={summary}>
        {width > 0 ? (
          <Svg width={width} height={72}>
            <Rect x={0} y={TRACK_Y} width={width} height={TRACK_H} rx={TRACK_H / 2} fill={colors.surfaceMuted} />
            {sleeps.map((s) => (
              <Rect key={s.id} x={x(s.start)} y={TRACK_Y} width={Math.max(4, x(s.end) - x(s.start))} height={TRACK_H} rx={8} fill={activityTones.sleep.solid} />
            ))}
            {dots.map((d) => (
              <Circle key={d.id} cx={Math.min(width - 7, Math.max(7, x(d.t)))} cy={TRACK_Y + TRACK_H / 2} r={6}
                fill={activityTones[d.type].solid} stroke={colors.surface} strokeWidth={2} />
            ))}
            <Line x1={x(now.getTime())} x2={x(now.getTime())} y1={TRACK_Y - 8} y2={TRACK_Y + TRACK_H + 8} stroke={colors.textPrimary} strokeWidth={2} strokeLinecap="round" />
            <Circle cx={x(now.getTime())} cy={TRACK_Y - 8} r={3.5} fill={colors.textPrimary} />
            {[0, 6, 12, 18, 24].map((h) => (
              <SvgText key={h} x={h === 0 ? 2 : h === 24 ? width - 2 : (h / 24) * width} y={68} fontSize={11} fontFamily={svgFontFamily}
                fill={colors.textSecondary} textAnchor={h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}>
                {`${String(h).padStart(2, '0')}:00`}
              </SvgText>
            ))}
          </Svg>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {legend.map((l) => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.color }} />
            <Text variant="caption" color={colors.textSecondary}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
