import { View } from 'react-native';
import type { ChildSex } from '@/domain/age';
import { type AvatarConfig, type BabyStage, lookColors } from '@/domain/avatar';
import type { BabyMood } from '@/domain/mood';
import { BabyClip } from './BabyClip';
import { BabySprite } from './BabySprite';
import { type BabyClips, babyClips, fallbackClips } from './clips';

/**
 * The clips to show for a child. Until a character has clips of its own, it is shown with
 * the clips that exist (the standing boy), whatever the child's sex, pose, mood or outfit.
 */
export function clipsFor(stage: BabyStage, sex: ChildSex): BabyClips | null {
  return babyClips[sex === 'female' ? 'girl' : 'boy'][stage] ?? fallbackClips;
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
    return <View style={{ height, alignItems: 'center' }}><BabyClip clips={clips} height={height} label={label} active={active} look={lookColors(config)} /></View>;
  }
  return <BabySprite active={active} mood={mood} stage={stage} config={config} sex={sex} height={Math.round(height * 0.86)} label={label} />;
}
