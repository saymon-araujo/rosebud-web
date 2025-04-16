"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-provider"
import { useSupabase } from "@/lib/supabase-provider"
import { useNotification } from "@/lib/notification-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Bell, ArrowLeft, Check, Clock, Trash } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

type Reminder = {
  id: string
  title: string
  body: string
  time: string
  status: string
  type: string
  notification_id: string
}

export default function RemindersPage({ searchParams }: { searchParams: { id?: string } }) {
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const { cancelNotification } = useNotification()
  const router = useRouter()
  const { toast } = useToast()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const { id: reminderId } = searchParams

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    fetchReminders()
  }, [user])

  const fetchReminders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", user?.id)
        .eq("status", "active")
        .order("time", { ascending: true })

      if (error) throw error
      setReminders(data || [])
    } catch (error) {
      console.error("Error fetching reminders:", error)
      toast({
        title: "Error",
        description: "Failed to load reminders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteReminder = async (id: string, notificationId: string) => {
    try {
      // Cancel the scheduled notification if it exists
      if (notificationId) {
        try {
          await cancelNotification(notificationId)
        } catch (notifError) {
          console.error("Error canceling notification:", notifError)
          // Continue even if notification cancellation fails
        }
      }

      const { error } = await supabase.from("reminders").update({ status: "completed" }).eq("id", id)

      if (error) throw error

      // Update the local state
      setReminders(reminders.filter((reminder) => reminder.id !== id))

      toast({
        title: "Success",
        description: "Reminder marked as completed",
      })
    } catch (error) {
      console.error("Error completing reminder:", error)
      toast({
        title: "Error",
        description: "Failed to update reminder",
        variant: "destructive",
      })
    }
  }

  const handleDeleteReminder = async (id: string, notificationId: string) => {
    try {
      // Cancel the scheduled notification if it exists
      if (notificationId) {
        try {
          await cancelNotification(notificationId)
        } catch (notifError) {
          console.error("Error canceling notification:", notifError)
          // Continue even if notification cancellation fails
        }
      }

      const { error } = await supabase.from("reminders").update({ status: "deleted" }).eq("id", id)

      if (error) throw error

      // Update the local state
      setReminders(reminders.filter((reminder) => reminder.id !== id))

      toast({
        title: "Success",
        description: "Reminder deleted",
      })
    } catch (error) {
      console.error("Error deleting reminder:", error)
      toast({
        title: "Error",
        description: "Failed to delete reminder",
        variant: "destructive",
      })
    }
  }

  const formatReminderTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-xl font-bold ml-2">Your Reminders</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reminders.length > 0 ? (
          <div className="grid gap-4">
            {reminders.map((reminder) => (
              <Card key={reminder.id} className={reminder.id === reminderId ? "border-primary" : ""}>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-lg">{reminder.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <p className="text-gray-700 mb-4">{reminder.body}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{formatReminderTime(reminder.time)}</span>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600"
                    onClick={() => handleCompleteReminder(reminder.id, reminder.notification_id)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Complete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() => handleDeleteReminder(reminder.id, reminder.notification_id)}
                  >
                    <Trash className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-4">No active reminders</p>
              <Button onClick={() => router.push("/journal")}>Create a Journal Entry</Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
