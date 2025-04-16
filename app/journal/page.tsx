"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
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
import { Loader2, Send, ArrowLeft, BookOpen, Sparkles } from "lucide-react"
import { toast } from "sonner"

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
  const { requestPermissions, scheduleNotification, testNotificationPermission } = useNotification()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [chatState, setChatState] = useState(CHAT_STATE.INITIAL)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiResponse, setAiResponse] = useState<any>(null)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initialMessageSentRef = useRef(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const entryId = searchParams.get("entryId")

  // Format current time for message timestamps
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Add a message to the chat
  const addMessage = (content: string, type: string, additionalData = {}) => {
    const newMessage = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
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
    } else if (!initialMessageSentRef.current) {
      // Start a new chat - only if we haven't sent the initial message yet
      addMessage("Hi there! 👋 How are you feeling today?", MESSAGE_TYPE.AI)
      setChatState(CHAT_STATE.WAITING_FOR_ENTRY)
      initialMessageSentRef.current = true
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

        // Toast a message to let user know fallback was used
        // toast.success("Using fallback analysis", {
        //   description: "We couldn't reach our AI service, so we're using a simplified response.",
        // })

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
    try {
      setLoading(true)
      if (confirmed) {
        // User wants a reminder
        addMessage("Great! When would you like to be reminded?", MESSAGE_TYPE.AI)
        setChatState(CHAT_STATE.WAITING_FOR_TIME_SELECTION)
      } else {
        // User doesn't want a reminder
        addMessage("No problem! I'm here whenever you need me.", MESSAGE_TYPE.AI)
        setChatState(CHAT_STATE.WAITING_FOR_ENTRY)
      }
    } catch (error) {
      console.error("Error handling reminder confirmation:", error)
      setChatState(CHAT_STATE.WAITING_FOR_ENTRY)
    } finally {
      setLoading(false)
    }
  }

  // Handle time selection
  const handleTimeSelection = async (timeOption: string) => {
    try {
      console.log(`Time option selected: ${timeOption}`);
      if (timeOption === "custom") {
        // Show time picker for custom time
        setShowTimePicker(true)
      } else {
        // Add loading state
        setLoading(true)
        console.log("Setting loading state to true");
        // Schedule reminder for selected time
        console.log("About to call scheduleReminderForTime");
        await scheduleReminderForTime(timeOption)
        console.log("Completed scheduleReminderForTime");
      }
    } catch (error) {
      console.error("Error handling time selection:", error)
      toast.error("Failed to set reminder", {
        description: "There was a problem setting your reminder. Please try again.",
      })
      setChatState(CHAT_STATE.WAITING_FOR_ENTRY)
    } finally {
      console.log("Setting loading state to false in finally block");
      setLoading(false)
    }
  }

  // Handle custom time selection from time picker
  const handleCustomTimeSelection = async (selectedTime: Date) => {
    try {
      // Format the selected time
      const formattedTime = selectedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

      // Add loading state
      setLoading(true)
      // Schedule reminder for the custom time
      await scheduleReminderForTime(formattedTime, selectedTime)
    } catch (error) {
      console.error("Error handling custom time selection:", error)
      toast.error("Failed to set reminder", {
        description: "There was a problem setting your reminder. Please try again.",
      })
      setChatState(CHAT_STATE.WAITING_FOR_ENTRY)
    } finally {
      setLoading(false)
    }
  }

  // Schedule a reminder for the selected time
  const scheduleReminderForTime = async (timeOption: string, customTime: Date | null = null) => {
    try {
      console.log("Starting scheduleReminderForTime function");

      // Check if aiResponse exists and log its value
      console.log("aiResponse:", aiResponse);

      if (!aiResponse || !aiResponse.type) {
        console.error("aiResponse is missing or incomplete");
        throw new Error("Cannot create reminder: missing response data");
      }

      // Check if we're running in Safari
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      console.log("Browser is Safari:", isSafari);

      // For Safari, we need to force a user interaction to request permissions
      if (isSafari && "Notification" in window && Notification.permission !== "granted") {
        const permissionResult = await testNotificationPermission();
        console.log("Safari permission test result:", permissionResult);

        if (!permissionResult) {
          addMessage("I need permission to send notifications for reminders. Please try clicking the 'Test Notification' button first.", MESSAGE_TYPE.SYSTEM);
          toast.error("Notification permission required", {
            description: "Please click the 'Test Notification' button and allow notifications.",
          });
          return;
        }
      } else {
        // Request notification permissions for other browsers
        console.log("Requesting notification permissions");
        const hasPermission = await requestPermissions();
        console.log("Notification permission result:", hasPermission);

        if (!hasPermission) {
          addMessage("I need permission to send notifications for reminders. Please enable notifications in your browser settings.", MESSAGE_TYPE.SYSTEM);
          toast.error("Notification permission required", {
            description: "Please enable notifications in your browser settings to use reminders.",
          });
          return;
        }
      }

      // Parse the time option to get a Date object
      let reminderTime: Date
      console.log("Parsing time option:", timeOption);

      if (customTime) {
        reminderTime = customTime
        console.log("Using custom time:", reminderTime);
      } else {
        reminderTime = parseTimeString(timeOption)
        console.log("Parsed time:", reminderTime);
      }

      // Add a message confirming the time
      const formattedTime = reminderTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        weekday: reminderTime.getDate() !== new Date().getDate() ? "short" : undefined,
      })
      console.log("Formatted time for message:", formattedTime);

      addMessage(`I'll remind you at ${formattedTime} 👍`, MESSAGE_TYPE.AI)

      // First create the reminder in the database to get an ID
      console.log("Inserting reminder in database");
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

      if (reminderError) {
        console.error("Error inserting reminder:", reminderError);
        throw reminderError;
      }

      console.log("Reminder created successfully:", reminderData);

      // Format the reminder message
      const title = `${aiResponse.type.charAt(0).toUpperCase() + aiResponse.type.slice(1)} Reminder`
      const body = aiResponse.response.split("?")[0] + "."
      console.log("Reminder title:", title);
      console.log("Reminder body:", body);

      // Schedule the notification
      console.log("Scheduling notification");
      const notificationId = await scheduleNotification(title, body, reminderTime, reminderData.id)
      console.log("Notification scheduled, ID:", notificationId);

      // Show success toast
      toast.success("Reminder set", {
        description: `You'll be reminded at ${formattedTime}`,
      })

      // Try to update the reminder with the notification ID
      try {
        console.log("Updating reminder with notification ID");
        const { error: updateError } = await supabase
          .from("reminders")
          .update({ notification_id: notificationId })
          .eq("id", reminderData.id)

        if (updateError) {
          console.error("Error updating reminder:", updateError);
          // Continue without throwing - this is not a critical error
          // The notification will still work even without the ID stored in the database
        } else {
          console.log("Reminder updated successfully");
        }
      } catch (error) {
        console.error("Exception updating reminder:", error);
        // Continue without throwing - notification will still work
      }

      // Set the chat state to reminder set
      console.log("Setting chat state to REMINDER_SET");
      setChatState(CHAT_STATE.REMINDER_SET)

      // Add a final message
      setTimeout(() => {
        console.log("Adding final message");
        addMessage("Is there anything else you'd like to talk about today?", MESSAGE_TYPE.AI)
        setChatState(CHAT_STATE.WAITING_FOR_ENTRY)
      }, 1000)
    } catch (error) {
      console.error("Error setting reminder:", error)
      addMessage("Sorry, I couldn't set the reminder. Please try again.", MESSAGE_TYPE.SYSTEM)
      toast.error("Failed to set reminder", {
        description: "There was a problem setting your reminder. Please try again.",
      })
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
    <div className="flex flex-col h-screen bg-gradient-light">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center h-16 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <div className="flex items-center ml-2 flex-1">
            <BookOpen className="h-5 w-5 text-primary mr-2" />
            <h1 className="text-lg font-semibold text-primary">Journal AI</h1>
          </div>
          {/* <Button
            variant="outline"
            size="sm"
            onClick={testNotificationPermission}
            className="ml-auto mr-2"
          >
            Test Notification
          </Button> */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-gradient-light">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-4 pb-20">
            {messages.map((message, index) => {
              switch (message.type) {
                case MESSAGE_TYPE.USER:
                  return (
                    <div key={message.id} className="animate-fade-in">
                      <UserBubble message={message.content} timestamp={message.timestamp} />
                    </div>
                  )
                case MESSAGE_TYPE.AI:
                  return (
                    <div key={message.id} className="animate-fade-in">
                      <AIBubble message={message.content} timestamp={message.timestamp} type={message.suggestionType} />
                    </div>
                  )
                case MESSAGE_TYPE.SYSTEM:
                  return (
                    <div key={message.id} className="animate-fade-in">
                      <SystemMessage message={message.content} />
                    </div>
                  )
                default:
                  return null
              }
            })}
            <div ref={messagesEndRef} />

            {/* Quick Reply Buttons */}
            {chatState === CHAT_STATE.WAITING_FOR_REMINDER_CONFIRMATION && (
              <QuickReplyContainer>
                <QuickReplyButton
                  text="Yes, please"
                  onPress={() => handleReminderConfirmation(true)}
                  primary={true}
                  disabled={loading}
                />
                <QuickReplyButton
                  text="No, thanks"
                  onPress={() => handleReminderConfirmation(false)}
                  primary={false}
                  disabled={loading}
                />
              </QuickReplyContainer>
            )}

            {chatState === CHAT_STATE.WAITING_FOR_TIME_SELECTION && (
              <QuickReplyContainer>
                {suggestedTimes.map((time, index) => (
                  <QuickReplyButton
                    key={index}
                    text={time}
                    onPress={() => handleTimeSelection(time)}
                    primary={true}
                    disabled={loading}
                  />
                ))}
                <QuickReplyButton
                  text="Custom time"
                  onPress={() => handleTimeSelection("custom")}
                  primary={false}
                  disabled={loading}
                />
              </QuickReplyContainer>
            )}
          </div>
        </div>
      </main>

      {chatState === CHAT_STATE.WAITING_FOR_ENTRY && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-md">
          <div className="max-w-2xl mx-auto flex items-center">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Type your thoughts here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                className="pr-10 rounded-full border-gray-300 focus:border-primary focus:ring-primary"
                disabled={loading}
              />
              {analyzing && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                </div>
              )}
            </div>
            <Button
              size="icon"
              className="ml-2 rounded-full bg-primary hover:bg-primary/90 shadow-sm"
              onClick={handleSendEntry}
              disabled={!inputText.trim() || loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
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
