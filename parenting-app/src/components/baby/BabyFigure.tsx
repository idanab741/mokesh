import { View } from 'react-native';
import type { ChildSex } from '@/domain/age';
import type { AvatarConfig, BabyStage } from '@/domain/avatar';
import type { BabyMood } from '@/domain/mood';
import { BabyClip } from './BabyClip';
import { BabySprite } from './BabySprite';
import { type BabyClips, babyClips, babyLooks, fallbackClips } from './clips';

const ORDER: BabyStage[] = ['tummy', 'sit', 'crawl', 'stand'];

/**
 * The clips to show for a child: the boy or the girl in the child's pose. A pose that has no
 * clip yet takes the nearest pose that has one (a sitting-age baby crawls rather than lies down or stands).
 */
export function clipsFor(stage: BabyStage, sex: ChildSex, look = 'auto'): BabyClips | null {
  const who = sex === 'female' ? 'girl' : 'boy';
  const set = babyLooks[who].find((l) => l.key === look)?.clips ?? babyClips[who];
  const at = ORDER.indexOf(stage);
  const nearest = ORDER
    .filter((s) => set[s])
    .sort((a, b) => Math.abs(ORDER.indexOf(a) - at) - Math.abs(ORDER.indexOf(b) - at) || ORDER.indexOf(b) - ORDER.indexOf(a))[0];
  return (nearest ? set[nearest] : null) ?? fallbackClips[who];
}

/**
 * The child's baby character on the home screen: rendered video on the web build, and the
 * still pictures where video is not available (native).
 */
export function BabyFigure({ stage, config, sex = 'unspecified', height, label, mood, active }: {
  stage: BabyStage; config: AvatarConfig; sex?: ChildSex; height: number; label: string; mood: BabyMood; active: boolean;
}) {
  const clips = clipsFor(stage, sex, config.look);
  if (clips) {
    return <View style={{ height, alignItems: 'center', justifyContent: 'flex-end' }}><BabyClip key={clips.idle} clips={clips} height={Math.round(height * (clips.scale ?? 1))} label={label} active={active} /></View>;
  }
  return <BabySprite active={active} mood={mood} stage={stage} config={config} sex={sex} height={Math.round(height * 0.86)} label={label} />;
}
