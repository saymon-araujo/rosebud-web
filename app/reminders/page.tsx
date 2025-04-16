"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-provider"
import { useSupabase } from "@/lib/supabase-provider"
import { useNotification } from "@/lib/notification-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Bell, ArrowLeft, Check, Clock, Trash, Calendar, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null)
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

  const confirmDeleteReminder = (reminder: Reminder) => {
    setSelectedReminder(reminder)
    setDeleteDialogOpen(true)
  }

  const handleDeleteReminder = async () => {
    if (!selectedReminder) return

    try {
      // Cancel the scheduled notification if it exists
      if (selectedReminder.notification_id) {
        try {
          await cancelNotification(selectedReminder.notification_id)
        } catch (notifError) {
          console.error("Error canceling notification:", notifError)
          // Continue even if notification cancellation fails
        }
      }

      const { error } = await supabase.from("reminders").update({ status: "deleted" }).eq("id", selectedReminder.id)

      if (error) throw error

      // Update the local state
      setReminders(reminders.filter((reminder) => reminder.id !== selectedReminder.id))

      toast({
        title: "Success",
        description: "Reminder deleted",
      })

      setDeleteDialogOpen(false)
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

  const getTimeStatus = (dateString: string) => {
    const reminderTime = new Date(dateString)
    const now = new Date()
    const diffMs = reminderTime.getTime() - now.getTime()
    const diffHrs = diffMs / (1000 * 60 * 60)

    if (diffHrs < 0) return "overdue"
    if (diffHrs < 1) return "soon"
    return "upcoming"
  }

  // Group reminders by date
  const groupedReminders = reminders.reduce(
    (groups, reminder) => {
      const date = new Date(reminder.time).toLocaleDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(reminder)
      return groups
    },
    {} as Record<string, Reminder[]>,
  )

  return (
    <div className="min-h-screen bg-gradient-light">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center h-16 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <div className="flex items-center ml-2">
            <Bell className="h-5 w-5 text-primary mr-2" />
            <h1 className="text-lg font-semibold text-primary">Your Reminders</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : Object.keys(groupedReminders).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedReminders).map(([date, dateReminders]) => (
              <div key={date} className="animate-fade-in">
                <h2 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h2>
                <div className="grid gap-4">
                  {dateReminders.map((reminder) => (
                    <Card
                      key={reminder.id}
                      className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow ${reminder.id === reminderId ? "border-primary" : ""
                        }`}
                    >
                      <CardHeader className="p-4 pb-2 bg-white">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg flex items-center">
                            {reminder.title}
                            {getTimeStatus(reminder.time) === "overdue" && (
                              <AlertCircle className="ml-2 h-4 w-4 text-red-500" />
                            )}
                            {getTimeStatus(reminder.time) === "soon" && (
                              <Clock className="ml-2 h-4 w-4 text-yellow-500" />
                            )}
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className={
                              getTimeStatus(reminder.time) === "overdue"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : getTimeStatus(reminder.time) === "soon"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                            }
                          >
                            {formatReminderTime(reminder.time)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <p className="text-gray-700">{reminder.body}</p>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleCompleteReminder(reminder.id, reminder.notification_id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => confirmDeleteReminder(reminder)}
                        >
                          <Trash className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-4">No active reminders</p>
              <Button onClick={() => router.push("/journal")} className="shadow-sm">
                Create a Journal Entry
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reminder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this reminder? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteReminder}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
