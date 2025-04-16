import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AuthProvider } from "./context/AuthContext"
import { SupabaseProvider } from "./context/SupabaseContext"
import { NotificationProvider } from "./context/NotificationContext"
import * as TaskManager from "expo-task-manager"
import * as Notifications from "expo-notifications"
import { supabase } from "./lib/supabase"

// Screens
import LoginScreen from "./screens/LoginScreen"
import RegisterScreen from "./screens/RegisterScreen"
import HomeScreen from "./screens/HomeScreen"
import JournalEntryScreen from "./screens/JournalEntryScreen"
import HistoryScreen from "./screens/HistoryScreen"
import SettingsScreen from "./screens/SettingsScreen"
import ReminderScreen from "./screens/ReminderScreen"

const Stack = createNativeStackNavigator()

// Define the background task name
const NOTIFICATION_ACTION_TASK = "NOTIFICATION_ACTION_TASK"

// Register the background task for handling notification actions
TaskManager.defineTask(NOTIFICATION_ACTION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Error in notification action task:", error)
    return
  }

  const { actionId, reminderId, notificationResponse } = data

  try {
    // Handle different actions
    if (actionId === "complete") {
      // Mark reminder as completed in the database
      await supabase.from("reminders").update({ status: "completed" }).eq("id", reminderId)
      console.log(`Reminder ${reminderId} marked as completed`)
    } else if (actionId === "snooze") {
      // Get the reminder details
      const { data: reminderData, error: reminderError } = await supabase
        .from("reminders")
        .select("*")
        .eq("id", reminderId)
        .single()

      if (reminderError) throw reminderError

      if (reminderData) {
        // Schedule a new notification for 30 minutes later
        const snoozeTime = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now

        // Cancel the old notification if it exists
        if (reminderData.notification_id) {
          await Notifications.cancelScheduledNotificationAsync(reminderData.notification_id)
        }

        // Schedule a new notification
        const newNotificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: reminderData.title,
            body: `[Snoozed] ${reminderData.body}`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: { reminderId },
            categoryIdentifier: "reminder",
          },
          trigger: { date: snoozeTime },
        })

        // Update the reminder with the new notification ID and time
        await supabase
          .from("reminders")
          .update({
            notification_id: newNotificationId,
            time: snoozeTime.toISOString(),
          })
          .eq("id", reminderId)

        console.log(`Reminder ${reminderId} snoozed for 30 minutes`)
      }
    }
  } catch (error) {
    console.error("Error handling notification action:", error)
  }
})

export default function App() {
  return (
    <SafeAreaProvider>
      <SupabaseProvider>
        <AuthProvider>
          <NotificationProvider>
            <NavigationContainer>
              <Stack.Navigator initialRouteName="Login">
                <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
                <Stack.Screen
                  name="JournalEntry"
                  component={JournalEntryScreen}
                  options={{ title: "New Journal Entry" }}
                />
                <Stack.Screen name="History" component={HistoryScreen} options={{ title: "Journal History" }} />
                <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
                <Stack.Screen name="Reminder" component={ReminderScreen} options={{ title: "Set Reminder" }} />
              </Stack.Navigator>
            </NavigationContainer>
            <StatusBar style="auto" />
          </NotificationProvider>
        </AuthProvider>
      </SupabaseProvider>
    </SafeAreaProvider>
  )
}
