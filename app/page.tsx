"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Search, Plus, Minus, Package, Clock, Tag, History, DeleteIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Navigation } from "@/components/navigation"
import { useDatabase } from "@/contexts/database-context"
import { stockDB } from "@/lib/database"
import { formatDate } from "@/lib/utils"
import { categories } from "@/lib/constants"

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

export default function HomePage() {
  const { isReady } = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<StockItem[]>([])
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [stockChange, setStockChange] = useState(0)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newItem, setNewItem] = useState({
    name: "",
    stock: 0,
    category: "",
  })

  // Search functionality
  useEffect(() => {
    if (!isReady || !searchQuery.trim()) {
      setSearchResults([])
      setSelectedItem(null)
      return
    }

    const searchItems = async () => {
      const results = await stockDB.searchItems(searchQuery)
      setSearchResults(results)
    }

    const debounceTimer = setTimeout(searchItems, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, isReady])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    const results = await stockDB.searchItems(searchQuery)
    if (results.length === 1) {
      setSelectedItem(results[0])
      setSearchResults([])
    }
  }

  const handleStockUpdate = async () => {
    if (!selectedItem || stockChange === 0) return

    const newStock = selectedItem.stock + stockChange
    if (newStock < 0) return

    const action = stockChange > 0 ? "increase" : "decrease"
    await stockDB.updateStock(selectedItem.id, newStock, action)

    // Refresh the selected item
    const updatedItem = await stockDB.getItem(selectedItem.id)
    if (updatedItem) {
      setSelectedItem(updatedItem)
    }
    setStockChange(0)
  }

  const handleAddItem = async () => {
    if (!newItem.name.trim()) return

    await stockDB.addItem({
      name: newItem.name,
      stock: newItem.stock,
      lastOrdered: new Date().toISOString(),
      category: newItem.category || "Other",
    })

    setNewItem({ name: "", stock: 0, category: "" })
    setShowAddDialog(false)
    setSearchQuery("")
  }

  const recommendations = useMemo(() => {
    return searchResults.slice(0, 5)
  }, [searchResults])

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

  const handleClear = () => {
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Navigation />

      <div className="container mx-auto p-4 max-w-4xl">
        <div className="space-y-6">
          <div className="text-center px-4">
            <h1 className="text-xl md:text-2xl font-bold mb-2">Search or Add Items</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Look up for items or add new ones.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute top-0 left-4 h-full w-5 text-muted-foreground" />
              <Input
                placeholder="Search or add items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-12 pl-12 h-12 text-md"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  className="absolute top-0 right-0 h-full w-12 text-muted-foreground"
                >
                  <DeleteIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>

          {/* Search Recommendations */}
          {recommendations.length > 0 && !selectedItem && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {recommendations.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted active:bg-muted/80 transition-colors"
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Package className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.category}</p>
                        </div>
                      </div>
                      <Badge variant={item.stock > 0 ? "default" : "destructive"} className="ml-2 flex-shrink-0">
                        {item.stock}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Results - Add Item Option */}
          {searchQuery.trim() && searchResults.length === 0 && !selectedItem && (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No items found</h3>
                <p className="text-muted-foreground mb-6 px-4">
                  Add "{searchQuery}" to your inventory?
                </p>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button
                      size="lg"
                      className="w-full max-w-xs"
                      onClick={() => setNewItem({ ...newItem, name: searchQuery })}
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add "{searchQuery.substring(0, 20)}{searchQuery.length > 20 ? '...' : ''}"
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="mx-4 max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Add New Item</DialogTitle>
                      <DialogDescription>Add a new item to your inventory</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Item Name</Label>
                        <Input
                          id="name"
                          value={newItem.name}
                          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                          className="h-12"
                        />
                      </div>
                      <div>
                        <Label htmlFor="stock">Initial Stock</Label>
                        <Input
                          id="stock"
                          type="number"
                          min="0"
                          value={newItem.stock}
                          onChange={(e) => setNewItem({ ...newItem, stock: Number.parseInt(e.target.value) || 0 })}
                          className="h-12"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={newItem.category}
                          onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
                      <Button variant="outline" onClick={() => setShowAddDialog(false)} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                      <Button onClick={handleAddItem} className="w-full sm:w-auto">
                        Add Item
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* Selected Item Details */}
          {selectedItem && (
            <Card>
              <CardHeader className="pb-4">
                <div className="space-y-3">
                  <CardTitle className="flex items-start space-x-3">
                    <Package className="h-6 w-6 mt-0.5 flex-shrink-0" />
                    <span className="text-xl leading-tight">{selectedItem.name}</span>
                  </CardTitle>
                  <div className="flex flex-col space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4" />
                      <span>{selectedItem.category}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Last ordered: {formatDate(selectedItem.lastOrdered)}</span>
                    </div>
                  </div>
                  <Badge
                    variant={selectedItem.stock > 0 ? "default" : "destructive"}
                    className="text-sm px-4 py-2 w-fit"
                  >
                    Stock: {selectedItem.stock} → {selectedItem.stock + stockChange}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stock Update Form */}
                <div className="space-y-4">
                  {/* <h3 className="font-medium text-md">Update Stock</h3> */}
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-12 w-12 flex-shrink-0"
                      onClick={() => setStockChange(stockChange - 1)}
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 text-center">
                      <Input
                        type="number"
                        value={stockChange}
                        onChange={(e) => setStockChange(Number.parseInt(e.target.value) || 0)}
                        className="text-center h-12 text-lg"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-12 w-12 flex-shrink-0"
                      onClick={() => setStockChange(stockChange + 1)}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleStockUpdate}
                    disabled={stockChange === 0 || selectedItem.stock + stockChange < 0}
                    className="w-full h-12 text-md"
                    size="lg"
                  >
                    Update Stock
                  </Button>
                </div>

                {/* Stock History */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full h-12 text-sm" size="lg">
                      <History className="h-5 w-5 mr-2" />
                      View Stock History
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {selectedItem.history.toReversed().map((entry, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {entry.action === "set"
                                ? "Initial stock"
                                : entry.action === "increase"
                                  ? "Stock increased"
                                  : "Stock decreased"}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-sm font-medium">
                              {entry.previousStock} → {entry.newStock}
                            </p>
                            <p
                              className={`text-xs ${entry.change > 0 ? "text-green-600" : entry.change < 0 ? "text-red-600" : "text-muted-foreground"}`}
                            >
                              {entry.change > 0 ? "+" : ""}
                              {entry.change}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
