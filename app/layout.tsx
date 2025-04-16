import './globals.css'
import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { SupabaseProvider } from "@/lib/supabase-provider"
import { AuthProvider } from "@/lib/auth-provider"
import { NotificationProvider } from "@/lib/notification-provider"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Journal AI - Your AI-powered journaling companion",
  description: "An AI-powered journaling app that helps you reflect and grow",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <SupabaseProvider>
            <AuthProvider>
              <NotificationProvider>
                {children}
                <Toaster position="top-right" closeButton richColors />
              </NotificationProvider>
            </AuthProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


