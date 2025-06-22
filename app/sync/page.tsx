"use client"

import { useState, useEffect } from "react"
import { Download, Upload, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Navigation } from "@/components/navigation"
import { useDatabase } from "@/contexts/database-context"
import { stockDB } from "@/lib/database"
import { Input } from "@/components/ui/input"

export default function SyncPage() {
  const { isReady } = useDatabase()
  const [exportData, setExportData] = useState("")
  const [importData, setImportData] = useState("")
  // const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const generateExportData = async () => {
    try {
      const data = await stockDB.exportData()
      setExportData(data)

      // Generate QR code URL using a free QR code API
      // const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`
      // setQrCodeUrl(qrUrl)

      setMessage({ type: "success", text: "Export data generated successfully!" })
    } catch (error) {
      setMessage({ type: "error", text: "Failed to export data" })
    }
  }

  const handleImport = async () => {
    if (!importData.trim()) {
      setMessage({ type: "error", text: "Please enter data to import" })
      return
    }

    try {
      await stockDB.importData(importData)
      setMessage({ type: "success", text: "Data imported successfully!" })
      setImportData("")
    } catch (error) {
      setMessage({ type: "error", text: "Failed to import data. Please check the format." })
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportData)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      setMessage({ type: "error", text: "Failed to copy to clipboard" })
    }
  }

  const downloadAsFile = () => {
    const blob = new Blob([exportData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stock-data-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Navigation />

      <div className="container mx-auto p-4 max-w-4xl">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-xl md:text-2xl font-bold mb-2">Data Sync</h1>
            <p className="text-muted-foreground text-sm md:text-base px-4">
              Export and import your inventory data for backup or sharing
            </p>
          </div>

          {message && (
            <Alert className={message.type === "error" ? "border-red-500" : "border-green-500"}>
              <AlertDescription className={message.type === "error" ? "text-red-700" : "text-green-700"}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Download className="h-5 w-5" />
                <span>Export Data</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Generate a backup of your inventory data that can be shared via code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button onClick={generateExportData} className="w-full h-12" size="lg">
                Generate Export Data
              </Button>

              {exportData && (
                <div className="space-y-6">
                  {/* QR Code */}
                  {/* {qrCodeUrl && (
                    <div className="text-center">
                      <h3 className="font-medium mb-4 text-lg">QR Code</h3>
                      <div className="inline-block p-4 bg-white rounded-lg border">
                        <img
                          src={qrCodeUrl || "/placeholder.svg"}
                          alt="QR Code"
                          className="w-48 h-48 md:w-64 md:h-64 mx-auto"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-4 px-4">
                        Scan this QR code to import data on another device
                      </p>
                    </div>
                  )} */}

                  {/* Export Data Text */}
                  <div>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-2 md:space-y-0">
                      <h3 className="font-medium text-lg">Export Code</h3>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex-1 md:flex-none">
                          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={downloadAsFile} className="flex-1 md:flex-none">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={exportData}
                      readOnly
                      className="font-mono text-xs"
                      placeholder="Export data will appear here..."
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Upload className="h-5 w-5" />
                <span>Import Data</span>
              </CardTitle>
              <CardDescription className="text-sm">Import inventory data from another device or backup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-3">Import Code</h3>
                <Input
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="font-mono text-xs"
                  placeholder="Paste your export data here..."
                />
              </div>
              <Button onClick={handleImport} className="w-full h-12" size="lg" disabled={!importData.trim()}>
                Import Data
              </Button>
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Warning:</strong> Importing data will merge with your existing inventory. Items with the same
                  ID will be overwritten.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How to Sync</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-3">To backup your data:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground pl-2">
                  <li>Click "Generate Code" to generate backup code</li>
                  <li>Copy the code</li>
                  <li>Store it safely for future use</li>
                </ol>
              </div>
              <div>
                <h3 className="font-medium mb-3">To sync between devices:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground pl-2">
                  <li>Generate code on your source device</li>
                  <li>Copy the code</li>
                  <li>On the target device, paste the code in the import section</li>
                  <li>Click "Import Data" to sync your inventory</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
