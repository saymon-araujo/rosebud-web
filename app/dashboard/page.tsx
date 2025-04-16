"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-provider"
import { useSupabase } from "@/lib/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, PenLine, History, Bell, Settings } from "lucide-react"

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
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary">Journal AI</h1>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={() => router.push("/settings")}>
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.email?.split("@")[0] || "User"}</h2>
          <p className="text-gray-500">How are you feeling today?</p>
        </div>

        <div className="mb-8">
          <Button onClick={() => router.push("/journal")} className="w-full sm:w-auto">
            <PenLine className="mr-2 h-4 w-4" />
            New Journal Entry
          </Button>
        </div>

        <Tabs defaultValue="entries" className="space-y-4">
          <TabsList>
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
                {recentEntries.map((entry) => (
                  <Card key={entry.id} className="overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium">{formatDate(entry.created_at)}</CardTitle>
                        {entry.processed ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            AI Analyzed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending Analysis
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <p className="text-gray-700">{truncateContent(entry.content)}</p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-end">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/journal?entryId=${entry.id}`}>View Details</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                <div className="text-center">
                  <Button variant="outline" asChild>
                    <Link href="/history">View All Entries</Link>
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 mb-4">No journal entries yet</p>
                  <Button onClick={() => router.push("/journal")}>Create Your First Entry</Button>
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
                  <Card key={reminder.id} className="overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium">{reminder.title}</CardTitle>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {formatTime(reminder.time)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <p className="text-gray-700">{reminder.body}</p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-end">
                      <Button variant="outline" size="sm" className="mr-2" asChild>
                        <Link href={`/reminders?id=${reminder.id}`}>Edit</Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/reminders?id=${reminder.id}`)}>
                        View
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                <div className="text-center">
                  <Button variant="outline" asChild>
                    <Link href="/reminders">View All Reminders</Link>
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 mb-4">No active reminders</p>
                  <Button onClick={() => router.push("/journal")}>Create a Journal Entry</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
