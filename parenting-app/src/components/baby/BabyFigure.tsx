import { View } from 'react-native';
import type { ChildSex } from '@/domain/age';
import type { AvatarConfig, BabyStage } from '@/domain/avatar';
import type { BabyMood } from '@/domain/mood';
import { BabyClip } from './BabyClip';
import { BabySprite } from './BabySprite';
import { type BabyClips, babyClips, fallbackClips } from './clips';

const ORDER: BabyStage[] = ['tummy', 'sit', 'crawl', 'stand'];

/**
 * The clips to show for a child: the boy or the girl in the child's pose. A pose that has no
 * clip yet takes the nearest pose that has one (a sitting-age baby crawls rather than stands).
 */
export function clipsFor(stage: BabyStage, sex: ChildSex): BabyClips | null {
  const who = sex === 'female' ? 'girl' : 'boy';
  const at = ORDER.indexOf(stage);
  const nearest = ORDER
    .filter((s) => babyClips[who][s])
    .sort((a, b) => Math.abs(ORDER.indexOf(a) - at) - Math.abs(ORDER.indexOf(b) - at) || ORDER.indexOf(a) - ORDER.indexOf(b))[0];
  return (nearest ? babyClips[who][nearest] : null) ?? fallbackClips[who];
}

/**
 * The child's baby character on the home screen: rendered video on the web build, and the
 * still pictures where video is not available (native).
 */
export function BabyFigure({ stage, config, sex = 'unspecified', height, label, mood, active }: {
  stage: BabyStage; config: AvatarConfig; sex?: ChildSex; height: number; label: string; mood: BabyMood; active: boolean;
}) {
  const clips = clipsFor(stage, sex);
  if (clips) {
    return <View style={{ height, alignItems: 'center' }}><BabyClip clips={clips} height={height} label={label} active={active} /></View>;
  }
  return <BabySprite active={active} mood={mood} stage={stage} config={config} sex={sex} height={Math.round(height * 0.86)} label={label} />;
}
