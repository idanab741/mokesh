import { View } from 'react-native';
import type { ChildSex } from '@/domain/age';
import { type AvatarConfig, type BabyStage, outfitKey, resolveOutfit } from '@/domain/avatar';
import type { BabyMood } from '@/domain/mood';
import { BabyClip } from './BabyClip';
import { BabySprite } from './BabySprite';
import { babyClips } from './clips';

/** True when this character is shown as rendered video rather than still pictures. */
export function hasBabyClip(stage: BabyStage, config: AvatarConfig, sex: ChildSex, mood: BabyMood): boolean {
  const clips = babyClips[sex === 'female' ? 'girl' : 'boy'][stage];
  // The clips exist for the everyday mood and the teal outfit only, so far.
  return !!clips && mood === 'happy' && outfitKey(resolveOutfit(config, sex)) === 'teal';
}

/**
 * The child's baby character on the home screen: rendered video where a clip exists for the
 * character, pose, mood and outfit, and the still pictures everywhere else.
 */
export function BabyFigure({ stage, config, sex = 'unspecified', height, label, mood, active }: {
  stage: BabyStage; config: AvatarConfig; sex?: ChildSex; height: number; label: string; mood: BabyMood; active: boolean;
}) {
  if (hasBabyClip(stage, config, sex, mood)) {
    const clips = babyClips[sex === 'female' ? 'girl' : 'boy'][stage]!;
    return <View style={{ height, alignItems: 'center' }}><BabyClip clips={clips} height={height} label={label} active={active} /></View>;
  }
  return <BabySprite active={active} mood={mood} stage={stage} config={config} sex={sex} height={Math.round(height * 0.86)} label={label} />;
}
