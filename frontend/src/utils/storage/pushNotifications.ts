import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL;

export async function registerPushToken(userId: string) {
  try {
    console.log("================================");
    console.log("🔥 registerPushToken CALLED");
    console.log("🔥 USER ID:", userId);
    console.log("🔥 Device.isDevice:", Device.isDevice);
    console.log("🔥 BACKEND_URL:", BACKEND_URL);
    console.log("================================");

    // Push notifications need a real device
    if (!Device.isDevice) {
      console.log(
        "❌ Push notifications require a physical device."
      );
      return;
    }

    console.log("✅ Physical device detected");

    // Android notification channel
    if (Platform.OS === "android") {
      console.log("📱 Creating Android notification channel");

      await Notifications.setNotificationChannelAsync(
        "default",
        {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: "default",
        }
      );

      console.log("✅ Android notification channel created");
    }

    // Check permission
    console.log("🔐 Checking notification permission...");

    const permission =
      await Notifications.getPermissionsAsync();

    console.log(
      "🔐 Current permission:",
      permission.status
    );

    let status = permission.status;

    if (status !== "granted") {
      console.log("🔐 Requesting notification permission...");

      const requested =
        await Notifications.requestPermissionsAsync();

      status = requested.status;

      console.log(
        "🔐 Requested permission result:",
        status
      );
    }

    if (status !== "granted") {
      console.log(
        "❌ Push notification permission denied."
      );
      return;
    }

    console.log("✅ Notification permission granted");

    // Expo project ID
    console.log("🔎 Looking for Expo project ID...");

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    console.log("🔎 Expo project ID:", projectId);

    if (!projectId) {
      console.log(
        "❌ Expo project ID not found."
      );
      return;
    }

    console.log("✅ Expo project ID found");

    // Get Expo push token
    console.log("🎫 Requesting Expo push token...");

    const token =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    console.log("================================");
    console.log("🎉 EXPO PUSH TOKEN:", token.data);
    console.log("================================");

    // Save token using your backend
    const url =
      `${BACKEND_URL}/api/notifications/push-token`;

    console.log("📡 Saving push token...");
    console.log("📡 URL:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        expo_push_token: token.data,
      }),
    });

    const responseText =
      await response.text();

    console.log(
      "📡 PUSH TOKEN SAVE STATUS:",
      response.status
    );

    console.log(
      "📡 PUSH TOKEN SAVE RESPONSE:",
      responseText
    );

  } catch (error) {
    console.error(
      "❌ PUSH TOKEN ERROR:",
      error
    );
  }
}