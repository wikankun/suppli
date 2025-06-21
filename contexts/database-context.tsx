"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { stockDB } from "@/lib/database"

interface DatabaseContextType {
  isReady: boolean
  error: string | null
}

const DatabaseContext = createContext<DatabaseContextType>({
  isReady: false,
  error: null,
})

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initDB = async () => {
      try {
        await stockDB.init()
        setIsReady(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Database initialization failed")
      }
    }

    initDB()
  }, [])

  return <DatabaseContext.Provider value={{ isReady, error }}>{children}</DatabaseContext.Provider>
}

export const useDatabase = () => useContext(DatabaseContext)
