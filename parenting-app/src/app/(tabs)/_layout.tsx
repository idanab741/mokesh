import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { AddActivitySheet } from '@/components/AddActivitySheet';
import { ChildSwitcherSheet } from '@/components/ChildSwitcherSheet';
import { TabBar } from '@/components/TabBar';
import { colors } from '@/design/tokens';
import { useChildren } from '@/hooks/data';

export default function TabsLayout() {
  const children = useChildren();
  // Every tab is about a child; without one there is nothing truthful to show.
  if (children.data && children.data.length === 0) return <Redirect href="/welcome" />;
  return (
    <>
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="journal" />
        <Tabs.Screen name="stats" />
        <Tabs.Screen name="child" />
      </Tabs>
      <AddActivitySheet />
      <ChildSwitcherSheet />
    </>
  );
}
