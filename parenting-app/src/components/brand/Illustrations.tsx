import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { activityTones } from '@/design/tokens';

export type DayPart = 'morning' | 'noon' | 'evening' | 'night';

export function dayPartForHour(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'noon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export const skyThemes: Record<DayPart, { from: string; to: string; ink: string; sub: string }> = {
  morning: { from: '#FFE2B8', to: '#FFC2CF', ink: '#3A2030', sub: '#6B4455' },
  noon: { from: '#BFE6FF', to: '#E4F4FF', ink: '#12314A', sub: '#3F5F78' },
  evening: { from: '#FF9E8C', to: '#8E6BE0', ink: '#FFFFFF', sub: '#FFF1F4' },
  night: { from: '#242357', to: '#5A4FC4', ink: '#FFFFFF', sub: '#DAD7FF' },
};

const Cloud = ({ x, y, s = 1, o = 0.9 }: { x: number; y: number; s?: number; o?: number }) => (
  <G transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
    <Ellipse cx="18" cy="14" rx="18" ry="9" fill="#FFFFFF" />
    <Circle cx="13" cy="9" r="8" fill="#FFFFFF" />
    <Circle cx="24" cy="7" r="10" fill="#FFFFFF" />
  </G>
);
const Star = ({ x, y, r = 1.6, o = 1 }: { x: number; y: number; r?: number; o?: number }) => <Circle cx={x} cy={y} r={r} fill="#FFF3C4" opacity={o} />;

/** Sky scene behind the Home header. Purely decorative; it follows the real clock. */
export function SkyScene({ part, width, height }: { part: DayPart; width: number; height: number }) {
  const t = skyThemes[part];
  return (
    <Svg width={width} height={height} viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" accessibilityElementsHidden>
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={t.from} />
          <Stop offset="1" stopColor={t.to} />
        </LinearGradient>
      </Defs>
      <Rect width="360" height="200" fill="url(#sky)" />
      {part === 'morning' ? (
        <>
          <Circle cx="128" cy="70" r="50" fill="#FFF4D6" opacity={0.6} />
          <Circle cx="128" cy="70" r="30" fill="#FFD166" />
          <Cloud x={84} y={78} s={1.3} />
          <Cloud x={18} y={96} s={0.9} o={0.75} />
        </>
      ) : null}
      {part === 'noon' ? (
        <>
          <Circle cx="128" cy="58" r="46" fill="#FFF6CF" opacity={0.75} />
          <Circle cx="128" cy="58" r="28" fill="#FFD23F" />
          <Cloud x={92} y={70} s={1.3} />
          <Cloud x={16} y={92} s={0.9} o={0.85} />
        </>
      ) : null}
      {part === 'evening' ? (
        <>
          <Circle cx="128" cy="74" r="50" fill="#FFE0A3" opacity={0.4} />
          <Circle cx="128" cy="74" r="30" fill="#FFD27A" />
          <Cloud x={88} y={84} s={1.3} o={0.55} />
          <Cloud x={14} y={100} s={0.9} o={0.3} />
          <Star x={186} y={30} o={0.8} />
          <Star x={70} y={24} r={1.2} o={0.6} />
        </>
      ) : null}
      {part === 'night' ? (
        <>
          <Circle cx="124" cy="64" r="48" fill="#8F86F2" opacity={0.35} />
          <Path d="M140 34a32 32 0 1 0 13 53a25 25 0 0 1-13-53z" fill="#FFF3C4" />
          <Star x={30} y={30} /><Star x={140} y={26} r={2} /><Star x={118} y={104} r={1.3} o={0.7} />
          <Star x={24} y={120} r={1.2} o={0.6} /><Star x={170} y={70} r={1.2} o={0.7} /><Star x={56} y={150} r={1.8} o={0.8} />
          <Cloud x={6} y={150} s={1.5} o={0.12} />
        </>
      ) : null}
    </Svg>
  );
}

/** A nursery mobile: the app's illustration for welcome and empty states. */
export function MobileIllustration({ size = 200 }: { size?: number }) {
  const rose = activityTones.bottle.solid, indigo = activityTones.sleep.solid, teal = activityTones.diaper.solid, amber = activityTones.solids.solid;
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 200 160" accessibilityElementsHidden>
      <Circle cx="100" cy="84" r="72" fill="#FFE8EF" />
      <Circle cx="150" cy="40" r="20" fill="#ECEAFF" />
      <Circle cx="42" cy="124" r="14" fill="#DDF6F0" />
      <Path d="M100 10v14" stroke="#B9B2BD" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M40 40q60-30 120 0" stroke="#8E8896" strokeWidth="3" strokeLinecap="round" fill="none" />
      <Path d="M48 37v38M82 27v62M118 27v40M152 37v56" stroke="#B9B2BD" strokeWidth="1.8" strokeLinecap="round" />
      {/* moon */}
      <Path d="M56 76a16 16 0 1 0 7 26a13 13 0 0 1-7-26z" fill={indigo} />
      {/* star */}
      <Path d="M82 88l4.2 8.6 9.5 1.4-6.9 6.7 1.6 9.4L82 109.6l-8.4 4.5 1.6-9.4-6.9-6.7 9.5-1.4z" fill={amber} />
      {/* heart */}
      <Path d="M118 86c-5-9-18-4-15 6 2 6 9 10 15 15 6-5 13-9 15-15 3-10-10-15-15-6z" fill={rose} />
      {/* cloud */}
      <G transform="translate(132 92)">
        <Ellipse cx="20" cy="15" rx="20" ry="9" fill={teal} />
        <Circle cx="14" cy="10" r="9" fill={teal} />
        <Circle cx="26" cy="8" r="11" fill={teal} />
      </G>
    </Svg>
  );
}
