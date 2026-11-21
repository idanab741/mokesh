import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

/**
 * A ring that fills as the time since the last one approaches the family's own usual gap.
 * `progress` is 0..1; null draws only the track (nothing learned yet).
 */
export function Ring({ size = 68, stroke = 6, progress, color, track, children }: {
  size?: number; stroke?: number; progress: number | null; color: string; track: string; children: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = progress === null ? 0 : Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="#FFFFFF" />
        {p > 0 ? <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} /> : null}
      </Svg>
      {/* Above the drawing: an absolutely placed layer would otherwise cover the icon. */}
      <View style={{ zIndex: 1 }}>{children}</View>
    </View>
  );
}
