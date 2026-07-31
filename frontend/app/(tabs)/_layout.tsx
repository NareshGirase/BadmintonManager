import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [notificationCount, setNotificationCount] = useState(0);

useFocusEffect(
  useCallback(() => {

    if (!user?.id) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/notifications/user/${user.id}`
        );

        const data = await response.json();

        const unread = data.filter(
          (notification: any) => !notification.read
        );

        setNotificationCount(unread.length);

      } catch (error) {
        console.log("Notification error:", error);
      }
    };

    fetchNotifications();

  }, [user])
);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          minHeight: 65 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 4,
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
  name="notifications"
  options={{
    title: "Notifications",

    tabBarBadge:
      notificationCount > 0
        ? notificationCount
        : undefined,

    tabBarIcon: ({ color, size }) => (
      <Ionicons
        name="notifications"
        size={size}
        color={color}
      />
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
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Sessions',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
