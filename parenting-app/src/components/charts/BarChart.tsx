import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { colors, fonts, spacing } from '@/design/tokens';

export interface BarDatum {
  key: string;
  /** Short axis label (may be empty to thin out a dense axis). */
  axisLabel: string;
  /** Full label for the readout and for screen readers. */
  fullLabel: string;
  /** One value per series, bottom to top. */
  values: number[];
}

export interface BarSeries {
  label: string;
  color: string;
}

const BAR_MAX = 24;
const GAP = 2; // surface gap between stacked segments
const PAD = { top: 10, bottom: 24, axis: 34 };

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const unit = max / pow;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 4 ? 4 : unit <= 5 ? 5 : unit <= 8 ? 8 : 10;
  return nice * pow;
}

function topRounded(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x} ${y + h}V${y + rr}Q${x} ${y} ${x + rr} ${y}H${x + w - rr}Q${x + w} ${y} ${x + w} ${y + rr}V${y + h}Z`;
}

/**
 * Column chart, single or stacked series. Time runs left-to-right (oldest day on the left),
 * the convention parents already know from printed growth charts, also in a Hebrew UI.
 * Tap a column to read its exact value.
 */
export function BarChart({ data, series, formatValue, formatTick, height = 168, summaryLabel }: {
  data: BarDatum[];
  series: BarSeries[];
  formatValue: (value: number) => string;
  /** Axis tick formatter; defaults to formatValue. */
  formatTick?: (value: number) => string;
  height?: number;
  /** Sentence describing the whole chart for screen readers. */
  summaryLabel: string;
}) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const totals = data.map((d) => d.values.reduce((a, b) => a + b, 0));
  const max = niceMax(Math.max(0, ...totals));
  const plotW = Math.max(0, width - PAD.axis);
  const plotH = height - PAD.top - PAD.bottom;
  const slot = data.length > 0 ? plotW / data.length : 0;
  const barW = Math.max(3, Math.min(BAR_MAX, slot * 0.62));
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const tick = formatTick ?? formatValue;
  const active = data.find((d) => d.key === selected) ?? null;
  const activeTotal = active ? active.values.reduce((a, b) => a + b, 0) : 0;

  return (
    <View style={{ gap: spacing.sm }}>
      {series.length > 1 ? (
        <View style={{ flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' }}>
          {series.map((s) => (
            <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
              <Text variant="caption" color={colors.textSecondary}>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ minHeight: 20 }} accessibilityLiveRegion="polite">
        <Text variant="caption" color={active ? colors.textPrimary : colors.textSecondary}>
          {active
            ? `${active.fullLabel} · ${series.length > 1
                ? `${series.map((s, i) => `${s.label} ${formatValue(active.values[i] ?? 0)}`).join(' · ')}`
                : formatValue(activeTotal)}`
            : 'אפשר לגעת בעמודה כדי לראות את הערך המדויק'}
        </Text>
      </View>

      <View onLayout={onLayout} style={{ height, direction: 'ltr' }} accessible accessibilityRole="image" accessibilityLabel={summaryLabel}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {ticks.map((t) => (
              <G key={t}>
                <Line x1={PAD.axis} x2={width} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={1} />
                <SvgText x={PAD.axis - 6} y={y(t) + 4} fontSize={11} fontFamily={fonts.regular} fill={colors.textSecondary} textAnchor="end">
                  {tick(t)}
                </SvgText>
              </G>
            ))}
            {data.map((d, i) => {
              const cx = PAD.axis + slot * (i + 0.5);
              const x = cx - barW / 2;
              const total = totals[i];
              let acc = 0;
              const lastNonZero = d.values.reduce((last, v, idx) => (v > 0 ? idx : last), -1);
              return (
                <G key={d.key} opacity={selected && selected !== d.key ? 0.45 : 1}>
                  {d.values.map((v, si) => {
                    if (v <= 0) return null;
                    const yTop = y(acc + v);
                    const yBottom = y(acc);
                    acc += v;
                    const isTop = si === lastNonZero;
                    const h = Math.max(1.5, yBottom - yTop - (isTop ? 0 : GAP));
                    const top = yBottom - h;
                    return isTop
                      ? <Path key={si} d={topRounded(x, top, barW, h, 4)} fill={series[si]?.color ?? colors.primary} />
                      : <Rect key={si} x={x} y={top} width={barW} height={h} fill={series[si]?.color ?? colors.primary} />;
                  })}
                  {d.axisLabel ? (
                    <SvgText x={cx} y={height - 6} fontSize={11} fontFamily={selected === d.key ? fonts.semibold : fonts.regular}
                      fill={selected === d.key ? colors.textPrimary : colors.textSecondary} textAnchor="middle">
                      {d.axisLabel}
                    </SvgText>
                  ) : null}
                  {/* Hit target is the whole slot, far larger than the mark. */}
                  <Rect x={cx - slot / 2} y={0} width={slot} height={height} fill="transparent"
                    onPress={() => setSelected(selected === d.key ? null : d.key)}
                    accessibilityLabel={`${d.fullLabel}: ${formatValue(total)}`} />
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}
