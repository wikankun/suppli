interface StockItem {
  id: string
  name: string
  stock: number
  lastOrdered: string
  category: string
  history: StockHistory[]
}

interface StockHistory {
  date: string
  change: number
  previousStock: number
  newStock: number
  action: "increase" | "decrease" | "set"
}

class StockDatabase {
  private dbName = "StockManagementDB"
  private version = 1
  private db: IDBDatabase | null = null

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
}

export const stockDB = new StockDatabase()
