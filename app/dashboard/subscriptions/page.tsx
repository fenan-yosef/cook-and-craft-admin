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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Search,
  MoreHorizontal,
  Eye,
  Play,
  Pause,
  XCircle,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProfileAvatar } from "@/components/profile-avatar"

interface Subscription {
  id: number
  user_id: number
  user_name: string
  user_email: string
  plan_name: string
  plan_type: "weekly" | "monthly" | "quarterly"
  status: "active" | "paused" | "cancelled" | "expired"
  meals_per_week: number
  price_per_meal: number
  total_price: number
  start_date: string
  end_date?: string
  next_delivery: string
  created_at: string
  updated_at: string
}

const statusColors = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
}

const planTypeColors = {
  weekly: "bg-blue-100 text-blue-800",
  monthly: "bg-purple-100 text-purple-800",
  quarterly: "bg-indigo-100 text-indigo-800",
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      // Mock data for demonstration
      const mockSubscriptions: Subscription[] = [
        {
          id: 1,
          user_id: 1,
          user_name: "John Doe",
          user_email: "john@example.com",
          plan_name: "Family Weekly",
          plan_type: "weekly",
          status: "active",
          meals_per_week: 5,
          price_per_meal: 12.99,
          total_price: 64.95,
          start_date: "2024-01-01T00:00:00Z",
          next_delivery: "2024-01-22T00:00:00Z",
          created_at: "2024-01-01T10:30:00Z",
          updated_at: "2024-01-20T10:30:00Z",
        },
        {
          id: 2,
          user_id: 2,
          user_name: "Jane Smith",
          user_email: "jane@example.com",
          plan_name: "Couple Monthly",
          plan_type: "monthly",
          status: "active",
          meals_per_week: 3,
          price_per_meal: 14.99,
          total_price: 179.88,
          start_date: "2024-01-15T00:00:00Z",
          next_delivery: "2024-01-29T00:00:00Z",
          created_at: "2024-01-15T14:22:00Z",
          updated_at: "2024-01-19T14:22:00Z",
        },
        {
          id: 3,
          user_id: 3,
          user_name: "Bob Johnson",
          user_email: "bob@example.com",
          plan_name: "Solo Weekly",
          plan_type: "weekly",
          status: "paused",
          meals_per_week: 2,
          price_per_meal: 15.99,
          total_price: 31.98,
          start_date: "2023-12-01T00:00:00Z",
          next_delivery: "2024-02-05T00:00:00Z",
          created_at: "2023-12-01T16:45:00Z",
          updated_at: "2024-01-18T16:45:00Z",
        },
        {
          id: 4,
          user_id: 4,
          user_name: "Alice Brown",
          user_email: "alice@example.com",
          plan_name: "Premium Quarterly",
          plan_type: "quarterly",
          status: "cancelled",
          meals_per_week: 4,
          price_per_meal: 13.99,
          total_price: 727.48,
          start_date: "2023-10-01T00:00:00Z",
          end_date: "2024-01-15T00:00:00Z",
          next_delivery: "2024-01-15T00:00:00Z",
          created_at: "2023-10-01T09:20:00Z",
          updated_at: "2024-01-15T09:20:00Z",
        },
      ]
      setSubscriptions(mockSubscriptions)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch subscriptions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSubscriptionStatus = async (subscriptionId: number, newStatus: Subscription["status"]) => {
    try {
      // In real app: await apiService.put(`/subscriptions/${subscriptionId}`, { status: newStatus })
      setSubscriptions(
        subscriptions.map((sub) =>
          sub.id === subscriptionId
            ? {
                ...sub,
                status: newStatus,
                updated_at: new Date().toISOString(),
                end_date: newStatus === "cancelled" ? new Date().toISOString() : sub.end_date,
              }
            : sub,
        ),
      )
      toast({
        title: "Success",
        description: `Subscription ${newStatus} successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subscription status",
        variant: "destructive",
      })
    }
  }

  const viewSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription)
    setIsViewDialogOpen(true)
  }

  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const matchesSearch =
      subscription.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.plan_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || subscription.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter((s) => s.status === "active").length,
    paused: subscriptions.filter((s) => s.status === "paused").length,
    cancelled: subscriptions.filter((s) => s.status === "cancelled").length,
    revenue: subscriptions.filter((s) => s.status === "active").reduce((sum, s) => sum + s.total_price, 0),
  }

  return (
    <div className="flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Subscriptions Management</h1>
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-end px-4">
            <ProfileAvatar />
          </div>
        </header>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Subscriptions</h2>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paused</CardTitle>
              <Pause className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.revenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Subscriptions</CardTitle>
            <CardDescription>Manage customer subscriptions and meal plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subscriptions..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Meals/Week</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Next Delivery</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subscription.user_name}</div>
                          <div className="text-sm text-muted-foreground">{subscription.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subscription.plan_name}</div>
                          <Badge className={planTypeColors[subscription.plan_type]} variant="outline">
                            {subscription.plan_type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[subscription.status]}>{subscription.status}</Badge>
                      </TableCell>
                      <TableCell>{subscription.meals_per_week}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">${subscription.total_price.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            ${subscription.price_per_meal.toFixed(2)}/meal
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(subscription.next_delivery).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Started: {new Date(subscription.start_date).toLocaleDateString()}</div>
                          {subscription.end_date && (
                            <div className="text-muted-foreground">
                              Ended: {new Date(subscription.end_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewSubscription(subscription)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {subscription.status === "active" && (
                              <DropdownMenuItem onClick={() => updateSubscriptionStatus(subscription.id, "paused")}>
                                <Pause className="mr-2 h-4 w-4" />
                                Pause Subscription
                              </DropdownMenuItem>
                            )}
                            {subscription.status === "paused" && (
                              <DropdownMenuItem onClick={() => updateSubscriptionStatus(subscription.id, "active")}>
                                <Play className="mr-2 h-4 w-4" />
                                Resume Subscription
                              </DropdownMenuItem>
                            )}
                            {(subscription.status === "active" || subscription.status === "paused") && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => updateSubscriptionStatus(subscription.id, "cancelled")}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel Subscription
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Subscription Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Subscription Details</DialogTitle>
              <DialogDescription>View complete subscription information</DialogDescription>
            </DialogHeader>
            {selectedSubscription && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Customer</Label>
                    <div className="mt-1">
                      <p className="font-medium">{selectedSubscription.user_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedSubscription.user_email}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="mt-1">
                      <Badge className={statusColors[selectedSubscription.status]}>{selectedSubscription.status}</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Plan</Label>
                    <div className="mt-1">
                      <p className="font-medium">{selectedSubscription.plan_name}</p>
                      <Badge className={planTypeColors[selectedSubscription.plan_type]} variant="outline">
                        {selectedSubscription.plan_type}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Meals per Week</Label>
                    <p className="text-sm mt-1">{selectedSubscription.meals_per_week} meals</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Pricing</Label>
                    <div className="mt-1">
                      <p className="font-medium">${selectedSubscription.total_price.toFixed(2)} total</p>
                      <p className="text-sm text-muted-foreground">
                        ${selectedSubscription.price_per_meal.toFixed(2)} per meal
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Next Delivery</Label>
                    <div className="mt-1 flex items-center">
                      <Calendar className="mr-1 h-4 w-4" />
                      <p className="text-sm">{new Date(selectedSubscription.next_delivery).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Start Date</Label>
                    <p className="text-sm mt-1">{new Date(selectedSubscription.start_date).toLocaleDateString()}</p>
                  </div>
                  {selectedSubscription.end_date && (
                    <div>
                      <Label className="text-sm font-medium">End Date</Label>
                      <p className="text-sm mt-1">{new Date(selectedSubscription.end_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="mr-1 h-4 w-4" />
                      Created: {new Date(selectedSubscription.created_at).toLocaleDateString()}
                    </div>
                    <div>Last updated: {new Date(selectedSubscription.updated_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
