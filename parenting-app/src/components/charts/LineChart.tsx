import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors, svgFontFamily } from '@/design/tokens';

export interface LinePoint {
  /** Milliseconds since epoch. */
  t: number;
  value: number;
  label: string;
}

/** Simple time series for the family's own measurements. No reference curves are drawn. */
export function LineChart({ points, color, formatValue, summaryLabel, height = 180 }: {
  points: LinePoint[];
  color: string;
  formatValue: (v: number) => string;
  summaryLabel: string;
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const pad = { top: 14, bottom: 26, axis: 46, edge: 10 };
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, max * 0.1);
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;
  const t0 = points[0]?.t ?? 0;
  const t1 = points[points.length - 1]?.t ?? 1;
  const plotW = Math.max(0, width - pad.axis - pad.edge * 2);
  const plotH = height - pad.top - pad.bottom;
  // Time runs left-to-right, as on printed growth charts.
  const x = (t: number) => pad.axis + pad.edge + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * plotW;
  const y = (v: number) => pad.top + plotH - ((v - lo) / (hi - lo)) * plotH;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)} ${y(p.value).toFixed(1)}`).join('');
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <View onLayout={onLayout} style={{ height, direction: 'ltr' }} accessible accessibilityRole="image" accessibilityLabel={summaryLabel}>
      {width > 0 && points.length > 0 ? (
        <Svg width={width} height={height}>
          {[min, max].filter((v, i, arr) => arr.indexOf(v) === i).map((v) => (
            <G key={v}>
              <Line x1={pad.axis} x2={width} y1={y(v)} y2={y(v)} stroke={colors.border} strokeWidth={1} />
              <SvgText x={pad.axis - 8} y={y(v) + 4} fontSize={11} fontFamily={svgFontFamily} fill={colors.textSecondary} textAnchor="end">{formatValue(v)}</SvgText>
            </G>
          ))}
          <Path d={path} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p) => <Circle key={p.t} cx={x(p.t)} cy={y(p.value)} r={5} fill={color} stroke={colors.surface} strokeWidth={2} />)}
          {first ? <SvgText x={x(first.t)} y={height - 6} fontSize={11} fontFamily={svgFontFamily} fill={colors.textSecondary} textAnchor="start">{first.label}</SvgText> : null}
          {last && last !== first ? <SvgText x={x(last.t)} y={height - 6} fontSize={11} fontFamily={svgFontFamily} fill={colors.textSecondary} textAnchor="end">{last.label}</SvgText> : null}
        </Svg>
      ) : null}
    </View>
  );
}
