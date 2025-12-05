"use client"

import { useState } from "react"
import { Download, Upload, Copy, Check, AlertCircle, Unlink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navigation } from "@/components/navigation"
import { useDatabase } from "@/contexts/database-context"
import { useSimpleSync } from "@/contexts/sync-context"
import { SimpleQR } from "@/components/sync/simple-qr"
import { stockDB } from "@/lib/database"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function SyncPage() {
  const { isReady } = useDatabase()
  const {
    isConfigured,
    syncToken,
    lastSync,
    remoteLastSync,
    syncInProgress,
    syncNow,
    unSync,
  } = useSimpleSync()

  const [exportData, setExportData] = useState("")
  const [importData, setImportData] = useState("")
  const [copied, setCopied] = useState(false)

  // Legacy export/import functionality
  const generateExportData = async () => {
    try {
      const data = await stockDB.exportData()
      setExportData(data)
      toast.success("Export data generated successfully!")
    } catch (error) {
      toast.error("Failed to export data")
    }
  }

  const generateFullExportData = async () => {
    try {
      const data = await stockDB.exportFullData()
      setExportData(data)
      toast.success("Full export data generated successfully!")
    } catch (error) {
      toast.error("Failed to generate full export")
    }
  }

  const handleImport = async () => {
    if (!importData.trim()) {
      toast.error("Please enter data to import")
      return
    }

    try {
      // Try full import first (with sync info)
      await stockDB.importFullData(importData)
      toast.success("Data imported successfully!")
      setImportData("")
    } catch (error) {
      try {
        // Fallback to legacy import
        await stockDB.importData(importData)
        toast.success("Data imported successfully!")
        setImportData("")
      } catch (legacyError) {
        toast.error("Failed to import data. Please check the format")
      }
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportData)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy to clipboard")
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

  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return "Never"
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

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
              Simple and secure sync using a single sync token
            </p>
          </div>

          <Tabs defaultValue="auto-sync" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="auto-sync">Auto Sync</TabsTrigger>
              <TabsTrigger value="manual">Manual Sync</TabsTrigger>
            </TabsList>

            {/* Auto Sync Tab */}
            <TabsContent value="auto-sync" className="space-y-6">
              {/* Sync Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sync Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    <div className="flex items-center gap-2">
                      {isConfigured ? (
                        <>
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span className="text-sm text-green-600">Configured</span>
                        </>
                      ) : (
                        <>
                          <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                          <span className="text-sm text-gray-600">Not Configured</span>
                        </>
                      )}
                    </div>
                  </div>

                  {isConfigured && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <AlertCircle className="h-3 w-3" />
                          Sync Token
                        </span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {syncToken}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <AlertCircle className="h-3 w-3" />
                          Last Sync
                        </span>
                        <span className="text-muted-foreground">
                          {formatLastSync(lastSync)}
                        </span>
                      </div>
                      {remoteLastSync && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <AlertCircle className="h-3 w-3" />
                            Remote Sync
                          </span>
                          <span className="text-muted-foreground">
                            {formatLastSync(remoteLastSync)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Sync Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sync Controls</CardTitle>
                  <CardDescription>
                    {isConfigured
                      ? "Manage your sync settings"
                      : "Configure sync to access your inventory across multiple devices"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isConfigured ? (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-3">
                        <Button
                          onClick={syncNow}
                          disabled={syncInProgress}
                          className="w-full"
                        >
                          {syncInProgress ? 'Syncing...' : 'Sync Now'}
                        </Button>
                        <SimpleQR mode="generate">
                            Add Another Device
                        </SimpleQR>
                      </div>
                      <Button
                        variant="outline"
                        onClick={unSync}
                        className="w-full"
                      >
                        <Unlink className="h-4 w-4" />
                        Stop Syncing
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                      <div>
                        <h3 className="font-medium">Auto Sync Not Set Up</h3>
                        <p className="text-sm text-muted-foreground">
                          Generate a sync token to enable synchronization across devices
                        </p>
                      </div>
                      <SimpleQR mode="join" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manual Sync Tab */}
            <TabsContent value="manual" className="space-y-6">
              {/* Export Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Download className="h-5 w-5" />
                    <span>Export Data</span>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Generate a backup of your inventory data for manual sharing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button onClick={generateExportData} variant="outline" className="h-10">
                      Generate Basic Export
                    </Button>
                    <Button onClick={generateFullExportData} variant="outline" className="h-10">
                      Generate Full Export
                    </Button>
                  </div>

                  {exportData && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                        <h3 className="font-medium">Export Code</h3>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={copyToClipboard}>
                            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                            {copied ? "Copied!" : "Copy"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={downloadAsFile}>
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
                  <CardDescription className="text-sm">
                    Import inventory data from another device or backup
                  </CardDescription>
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
                  <Button onClick={handleImport} className="w-full h-10" disabled={!importData.trim()}>
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
            </TabsContent>
          </Tabs>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How to Sync</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-3">Auto Sync (Recommended):</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground pl-2">
                  <li>On your first device, click "Generate Sync Token"</li>
                  <li>Copy the token or scan the QR code</li>
                  <li>On other devices, click "Add Another Device" and enter the token</li>
                  <li>Click "Sync Now" to sync data between devices</li>
                  <li>All data is encrypted and stored securely</li>
                </ol>
              </div>
              <div>
                <h3 className="font-medium mb-3">Manual Sync:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground pl-2">
                  <li>Generate an export code on your source device</li>
                  <li>Copy the code or download as file</li>
                  <li>On the target device, paste the code in the import section</li>
                  <li>Click "Import Data" to sync your inventory</li>
                </ol>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Simple Sync:</strong> Uses a single sync token and encrypted blob storage.
                  Multiple devices can sync using the same token. To stop syncing, just clear the sync configuration.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
