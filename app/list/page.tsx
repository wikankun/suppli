"use client"

import { useState, useEffect } from "react"
import { Package, Search, Filter, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Navigation } from "@/components/navigation"
import { useDatabase } from "@/contexts/database-context"
import { stockDB } from "@/lib/database"
import { formatDate } from "@/lib/utils"
import { categories } from "@/lib/constants"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface StockItem {
  id: string
  name: string
  stock: number
  lastOrdered: string
  category: string
  history: any[]
}

export default function ListPage() {
  const { isReady } = useDatabase()
  const [items, setItems] = useState<StockItem[]>([])
  const [filteredItems, setFilteredItems] = useState<StockItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"name" | "stock" | "lastOrdered" | "category">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [deleteTarget, setDeleteTarget] = useState<StockItem | null>(null)

  useEffect(() => {
    if (!isReady) return

    const loadItems = async () => {
      const allItems = await stockDB.getAllItems()
      setItems(allItems)
    }

    loadItems()
  }, [isReady])

  useEffect(() => {
    let filtered = items

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter)
    }

    if (stockFilter !== "all") {
      if (stockFilter === "inStock") {
        filtered = filtered.filter((item) => item.stock > 1)
      }
      if (stockFilter === "lowStock") {
        filtered = filtered.filter((item) => item.stock > 0 && item.stock <= 1)
      }
      if (stockFilter === "outOfStock") {
        filtered = filtered.filter((item) => item.stock === 0)
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy]
      let bValue: any = b[sortBy]

      if (sortBy === "lastOrdered") {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    setFilteredItems(filtered)
  }, [items, searchQuery, categoryFilter, stockFilter, sortBy, sortOrder])

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) return null
    return sortOrder === "asc" ? "↑" : "↓"
  }

  const handleDelete = async () => {
    // const isConfirmed = confirm("Are you sure you want to delete this item ?")
    if (deleteTarget) {
      await stockDB.deleteItem(deleteTarget.id)
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success("Item deleted")
    }
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

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent
          onOpenAutoFocus={(e: Event) => e.preventDefault()}
          className="rounded-lg border p-6 w-full max-w-[calc(100%-2rem)] sm:max-w-lg"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete "{deleteTarget?.name}"? <br/>This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="container mx-auto p-4 max-w-4xl">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-xl md:text-2xl font-bold mb-2">Inventory List</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Complete overview of all items in your inventory
            </p>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">-- select category --</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Filter by stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">-- select stock status --</SelectItem>
                    <SelectItem key="inStock" value="inStock">
                      In Stock
                    </SelectItem>
                    <SelectItem key="lowStock" value="lowStock">
                      Running Low
                    </SelectItem>
                    <SelectItem key="outOfStock" value="outOfStock">
                      Out Of Stock
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">
                    Showing {filteredItems.length} of {items.length} items
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Display */}
          <Card>
            <CardContent className="p-0">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No items found</h3>
                  <p className="text-muted-foreground text-sm">
                    {items.length === 0
                      ? "Your inventory is empty. Add some items to get started."
                      : "No items match your current filters."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="md:hidden divide-y">
                    {filteredItems.map((item) => (
                      <div key={item.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <Package className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium truncate">{item.name}</h3>
                              <p className="text-sm text-muted-foreground">{formatDate(item.lastOrdered)}</p>
                            </div>
                          </div>
                          <Badge variant={item.stock > 0 ? "default" : "destructive"} className="ml-2 flex-shrink-0">
                            {item.stock}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <Badge variant="outline">{item.category}</Badge>
                          <Trash2 className="cursor-pointer" onClick={() => setDeleteTarget(item)}></Trash2>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("name")}>
                            Name {getSortIcon("name")}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted text-center"
                            onClick={() => handleSort("stock")}
                          >
                            Stock {getSortIcon("stock")}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted"
                            onClick={() => handleSort("lastOrdered")}
                          >
                            Last Ordered {getSortIcon("lastOrdered")}
                          </TableHead>
                          <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("category")}>
                            Category {getSortIcon("category")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => (
                          <TableRow key={item.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span>{item.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={item.stock > 0 ? "default" : "destructive"}>{item.stock}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(item.lastOrdered)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <Trash2 className="cursor-pointer" onClick={() => setDeleteTarget(item)}></Trash2>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          {items.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-xl md:text-2xl font-bold">{items.length}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Total Items</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-xl md:text-2xl font-bold">
                    {items.reduce((acc, item) => acc + item.stock, 0)}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">Total Stock</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-xl md:text-2xl font-bold text-green-600">
                    {items.filter((item) => item.stock > 3).length}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">In Stock</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-xl md:text-2xl font-bold text-yellow-600">
                    {items.filter((item) => (item.stock > 0 && item.stock <= 3)).length}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">Running Low</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-xl md:text-2xl font-bold text-red-600">
                    {items.filter((item) => item.stock === 0).length}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">Out of Stock</div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
