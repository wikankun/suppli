import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Inter } from "next/font/google"
import { DatabaseProvider } from "@/contexts/database-context"
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Suppli",
  description: "Simple stock management for household items",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DatabaseProvider>{children}</DatabaseProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
