import {
  Droplet, Heart, Moon, NotebookPen, Soup,
  type LucideIcon,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import type { ActivityType } from '@/domain/activity';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Drawn to match the lucide set (24px grid, round caps) because lucide has no baby bottle or diaper. */
export function BottleIcon({ size = 24, color = '#000', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10.5 2.5h3v2l1.5 1.5v1.5h-6V6L10.5 4.5z" />
      <Path d="M8.5 7.5h7a1.5 1.5 0 0 1 1.5 1.5v10.5a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a1.5 1.5 0 0 1 1.5-1.5z" />
      <Path d="M7 12.5h3M7 16h3" />
    </Svg>
  );
}

export function DiaperIcon({ size = 24, color = '#000', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6.5h18v3.5a9 9 0 0 1-18 0z" />
      <Path d="M3 10c3 .2 5 2.2 5.6 6.3M21 10c-3 .2-5 2.2-5.6 6.3" />
    </Svg>
  );
}

const lucide =
  (Icon: LucideIcon) =>
  ({ size = 24, color = '#000', strokeWidth = 1.75 }: IconProps) => <Icon size={size} color={color} strokeWidth={strokeWidth} />;

export const activityIcons: Record<ActivityType, (props: IconProps) => React.JSX.Element> = {
  bottle: BottleIcon,
  nursing: lucide(Heart),
  pumping: lucide(Droplet),
  sleep: lucide(Moon),
  diaper: DiaperIcon,
  solids: lucide(Soup),
  other: lucide(NotebookPen),
};
