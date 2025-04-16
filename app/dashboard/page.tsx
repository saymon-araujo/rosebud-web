"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-provider"
import { useSupabase } from "@/lib/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  PenLine,
  History,
  Bell,
  Settings,
  BookOpen,
  Calendar,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

type JournalEntry = {
  id: string
  content: string
  created_at: string
  processed: boolean
}

type Reminder = {
  id: string
  title: string
  body: string
  time: string
  status: string
  type: string
}

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const { supabase } = useSupabase()
  const router = useRouter()
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([])
  const [activeReminders, setActiveReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalReminders: 0,
    streakDays: 0,
  })

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch recent entries
      const { data: entriesData, error: entriesError } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (entriesError) throw entriesError
      setRecentEntries(entriesData || [])

      // Fetch active reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", user?.id)
        .eq("status", "active")
        .order("time", { ascending: true })
        .limit(5)

      if (remindersError) throw remindersError
      setActiveReminders(remindersData || [])

      // Get stats
      const { count: entriesCount } = await supabase
        .from("journal_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)

      const { count: remindersCount } = await supabase
        .from("reminders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)

      setStats({
        totalEntries: entriesCount || 0,
        totalReminders: remindersCount || 0,
        streakDays: calculateStreak(entriesData || []),
      })
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStreak = (entries: JournalEntry[]) => {
    if (!entries.length) return 0

    // Simple streak calculation - can be enhanced for more accuracy
    const dates = entries.map((entry) => new Date(entry.created_at).toDateString())
    const uniqueDates = [...new Set(dates)]

    // For demo purposes, return a number between 1-7 based on entries count
    return Math.min(7, uniqueDates.length)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + "..."
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

  return (
    <div className="min-h-screen bg-gradient-light">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-primary ml-2">Journal AI</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/settings")}
                className="text-gray-500 hover:text-primary"
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-gray-500 hover:text-primary">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.email?.split("@")[0] || "User"}</h2>
          <p className="text-gray-500">How are you feeling today?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-sm hover:shadow-md transition-shadow animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Entries</p>
                  <p className="text-3xl font-bold">{stats.totalEntries}</p>
                </div>
                <div className="rounded-full bg-primary/10 p-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow animate-fade-in animate-delay-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Reminders</p>
                  <p className="text-3xl font-bold">{stats.totalReminders}</p>
                </div>
                <div className="rounded-full bg-primary/10 p-3">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow animate-fade-in animate-delay-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Streak</p>
                  <p className="text-3xl font-bold">{stats.streakDays} days</p>
                </div>
                <div className="rounded-full bg-primary/10 p-3">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8 animate-fade-in animate-delay-100">
          <Button
            onClick={() => router.push("/journal")}
            className="w-full sm:w-auto shadow-md hover:shadow-lg transition-shadow"
          >
            <PenLine className="mr-2 h-4 w-4" />
            New Journal Entry
          </Button>
        </div>

        <Tabs defaultValue="entries" className="space-y-4 animate-fade-in animate-delay-200">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="entries">Recent Entries</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="space-y-4">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : recentEntries.length > 0 ? (
              <>
                {recentEntries.map((entry, index) => (
                  <Card key={entry.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2 bg-white">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium">{formatDate(entry.created_at)}</CardTitle>
                        {entry.processed ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            AI Analyzed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Pending Analysis
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <p className="text-gray-700">{truncateContent(entry.content)}</p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-end">
                      <Button variant="ghost" size="sm" asChild className="text-primary">
                        <Link href={`/journal?entryId=${entry.id}`}>
                          View Details
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                <div className="text-center">
                  <Button variant="outline" asChild className="shadow-sm">
                    <Link href="/history">View All Entries</Link>
                  </Button>
                </div>
              </>
            ) : (
              <Card className="shadow-sm">
                <CardContent className="p-8 text-center">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 mb-4">No journal entries yet</p>
                  <Button onClick={() => router.push("/journal")} className="shadow-sm">
                    Create Your First Entry
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : activeReminders.length > 0 ? (
              <>
                {activeReminders.map((reminder) => (
                  <Card key={reminder.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2 bg-white">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium flex items-center">
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
                          {formatTime(reminder.time)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <p className="text-gray-700">{reminder.body}</p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-end">
                      <Button variant="outline" size="sm" className="mr-2 text-green-600" asChild>
                        <Link href={`/reminders?id=${reminder.id}`}>
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Complete
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-primary" asChild>
                        <Link href={`/reminders?id=${reminder.id}`}>
                          View
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                <div className="text-center">
                  <Button variant="outline" asChild className="shadow-sm">
                    <Link href="/reminders">View All Reminders</Link>
                  </Button>
                </div>
              </>
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
