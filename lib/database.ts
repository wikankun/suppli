import { categories } from "./constants"
import SyncService, { SyncResult, SyncData, Conflict } from "./sync-service"
import EncryptionService, { EncryptionResult } from './encryption';
import DeviceManager from "./device-manager"

export interface StockItem {
  id: string
  name: string
  stock: number
  lastOrdered: string
  category: string
  history: StockHistory[]
}

export interface StockHistory {
  date: string
  change: number
  previousStock: number
  newStock: number
  action: "increase" | "decrease" | "set"
}

export interface Category {
  name: string
}

class StockDatabase {
  private dbName = "StockManagementDB"
  private version = 2
  private db: IDBDatabase | null = null
  private readonly LAST_SYNC_KEY = "suppli_last_sync_timestamp"

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains("items")) {
          const store = db.createObjectStore("items", { keyPath: "id" })
          store.createIndex("name", "name", { unique: false })
          store.createIndex("category", "category", { unique: false })
        }

        if (!db.objectStoreNames.contains("categories")) {
          const store = db.createObjectStore("categories", { keyPath: "name" })
          store.createIndex("name", "name", { unique: false })
          categories.forEach(async category => {
            await store.add({name: category})
          });
        }
      }
    })
  }

  async addItem(item: Omit<StockItem, "id" | "history">): Promise<string> {
    const id = crypto.randomUUID()
    const newItem: StockItem = {
      ...item,
      id,
      history: [
        {
          date: new Date().toISOString(),
          change: item.stock,
          previousStock: 0,
          newStock: item.stock,
          action: "set",
        },
      ],
    }

    const transaction = this.db!.transaction(["items"], "readwrite")
    const store = transaction.objectStore("items")
    await store.add(newItem)
    return id
  }

  async deleteItem(id: string) {
    const transaction = this.db!.transaction(["items"], "readwrite")
    const store = transaction.objectStore("items")
    await store.delete(id)
  }

  async updateStock(id: string, newStock: number, action: "increase" | "decrease" | "set"): Promise<void> {
    const transaction = this.db!.transaction(["items"], "readwrite")
    const store = transaction.objectStore("items")

    const item = await new Promise<StockItem | undefined>((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    if (!item) throw new Error("Item not found")

    const previousStock = item.stock
    const change = newStock - previousStock

    if (change > 0) {
      item.lastOrdered = new Date().toISOString()
    }

    item.stock = newStock
    item.history.push({
      date: new Date().toISOString(),
      change,
      previousStock,
      newStock,
      action,
    })

    await store.put(item)
  }

  async getAllItems(): Promise<StockItem[]> {
    const transaction = this.db!.transaction(["items"], "readonly")
    const store = transaction.objectStore("items")
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async searchItems(query: string): Promise<StockItem[]> {
    const items = await this.getAllItems()
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()),
    )
  }

  async getItem(id: string): Promise<StockItem | null> {
    const transaction = this.db!.transaction(["items"], "readonly")
    const store = transaction.objectStore("items")
    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async addCategory(category: Category): Promise<string> {
    const transaction = this.db!.transaction(["categories"], "readwrite")
    const store = transaction.objectStore("categories")
    await store.add(category)
    return category.name
  }

  async getAllCategories(): Promise<Category[]> {
    const transaction = this.db!.transaction(["categories"], "readonly")
    const store = transaction.objectStore("categories")
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async exportData(): Promise<string> {
    const items = await this.getAllItems()
    const cleanedItems = items.map(item => ({
      ...item,
      history: []
    }));
    return JSON.stringify(cleanedItems, null, 0)
  }

  async importData(jsonData: string): Promise<void> {
    const items: StockItem[] = JSON.parse(jsonData)
    const transaction = this.db!.transaction(["items"], "readwrite")
    const store = transaction.objectStore("items")

    for (const item of items) {
      await store.put(item)
    }
  }

  // SYNC METHODS

  /**
   * Get the last sync timestamp from localStorage
   */
  async getLastSyncTimestamp(): Promise<number> {
    if (typeof window === 'undefined') {
      return 0; // Server-side, return 0
    }
    const timestamp = localStorage.getItem(this.LAST_SYNC_KEY)
    return timestamp ? parseInt(timestamp) : 0
  }

  /**
   * Set the last sync timestamp in localStorage
   */
  async setLastSyncTimestamp(timestamp: number): Promise<void> {
    if (typeof window === 'undefined') {
      return; // Server-side, cannot set localStorage
    }
    localStorage.setItem(this.LAST_SYNC_KEY, timestamp.toString())
  }

  /**
   * Get data ready for sync
   */
  async getSyncData(): Promise<{ items: StockItem[], categories: Category[] }> {
    const items = await this.getAllItems()
    const categories = await this.getAllCategories()
    return { items, categories }
  }

  /**
   * Apply sync data to local database
   */
  async applySyncData(data: SyncData): Promise<void> {
    const transaction = this.db!.transaction(["items", "categories"], "readwrite")
    const itemsStore = transaction.objectStore("items")
    const categoriesStore = transaction.objectStore("categories")

    // Clear existing data
    await itemsStore.clear()
    await categoriesStore.clear()

    // Add categories first (items depend on them)
    for (const category of data.categories) {
      await categoriesStore.add(category)
    }

    // Add items
    for (const item of data.items) {
      await itemsStore.put(item)
    }

    // Update last sync timestamp
    await this.setLastSyncTimestamp(data.timestamp)
  }

  /**
   * Perform full synchronization with Vercel Blob
   */
  async syncData(forceUpload: boolean = false): Promise<SyncResult> {
    try {
      // Get local data
      const { items, categories } = await this.getSyncData()

      // Perform sync using SyncService
      const result = await SyncService.fullSync(items, categories, forceUpload)

      // If sync was successful and we downloaded data, apply it
      if (result.success && result.downloaded) {
        // We would need the actual downloaded data here
        // For now, update the last sync timestamp
        await this.setLastSyncTimestamp(Date.now())
      }

      return result
    } catch (error) {
      console.error('Sync failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown sync error'
      }
    }
  }

  /**
   * Check if sync is needed
   */
  async needsSync(): Promise<boolean> {
    if (!DeviceManager.isInSyncGroup()) {
      return false
    }

    const lastLocalSync = await this.getLastSyncTimestamp()
    return SyncService.needsSync(lastLocalSync)
  }

  /**
   * Get sync status information
   */
  async getSyncStatus(): Promise<{
    isEnabled: boolean
    lastSync?: number
    deviceCount: number
    hasRemoteData: boolean
    needsSync: boolean
  }> {
    const isEnabled = DeviceManager.isInSyncGroup()
    const lastSync = await this.getLastSyncTimestamp()
    const needsSync = await this.needsSync()

    if (!isEnabled) {
      return {
        isEnabled: false,
        deviceCount: 0,
        hasRemoteData: false,
        needsSync: false
      }
    }

    const status = await SyncService.getSyncStatus()
    return {
      isEnabled: true,
      lastSync: lastSync || status.lastSync,
      deviceCount: status.deviceCount,
      hasRemoteData: status.hasData,
      needsSync
    }
  }

  /**
   * Generate checksum for data integrity
   */
  async generateChecksum(): Promise<string> {
    const { items, categories } = await this.getSyncData()
    return EncryptionService.createHash({ items, categories })
  }

  /**
   * Export all data including sync information
   */
  async exportFullData(): Promise<string> {
    const { items, categories } = await this.getSyncData()
    const syncStatus = await this.getSyncStatus()
    const deviceInfo = DeviceManager.getDeviceInfo()

    const exportData = {
      version: '1.0.0',
      timestamp: Date.now(),
      deviceInfo,
      syncStatus,
      items,
      categories
    }

    return JSON.stringify(exportData, null, 0)
  }

  /**
   * Import full data including sync information
   */
  async importFullData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData)

    // Validate data structure
    if (!data.items || !data.categories) {
      throw new Error('Invalid data format')
    }

    // Apply data
    const syncData: SyncData = {
      version: data.version || '1.0.0',
      deviceId: data.deviceInfo?.id || 'imported',
      timestamp: data.timestamp || Date.now(),
      items: data.items,
      categories: data.categories,
      metadata: {
        lastSyncId: `import-${Date.now()}`,
        checksum: await EncryptionService.createHash({ items: data.items, categories: data.categories }),
        compressed: false,
        deviceId: data.deviceInfo?.id || 'imported',
        deviceName: data.deviceInfo?.name || 'Imported Device'
      }
    }

    await this.applySyncData(syncData)

    // If sync info is included, optionally join the sync group
    if (data.syncStatus && data.syncStatus.isEnabled && data.deviceInfo) {
      // Note: In production, you'd want user confirmation for this
      DeviceManager.addDeviceToSyncGroup(data.deviceInfo)
    }
  }

  /**
   * Reset sync data
   */
  async resetSync(): Promise<void> {
    // Clear local sync timestamp
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.LAST_SYNC_KEY)
    }

    // Leave sync group
    DeviceManager.leaveSyncGroup()
  }
}

export const stockDB = new StockDatabase()
