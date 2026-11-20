import { useState } from 'react';
import { View } from 'react-native';
import type { ChildSex } from '@/domain/age';
import { type AvatarConfig, type BabyStage, outfitKey, resolveOutfit } from '@/domain/avatar';
import { BabyModel } from './BabyModel';
import { BabySprite } from './BabySprite';
import { babyModels } from './models';

/**
 * The child's baby character. Where a real 3D model exists it is shown (smooth 360° turn);
 * otherwise, and until the model has loaded, the rendered sprite views are used.
 */
export function BabyView({ stage, config, sex = 'unspecified', height = 250, label, active = true }: {
  stage: BabyStage; config: AvatarConfig; sex?: ChildSex; height?: number; label: string;
  /** Pass false while the screen is hidden so the turning stops. */
  active?: boolean;
}) {
  const model = babyModels[sex === 'female' ? 'girl' : 'boy'][stage];
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!model || failed) {
    return <BabySprite stage={stage} config={config} sex={sex} height={height} label={label} active={active} />;
  }
  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'flex-end' }}
      accessible accessibilityRole="image" accessibilityLabel={label} accessibilityHint="אפשר לגרור ימינה ושמאלה כדי לסובב">
      <View style={{ width: height, height }}>
        {ready ? null : <BabySprite stage={stage} config={config} sex={sex} height={height} label={label} autoRotate={false} active={false} />}
        <BabyModel model={model} outfit={outfitKey(resolveOutfit(config, sex))} size={height} active={active}
          onReady={() => setReady(true)} onError={() => setFailed(true)} />
      </View>
    </View>
  );
}
