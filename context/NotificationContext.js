"use client"

import { createContext, useState, useEffect, useRef, useContext } from "react"
import * as Notifications from "expo-notifications"
import { Alert, Linking } from "react-native"
import { registerForPushNotificationsAsync } from "../lib/notifications"
import { SupabaseContext } from "./SupabaseContext"
import { isNotificationHandled, markNotificationAsHandled } from "../lib/notificationHelpers"

export const NotificationContext = createContext({})

export const NotificationProvider = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState("")
  const [notification, setNotification] = useState(false)
  const notificationListener = useRef()
  const responseListener = useRef()
  const { supabase } = useContext(SupabaseContext)

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then((token) => {
      setExpoPushToken(token || "")
    })

    // Set up notification categories
    setupNotificationCategories()

    // Listen for incoming notifications when the app is in the foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification)
    })

    // Listen for user interaction with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse)

    return () => {
      // Clean up listeners
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current)
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current)
      }
    }
  }, [])

  // Set up notification categories with actions
  const setupNotificationCategories = async () => {
    try {
      await Notifications.setNotificationCategoryAsync("reminder", [
        {
          identifier: "complete",
          buttonTitle: "Complete",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: "snooze",
          buttonTitle: "Snooze 30m",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ])
    } catch (error) {
      console.error("Error setting up notification categories:", error)
    }
  }

  // Handle notification responses (when user taps on a notification or action button)
  const handleNotificationResponse = async (response) => {
    const {
      notification: {
        request: { content, identifier: notificationId },
      },
      actionIdentifier,
    } = response

    // Get the reminder ID from the notification data
    const reminderId = content.data?.reminderId

    if (!reminderId) {
      console.log("No reminder ID found in notification")
      return
    }

    // Check if this notification has already been handled to prevent duplicates
    const alreadyHandled = await isNotificationHandled(notificationId)
    if (alreadyHandled) {
      console.log(`Notification ${notificationId} already handled, skipping`)
      return
    }

    try {
      // Handle different actions
      if (actionIdentifier === "complete" || actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // Mark reminder as completed in the database
        await supabase.from("reminders").update({ status: "completed" }).eq("id", reminderId)
        console.log(`Reminder ${reminderId} marked as completed`)
      } else if (actionIdentifier === "snooze") {
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

      // Mark this notification as handled
      await markNotificationAsHandled(notificationId)
    } catch (error) {
      console.error("Error handling notification action:", error)
    }
  }

  // Request permissions with improved handling
  const requestPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync()

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Notifications are required for reminders to work. Would you like to enable them in settings?",
          [
            {
              text: "No",
              style: "cancel",
            },
            {
              text: "Yes",
              onPress: () => Linking.openSettings(),
            },
          ],
        )
        return false
      }
    }

    return true
  }

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        requestPermissions,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotification = () => useContext(NotificationContext)
