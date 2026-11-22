import * as ImagePicker from 'expo-image-picker';

export interface PickedPhoto { data: string; thumb: string | null }

/**
 * A picture from the phone's library as a JPEG data URL. On the phone the library hands it over
 * already compressed; a separate small preview is made on the web build only.
 */
export async function pickPhoto(): Promise<PickedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset?.base64) return null;
  return { data: `data:image/jpeg;base64,${asset.base64}`, thumb: null };
}
