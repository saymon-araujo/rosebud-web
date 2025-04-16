"use client"

import type React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

type UserBubbleProps = {
  message: string
  timestamp?: string
}

export function UserBubble({ message, timestamp }: UserBubbleProps) {
  return (
    <div className="flex justify-end mb-4">
      <div className="user-bubble shadow-sm">
        <p className="text-gray-800">{message}</p>
        {timestamp && <p className="text-[11px] text-gray-500 text-right mt-1">{timestamp}</p>}
      </div>
    </div>
  )
}

type AIBubbleProps = {
  message: string
  timestamp?: string
  type?: string
}

export function AIBubble({ message, timestamp, type }: AIBubbleProps) {
  // Get icon based on suggestion type
  const getIcon = () => {
    switch (type) {
      case "sleep":
        return "🌙"
      case "stress":
        return "🍃"
      case "hydration":
        return "💧"
      case "exercise":
        return "🏃‍♂️"
      case "nutrition":
        return "🥗"
      case "screen-time":
        return "📱"
      case "social":
        return "👥"
      case "mindfulness":
        return "🧘‍♀️"
      case "productivity":
        return "📝"
      default:
        return "💬"
    }
  }

  return (
    <div className="flex mb-4">
      <Avatar className="h-8 w-8 mr-2">
        <AvatarImage src="/abstract-ai-network.png" alt="Journal AI" />
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="ai-bubble shadow-sm">
        <div className="flex items-center mb-1">
          <span className="mr-1">{getIcon()}</span>
          <span className="text-primary font-semibold text-sm">Journal AI</span>
        </div>
        <p className="text-gray-800">{message}</p>
        {timestamp && <p className="text-[11px] text-gray-500 text-right mt-1">{timestamp}</p>}
      </div>
    </div>
  )
}

type QuickReplyButtonProps = {
  text: string
  onPress: () => void
  primary?: boolean
  disabled?: boolean
}

export function QuickReplyButton({ text, onPress, primary = true, disabled = false }: QuickReplyButtonProps) {
  return (
    <Button
      variant={primary ? "default" : "outline"}
      size="sm"
      className={cn(
        "rounded-full px-4 py-2 m-1 shadow-sm hover:shadow transition-all",
        primary ? "" : "border-primary text-primary hover:bg-primary/10",
      )}
      onClick={onPress}
      disabled={disabled}
    >
      {text}
    </Button>
  )
}

type QuickReplyContainerProps = {
  children: React.ReactNode
}

export function QuickReplyContainer({ children }: QuickReplyContainerProps) {
  return <div className="flex flex-wrap justify-center my-4 px-3 animate-fade-in">{children}</div>
}

type SystemMessageProps = {
  message: string
}

export function SystemMessage({ message }: SystemMessageProps) {
  return (
    <div className="flex justify-center my-3">
      <span className="system-message shadow-sm">{message}</span>
    </div>
  )
}
