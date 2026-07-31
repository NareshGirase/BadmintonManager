import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
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
const markAsRead = async (notificationId: string) => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/notifications/${notificationId}/read`,
      {
        method: "PUT",
      }
    );

    console.log("Mark read status:", response.status);

    if (response.ok) {
      await loadNotifications();
    }

  } catch (error) {
    console.log("Mark read error:", error);
  }
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
  <TouchableOpacity
    style={styles.card}
    activeOpacity={0.7}
    onPress={() => {
      console.log("Pressed notification:", item.id);
      markAsRead(item.id);
    }}
  >
    <Text style={styles.message}>{item.message}</Text>

    <Text style={styles.date}>
      {new Date(item.created_at).toLocaleString()}
    </Text>
  </TouchableOpacity>
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