import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from "react-native";
import { useAuth } from "@/src/contexts/AuthContext";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function NotificationsScreen() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

useFocusEffect(
  useCallback(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user])
);

  const loadNotifications = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/notifications/user/${user?.id}`
      );

      const data = await response.json();

      setNotifications(data);
    } catch (e) {
      console.log(e);
    }

    setLoading(false);
  };
  
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={notifications}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <Text style={styles.empty}>No Notifications</Text>
      }

  renderItem={({ item }) => (
  <Pressable
  style={styles.card}
  onPress={async () => {
  try {
    console.log("🔥 CLICKED:", item.id);

    const response = await fetch(
      `${BACKEND_URL}/api/notifications/${item.id}/read`,
      {
        method: "PUT",
      }
    );

    if (!response.ok) {
      console.log(
        "Failed to mark notification as read:",
        response.status
      );
      return;
    }

    console.log("✅ Notification marked as read");

    // Remove notification from the list
    setNotifications((currentNotifications) =>
      currentNotifications.filter(
        (notification) => notification.id !== item.id
      )
    );
  } catch (error) {
    console.log("Mark notification read error:", error);
  }
}}
>
    <Text style={styles.message}>{item.message}</Text>

    <Text style={styles.date}>
      {new Date(item.created_at).toLocaleString()}
    </Text>
  </Pressable>
)}
/>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 15,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },

  card: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    minHeight: 80,

    
  },

  message: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  date: {
    color: "#94a3b8",
    marginTop: 8,
    fontSize: 12,
  },

  empty: {
    textAlign: "center",
    color: "white",
    marginTop: 40,
    fontSize: 16,
  },
});