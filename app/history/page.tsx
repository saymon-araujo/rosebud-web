"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-provider"
import { useSupabase } from "@/lib/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft, History, Search, Calendar, ChevronRight, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type JournalEntry = {
  id: string
  content: string
  created_at: string
  processed: boolean
}

export default function HistoryPage() {
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortOrder, setSortOrder] = useState("newest")

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    fetchEntries()
  }, [user])

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch (error) {
      console.error("Error fetching entries:", error)
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

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + "..."
  }

  // Filter entries based on search query and filter status
  const filteredEntries = entries
    .filter((entry) => entry.content.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((entry) => {
      if (filterStatus === "all") return true
      if (filterStatus === "analyzed") return entry.processed
      if (filterStatus === "pending") return !entry.processed
      return true
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB
    })

  // Group entries by date
  const groupedEntries = filteredEntries.reduce(
    (groups, entry) => {
      const date = new Date(entry.created_at).toLocaleDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(entry)
      return groups
    },
    {} as Record<string, JournalEntry[]>,
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
            <History className="h-5 w-5 text-primary mr-2" />
            <h1 className="text-lg font-semibold text-primary">Journal History</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search journal entries..."
              className="pl-10 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-white shadow-sm">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entries</SelectItem>
                  <SelectItem value="analyzed">AI Analyzed</SelectItem>
                  <SelectItem value="pending">Pending Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="bg-white shadow-sm">
                  <SelectValue placeholder="Sort by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : Object.keys(groupedEntries).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedEntries).map(([date, dateEntries]) => (
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
                  {dateEntries.map((entry) => (
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-8 text-center">
              <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-4">
                {searchQuery ? "No entries match your search" : "No journal entries yet"}
              </p>
              {!searchQuery && (
                <Button onClick={() => router.push("/journal")} className="shadow-sm">
                  Create Your First Entry
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
