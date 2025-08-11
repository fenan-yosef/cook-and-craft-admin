"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MoreHorizontal, Eye, Package, Truck, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProfileAvatar } from "@/components/profile-avatar"

interface Order {
  id: number
  user_id: number
  user_name: string
  user_email: string
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  total: number
  items_count: number
  created_at: string
  updated_at: string
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

const statusIcons = {
  pending: Package,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const { toast } = useToast()

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      // Mock data for demonstration
      const mockOrders: Order[] = [
        {
          id: 1001,
          user_id: 1,
          user_name: "John Doe",
          user_email: "john@example.com",
          status: "pending",
          total: 89.99,
          items_count: 3,
          created_at: "2024-01-20T10:30:00Z",
          updated_at: "2024-01-20T10:30:00Z",
        },
        {
          id: 1002,
          user_id: 2,
          user_name: "Jane Smith",
          user_email: "jane@example.com",
          status: "processing",
          total: 156.5,
          items_count: 5,
          created_at: "2024-01-19T14:22:00Z",
          updated_at: "2024-01-20T09:15:00Z",
        },
        {
          id: 1003,
          user_id: 3,
          user_name: "Bob Johnson",
          user_email: "bob@example.com",
          status: "shipped",
          total: 234.75,
          items_count: 2,
          created_at: "2024-01-18T16:45:00Z",
          updated_at: "2024-01-19T11:30:00Z",
        },
        {
          id: 1004,
          user_id: 4,
          user_name: "Alice Brown",
          user_email: "alice@example.com",
          status: "delivered",
          total: 67.25,
          items_count: 1,
          created_at: "2024-01-17T09:20:00Z",
          updated_at: "2024-01-18T15:45:00Z",
        },
      ]
      setOrders(mockOrders)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      // In real app: await apiService.patch(`/orders/${orderId}`, { status: newStatus })
      setOrders(
        orders.map((order) =>
          order.id === orderId
            ? { ...order, status: newStatus as Order["status"], updated_at: new Date().toISOString() }
            : order,
        ),
      )
      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      })
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toString().includes(searchTerm) ||
      order.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user_email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
            <CardDescription>Manage customer orders and track their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const StatusIcon = statusIcons[order.status]
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.user_name}</div>
                            <div className="text-sm text-muted-foreground">{order.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status]}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.items_count} items</TableCell>
                        <TableCell>${order.total.toFixed(2)}</TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {order.status === "pending" && (
                                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "processing")}>
                                  <Package className="mr-2 h-4 w-4" />
                                  Mark Processing
                                </DropdownMenuItem>
                              )}
                              {order.status === "processing" && (
                                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "shipped")}>
                                  <Truck className="mr-2 h-4 w-4" />
                                  Mark Shipped
                                </DropdownMenuItem>
                              )}
                              {order.status === "shipped" && (
                                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "delivered")}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark Delivered
                                </DropdownMenuItem>
                              )}
                              {(order.status === "pending" || order.status === "processing") && (
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => updateOrderStatus(order.id, "cancelled")}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel Order
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
