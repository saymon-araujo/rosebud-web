"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-provider"
import { useSupabase } from "@/lib/supabase-provider"
import { useNotification } from "@/lib/notification-provider"
import { analyzeJournalEntry, getFallbackAnalysis, getSuggestedTimes, parseTimeString } from "@/lib/openai"
import {
  UserBubble,
  AIBubble,
  QuickReplyButton,
  QuickReplyContainer,
  SystemMessage,
} from "@/components/chat/chat-bubble"
import TimePicker from "@/components/chat/time-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Send } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// Message types
const MESSAGE_TYPE = {
  USER: "user",
  AI: "ai",
  SYSTEM: "system",
}

// Chat states
const CHAT_STATE = {
  INITIAL: "initial",
  WAITING_FOR_ENTRY: "waiting_for_entry",
  ANALYZING: "analyzing",
  WAITING_FOR_REMINDER_CONFIRMATION: "waiting_for_reminder_confirmation",
  WAITING_FOR_TIME_SELECTION: "waiting_for_time_selection",
  REMINDER_SET: "reminder_set",
}

type Message = {
  id: string
  content: string
  type: string
  timestamp: string
  suggestionType?: string
}

export default function JournalPage() {
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const { requestPermissions, scheduleNotification } = useNotification()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [chatState, setChatState] = useState(CHAT_STATE.INITIAL)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiResponse, setAiResponse] = useState<any>(null)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const entryId = searchParams.get("entryId")

  // Format current time for message timestamps
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Add a message to the chat
  const addMessage = (content: string, type: string, additionalData = {}) => {
    const newMessage = {
      id: Date.now().toString(),
      content,
      type,
      timestamp: getCurrentTime(),
      ...additionalData,
    }
    setMessages((prevMessages) => [...prevMessages, newMessage])

    // Scroll to the bottom
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
      }
    }, 100)

    return newMessage
  }

  // Initialize the chat
  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    if (entryId) {
      fetchEntryDetails()
    } else {
      // Start a new chat
      addMessage("Hi there! 👋 How are you feeling today?", MESSAGE_TYPE.AI)
      setChatState(CHAT_STATE.WAITING_FOR_ENTRY)
    }
  }, [entryId, user])

  // Fetch entry details if editing an existing entry
  const fetchEntryDetails = async () => {
    try {
      setLoading(true)

      // First, fetch the journal entry
      const { data: entryData, error: entryError } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("id", entryId)
        .single()

      if (entryError) throw entryError

      if (entryData) {
        // Add the user's journal entry as a message
        addMessage(entryData.content, MESSAGE_TYPE.USER)

        // Then, fetch the associated suggestion separately
        const { data: suggestionData, error: suggestionError } = await supabase
          .from("suggestions")
          .select("*")
          .eq("entry_id", entryId)

        if (suggestionError) throw suggestionError

        if (suggestionData && suggestionData.length > 0) {
          const suggestion = suggestionData[0]

          // Add the AI response as a message
          const aiMessage = addMessage(suggestion.response_text, MESSAGE_TYPE.AI, {
            suggestionType: suggestion.type,
          })

          setAiResponse({
            type: suggestion.type,
            response: suggestion.response_text,
          })

          // Set the chat state to waiting for reminder confirmation
          setChatState(CHAT_STATE.WAITING_FOR_REMINDER_CONFIRMATION)

          // Get suggested times based on the suggestion type
          const times = getSuggestedTimes(suggestion.type)
          setSuggestedTimes(times)
        }
      }
    } catch (error) {
      console.error("Error fetching entry details:", error)
      addMessage("Sorry, I couldn't load your previous entry. Let's start a new conversation.", MESSAGE_TYPE.SYSTEM)
      setChatState(CHAT_STATE.WAITING_FOR_ENTRY)
    } finally {
      setLoading(false)
    }
  }

  // Handle sending a journal entry
  const handleSendEntry = async () => {
    if (!inputText.trim()) return

    // Add the user's message to the chat
    addMessage(inputText, MESSAGE_TYPE.USER)

    // Clear the input field
    setInputText("")

    // Set the chat state to analyzing
    setChatState(CHAT_STATE.ANALYZING)

    try {
      setLoading(true)
      setAnalyzing(true)

      // Add a "thinking" message
      addMessage("Thinking...", MESSAGE_TYPE.SYSTEM)

      // Save journal entry to Supabase
      const { data: entryData, error: entryError } = await supabase
        .from("journal_entries")
        .insert([{ user_id: user?.id, content: inputText, processed: false }])
        .select()
        .single()

      if (entryError) throw entryError

      // Analyze the entry with OpenAI
      try {
        const analysis = await analyzeJournalEntry(inputText, user?.id || "")
        setAiResponse(analysis)

        // Remove the "thinking" message
        setMessages((prevMessages) => prevMessages.filter((msg) => msg.content !== "Thinking..."))

        // Add the AI response as a message
        const aiMessage = addMessage(analysis.response, MESSAGE_TYPE.AI, {
          suggestionType: analysis.type,
        })

        // Save the suggestion to Supabase
        const { error: suggestionError } = await supabase.from("suggestions").insert([
          {
            entry_id: entryData.id,
            type: analysis.type,
            response_text: analysis.response,
          },
        ])

        if (suggestionError) throw suggestionError

        // Update the journal entry as processed
        const { error: updateError } = await supabase
          .from("journal_entries")
          .update({ processed: true })
          .eq("id", entryData.id)

        if (updateError) throw updateError

        // Set the chat state to waiting for reminder confirmation
        setChatState(CHAT_STATE.WAITING_FOR_REMINDER_CONFIRMATION)

        // Get suggested times based on the suggestion type
        const times = getSuggestedTimes(analysis.type)
        setSuggestedTimes(times)
      } catch (error) {
        console.error("Error analyzing journal entry:", error)

        // Remove the "thinking" message
        setMessages((prevMessages) => prevMessages.filter((msg) => msg.content !== "Thinking..."))

        // Use fallback analysis if OpenAI fails
        const fallbackAnalysis = getFallbackAnalysis(inputText)
        setAiResponse(fallbackAnalysis)

        // Add the fallback AI response as a message
        const aiMessage = addMessage(fallbackAnalysis.response, MESSAGE_TYPE.AI, {
          suggestionType: fallbackAnalysis.type,
        })

        // Save the fallback suggestion to Supabase
        try {
          await supabase.from("suggestions").insert([
            {
              entry_id: entryData.id,
              type: fallbackAnalysis.type,
              response_text: fallbackAnalysis.response,
            },
          ])

          await supabase.from("journal_entries").update({ processed: true }).eq("id", entryData.id)
        } catch (fallbackError) {
          console.error("Error saving fallback analysis:", fallbackError)
        }

        // Set the chat state to waiting for reminder confirmation
        setChatState(CHAT_STATE.WAITING_FOR_REMINDER_CONFIRMATION)

        // Get suggested times based on the suggestion type
        const times = getSuggestedTimes(fallbackAnalysis.type)
        setSuggestedTimes(times)
      }
    } catch (error) {
      console.error("Error saving journal entry:", error)
      addMessage("Sorry, I couldn't save your entry. Please try again.", MESSAGE_TYPE.SYSTEM)
      setChatState(CHAT_STATE.WAITING_FOR_ENTRY)
    } finally {
      setLoading(false)
      setAnalyzing(false)
    }
  }

  // Handle reminder confirmation
  const handleReminderConfirmation = async (confirmed: boolean) => {
    if (confirmed) {
      // User wants a reminder
      addMessage("Great! When would you like to be reminded?", MESSAGE_TYPE.AI)
      setChatState(CHAT_STATE.WAITING_FOR_TIME_SELECTION)
    } else {
      // User doesn't want a reminder
      addMessage("No problem! I'm here whenever you need me.", MESSAGE_TYPE.AI)
      setChatState(CHAT_STATE.WAITING_FOR_ENTRY)
    }
  }

  // Handle time selection
  const handleTimeSelection = async (timeOption: string) => {
    if (timeOption === "custom") {
      // Show time picker for custom time
      setShowTimePicker(true)
    } else {
      // Schedule reminder for selected time
      await scheduleReminderForTime(timeOption)
    }
  }

  // Handle custom time selection from time picker
  const handleCustomTimeSelection = async (selectedTime: Date) => {
    // Format the selected time
    const formattedTime = selectedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    // Schedule reminder for the custom time
    await scheduleReminderForTime(formattedTime, selectedTime)
  }

  // Schedule a reminder for the selected time
  const scheduleReminderForTime = async (timeOption: string, customTime: Date | null = null) => {
    try {
      // Request notification permissions
      const hasPermission = await requestPermissions()
      if (!hasPermission) {
        addMessage("I need permission to send notifications for reminders.", MESSAGE_TYPE.SYSTEM)
        return
      }

      // Parse the time option to get a Date object
      let reminderTime: Date

      if (customTime) {
        reminderTime = customTime
      } else {
        reminderTime = parseTimeString(timeOption)
      }

      // Add a message confirming the time
      const formattedTime = reminderTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        weekday: reminderTime.getDate() !== new Date().getDate() ? "short" : undefined,
      })

      addMessage(`I'll remind you at ${formattedTime} 👍`, MESSAGE_TYPE.AI)

      // First create the reminder in the database to get an ID
      const { data: reminderData, error: reminderError } = await supabase
        .from("reminders")
        .insert([
          {
            user_id: user?.id,
            type: aiResponse.type,
            title: `${aiResponse.type.charAt(0).toUpperCase() + aiResponse.type.slice(1)} Reminder`,
            body: aiResponse.response.split("?")[0] + ".",
            time: reminderTime.toISOString(),
            status: "active",
          },
        ])
        .select()
        .single()

      if (reminderError) throw reminderError

      // Format the reminder message
      const title = `${aiResponse.type.charAt(0).toUpperCase() + aiResponse.type.slice(1)} Reminder`
      const body = aiResponse.response.split("?")[0] + "."

      // Schedule the notification
      const notificationId = await scheduleNotification(title, body, reminderTime, reminderData.id)

      // Update the reminder with the notification ID
      const { error: updateError } = await supabase
        .from("reminders")
        .update({ notification_id: notificationId })
        .eq("id", reminderData.id)

      if (updateError) throw updateError

      // Set the chat state to reminder set
      setChatState(CHAT_STATE.REMINDER_SET)

      // Add a final message
      setTimeout(() => {
        addMessage("Is there anything else you'd like to talk about today?", MESSAGE_TYPE.AI)
        setChatState(CHAT_STATE.WAITING_FOR_ENTRY)
      }, 1000)
    } catch (error) {
      console.error("Error setting reminder:", error)
      addMessage("Sorry, I couldn't set the reminder. Please try again.", MESSAGE_TYPE.SYSTEM)
      setChatState(CHAT_STATE.WAITING_FOR_ENTRY)
    }
  }

  // Handle key press in input field
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendEntry()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <span className="sr-only">Back</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Button>
          <h1 className="text-lg font-semibold ml-2">Journal AI</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto">
          {messages.map((message) => {
            switch (message.type) {
              case MESSAGE_TYPE.USER:
                return <UserBubble key={message.id} message={message.content} timestamp={message.timestamp} />
              case MESSAGE_TYPE.AI:
                return (
                  <AIBubble
                    key={message.id}
                    message={message.content}
                    timestamp={message.timestamp}
                    type={message.suggestionType}
                  />
                )
              case MESSAGE_TYPE.SYSTEM:
                return <SystemMessage key={message.id} message={message.content} />
              default:
                return null
            }
          })}
          <div ref={messagesEndRef} />

          {/* Quick Reply Buttons */}
          {chatState === CHAT_STATE.WAITING_FOR_REMINDER_CONFIRMATION && (
            <QuickReplyContainer>
              <QuickReplyButton text="Yes, please" onPress={() => handleReminderConfirmation(true)} primary={true} />
              <QuickReplyButton text="No, thanks" onPress={() => handleReminderConfirmation(false)} primary={false} />
            </QuickReplyContainer>
          )}

          {chatState === CHAT_STATE.WAITING_FOR_TIME_SELECTION && (
            <QuickReplyContainer>
              {suggestedTimes.map((time, index) => (
                <QuickReplyButton key={index} text={time} onPress={() => handleTimeSelection(time)} primary={true} />
              ))}
              <QuickReplyButton text="Custom time" onPress={() => handleTimeSelection("custom")} primary={false} />
            </QuickReplyContainer>
          )}
        </div>
      </main>

      {chatState === CHAT_STATE.WAITING_FOR_ENTRY && (
        <footer className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-2xl mx-auto flex items-center">
            <Input
              type="text"
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 rounded-full"
              disabled={loading}
            />
            <Button
              size="icon"
              className="ml-2 rounded-full"
              onClick={handleSendEntry}
              disabled={!inputText.trim() || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </footer>
      )}

      <TimePicker
        open={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelectTime={handleCustomTimeSelection}
        initialTime={new Date()}
      />
    </div>
  )
}
