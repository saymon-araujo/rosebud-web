"use client"

import type React from "react"

import { createContext, useState, useEffect, useContext } from "react"
import { useSupabase } from "./supabase-provider"
import { useToast } from "@/components/ui/use-toast"

type NotificationContextType = {
  requestPermissions: () => Promise<boolean>
  scheduleNotification: (title: string, body: string, time: Date, reminderId: string) => Promise<string>
  cancelNotification: (notificationId: string) => Promise<void>
  testNotificationPermission: () => Promise<boolean>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null)

  // Debug notification permission on page load
  useEffect(() => {
    console.log("NotificationProvider mounted");
    console.log("Notification in window:", "Notification" in window);
    if ("Notification" in window) {
      console.log("Initial notification permission:", Notification.permission);
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Add a test notification function for debugging
  const testNotificationPermission = async () => {
    console.log("Testing notification permission");

    if (!("Notification" in window)) {
      console.error("Notifications not supported");
      return false;
    }

    try {
      console.log("Current permission:", Notification.permission);

      // Force a permission request
      const result = await Notification.requestPermission();
      console.log("Permission request result:", result);

      // Try to show a test notification if granted
      if (result === "granted") {
        new Notification("Test Notification", {
          body: "This is a test notification",
        });
      }

      return result === "granted";
    } catch (error) {
      console.error("Error requesting permission:", error);
      return false;
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    console.log("Request permissions called");
    console.log("Current notification permission:", Notification.permission);

    if (!("Notification" in window)) {
      console.log("Notifications not supported by this browser");
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support notifications",
        variant: "destructive",
      })
      return false
    }

    if (Notification.permission === "granted") {
      console.log("Permissions already granted");
      return true
    }

    if (Notification.permission !== "denied") {
      console.log("Requesting notification permission from browser...");
      try {
        const permission = await Notification.requestPermission()
        console.log("Permission result:", permission);
        setNotificationPermission(permission)
        return permission === "granted"
      } catch (error) {
        console.error("Error requesting notification permission:", error);
        return false;
      }
    }

    console.log("Permissions were previously denied");
    toast({
      title: "Permission required",
      description: "Please enable notifications in your browser settings",
      variant: "destructive",
    })
    return false
  }

  // For web, we'll use a combination of localStorage and setTimeout
  const scheduleNotification = async (title: string, body: string, time: Date, reminderId: string): Promise<string> => {
    const hasPermission = await requestPermissions()
    if (!hasPermission) {
      throw new Error("Notification permission not granted")
    }

    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Store the notification in localStorage
    const notifications = JSON.parse(localStorage.getItem("scheduled_notifications") || "[]")
    notifications.push({
      id: notificationId,
      title,
      body,
      time: time.toISOString(),
      reminderId,
    })
    localStorage.setItem("scheduled_notifications", JSON.stringify(notifications))

    // Calculate delay in milliseconds
    const now = new Date()
    const delay = time.getTime() - now.getTime()

    if (delay > 0) {
      // Schedule the notification
      setTimeout(() => {
        showNotification(title, body, reminderId)

        // Remove from localStorage after showing
        removeScheduledNotification(notificationId)
      }, delay)
    }

    return notificationId
  }

  const showNotification = (title: string, body: string, reminderId: string) => {
    if (Notification.permission === "granted") {
      const notification = new Notification(title, {
        body,
        icon: "/logo.png",
        data: { reminderId },
      })

      notification.onclick = async () => {
        // Mark as completed when clicked
        try {
          await supabase.from("reminders").update({ status: "completed" }).eq("id", reminderId)

          // Focus on the window and navigate to reminders
          window.focus()
          window.location.href = "/reminders"
        } catch (error) {
          console.error("Error handling notification click:", error)
        }
      }
    }
  }

  const removeScheduledNotification = (notificationId: string) => {
    const notifications = JSON.parse(localStorage.getItem("scheduled_notifications") || "[]")
    const updatedNotifications = notifications.filter((n: any) => n.id !== notificationId)
    localStorage.setItem("scheduled_notifications", JSON.stringify(updatedNotifications))
  }

  const cancelNotification = async (notificationId: string): Promise<void> => {
    removeScheduledNotification(notificationId)
  }

  // Check for due notifications on page load and window focus
  useEffect(() => {
    const checkScheduledNotifications = () => {
      const notifications = JSON.parse(localStorage.getItem("scheduled_notifications") || "[]")
      const now = new Date()

      notifications.forEach((notification: any) => {
        const notificationTime = new Date(notification.time)

        if (notificationTime <= now) {
          showNotification(notification.title, notification.body, notification.reminderId)
          removeScheduledNotification(notification.id)
        }
      })
    }

    // Check on page load
    checkScheduledNotifications()

    // Check when window gets focus
    window.addEventListener("focus", checkScheduledNotifications)

    return () => {
      window.removeEventListener("focus", checkScheduledNotifications)
    }
  }, [])

  return (
    <NotificationContext.Provider value={{
      requestPermissions,
      scheduleNotification,
      cancelNotification,
      testNotificationPermission
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider")
  }
  return context
}
