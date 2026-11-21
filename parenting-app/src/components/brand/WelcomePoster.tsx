import { Image } from 'react-native';
import { POSTER_ASPECT, POSTER_LABEL, POSTER_STILL } from './welcomePosterMeta';

/** All our characters together with Lili: a still picture here, a living clip on the web build. */
export function WelcomePoster({ height }: { height: number }) {
  return <Image source={POSTER_STILL} style={{ height, width: Math.round(height * POSTER_ASPECT) }} resizeMode="cover" accessibilityLabel={POSTER_LABEL} accessibilityIgnoresInvertColors />;
}
