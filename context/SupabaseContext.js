import { createContext } from "react"
import { supabase } from "../lib/supabase"

export const SupabaseContext = createContext(null)

export const SupabaseProvider = ({ children }) => {
  return <SupabaseContext.Provider value={{ supabase }}>{children}</SupabaseContext.Provider>
}
