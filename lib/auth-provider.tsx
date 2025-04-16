"use client"

import type React from "react"

import { createContext, useState, useEffect, useContext } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "./supabase-provider"
import type { User } from "@supabase/supabase-js"

// Auto-login configuration
const AUTO_LOGIN = true
const AUTO_LOGIN_EMAIL = "saymonbrandon@gmail.com"
const AUTO_LOGIN_PASSWORD = "@mico123"

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { supabase } = useSupabase()
  const router = useRouter()

  useEffect(() => {
    // Check for active session
    const checkUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(session.user)
        } else if (AUTO_LOGIN) {
          // Auto-login if enabled and no session exists
          try {
            console.log("Attempting auto-login...")
            const { data, error } = await supabase.auth.signInWithPassword({
              email: AUTO_LOGIN_EMAIL,
              password: AUTO_LOGIN_PASSWORD
            })

            if (error) {
              console.error("Auto-login failed:", error.message)
            } else {
              console.log("Auto-login successful")
              setUser(data.user)
            }
          } catch (autoLoginError) {
            console.error("Auto-login error:", autoLoginError)
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Error checking auth:", error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null)

      // Redirect based on auth state
      if (event === "SIGNED_IN" && session) {
        router.push("/dashboard")
      } else if (event === "SIGNED_OUT") {
        if (AUTO_LOGIN) {
          // If auto-login is enabled, attempt to sign in again
          try {
            console.log("Auto-login after sign out...")
            await supabase.auth.signInWithPassword({
              email: AUTO_LOGIN_EMAIL,
              password: AUTO_LOGIN_PASSWORD
            })
          } catch (error) {
            console.error("Auto-login after signout failed:", error)
            router.push("/login")
          }
        } else {
          router.push("/login")
        }
      }
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [supabase, router])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (error) {
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
    } catch (error) {
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      throw error
    }
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
