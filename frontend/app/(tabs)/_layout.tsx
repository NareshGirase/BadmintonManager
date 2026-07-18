import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Android with edge-to-edge sometimes reports 0 inset even with nav bar visible.
  const androidMin = Platform.OS === 'android' ? 30 : 15;
  const bottomInset = Math.max(insets.bottom, androidMin);

  return (
    <View style={{ flex: 1, paddingBottom: bottomInset, backgroundColor: '#1e293b' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#10b981',
          tabBarInactiveTintColor: '#6b7280',
          tabBarStyle: {
            backgroundColor: '#1e293b',
            borderTopColor: '#334155',
            borderTopWidth: 1,
            height: 65,
            paddingBottom: 6,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="sessions"
          options={{
            title: 'Sessions',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="players"
          options={{
            title: 'Players',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
