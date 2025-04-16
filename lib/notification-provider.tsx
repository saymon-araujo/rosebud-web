"use client"

import type React from "react"

import { createContext, useState, useEffect, useContext } from "react"
import { useSupabase } from "./supabase-provider"
import { useToast } from "@/components/ui/use-toast"

type NotificationContextType = {
  requestPermissions: () => Promise<boolean>
  scheduleNotification: (title: string, body: string, time: Date, reminderId: string) => Promise<string>
  cancelNotification: (notificationId: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null)

  useEffect(() => {
    // Check if notifications are supported
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  const requestPermissions = async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support notifications",
        variant: "destructive",
      })
      return false
    }

    if (Notification.permission === "granted") {
      return true
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      return permission === "granted"
    }

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
    <NotificationContext.Provider value={{ requestPermissions, scheduleNotification, cancelNotification }}>
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
