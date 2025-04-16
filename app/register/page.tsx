"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, BookOpen, Mail, Lock } from "lucide-react"

// This should match the value in auth-provider.tsx
const AUTO_LOGIN = true

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { signUp, user } = useAuth()
  const router = useRouter()

  // Check for auto-login on component mount
  useEffect(() => {
    if (AUTO_LOGIN || user) {
      router.push("/dashboard")
    }
  }, [user, router])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    try {
      setLoading(true)
      setError("")
      await signUp(email, password)
      alert("Check your email for the confirmation link!")
      router.push("/login")
    } catch (error: any) {
      setError(error.message || "Failed to sign up")
    } finally {
      setLoading(false)
    }
  }

  // If auto-login is enabled, show loading state
  if (AUTO_LOGIN) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="mb-4 rounded-full bg-primary/10 p-3">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-primary">Journal AI</h1>
            <p className="mb-4 text-gray-500">Your AI-powered journaling companion</p>
          </div>
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-500">Auto-login enabled, redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="mb-4 rounded-full bg-primary/10 p-3">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Journal AI</h1>
          <p className="mt-2 text-gray-500">Your AI-powered journaling companion</p>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <CardDescription className="text-center">Start your journaling journey today</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="animate-fade-in">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoCapitalize="none"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Account
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <div className="text-center w-full">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
