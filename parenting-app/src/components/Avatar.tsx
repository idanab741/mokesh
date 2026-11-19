import { Image } from 'expo-image';
import { View } from 'react-native';
import { colors } from '@/design/tokens';
import { Text } from './ui/Text';

/** Child photo, or the first letter of the name when there is no photo. */
export function Avatar({ name, uri, size = 48 }: { name: string; uri: string | null; size?: number }) {
  const common = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={[common, { backgroundColor: colors.primaryLight }]} contentFit="cover" accessibilityLabel={`התמונה של ${name}`} />;
  }
  return (
    <View style={[common, { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.surface }]}
      accessibilityElementsHidden importantForAccessibility="no">
      <Text style={{ fontWeight: '700', fontSize: size * 0.42, lineHeight: size * 0.56 }} color={colors.primaryStrong}>
        {name.trim().charAt(0) || '?'}
      </Text>
    </View>
  );
}
