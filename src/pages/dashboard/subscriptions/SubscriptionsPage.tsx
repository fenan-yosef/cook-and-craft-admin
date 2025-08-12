import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
        {
          id: 5,
          user_id: 5,
          user_name: "Charlie Davis",
          user_email: "charlie@example.com",
          plan_name: "Basic Monthly",
          plan_type: "monthly",
          status: "expired",
          meals_per_week: 2,
          price_per_meal: 11.99,
          total_price: 95.92,
          start_date: "2023-11-01T00:00:00Z",
          end_date: "2023-12-01T00:00:00Z",
          next_delivery: "2023-12-01T00:00:00Z",
          created_at: "2023-11-01T11:00:00Z",
          updated_at: "2023-12-01T11:00:00Z",
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

  const handleStatusChange = async (subscriptionId: number, status: "active" | "paused" | "cancelled") => {
    try {
      // In a real app, you'd call an API to update the status
      // await apiService.patch(`/subscriptions/${subscriptionId}`, { status });
      setSubscriptions(
        subscriptions.map((sub) => (sub.id === subscriptionId ? { ...sub, status, updated_at: new Date().toISOString() } : sub)),
      )
      toast({
        title: "Success",
        description: `Subscription status updated to ${status}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subscription status",
        variant: "destructive",
      })
    }
  }

  const openViewDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription)
    setIsViewDialogOpen(true)
  }

  const filteredSubscriptions = subscriptions
    .filter((sub) => statusFilter === "all" || sub.status === statusFilter)
    .filter(
      (sub) =>
        sub.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.plan_name.toLowerCase().includes(searchTerm.toLowerCase()),
    )

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Subscriptions</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscriptions.length}</div>
              <p className="text-xs text-muted-foreground">+5% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscriptions.filter((sub) => sub.status === "active").length}
              </div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {subscriptions
                  .filter((sub) => sub.status === "active")
                  .reduce((acc, sub) => acc + sub.total_price, 0)
                  .toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">+8% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Meals Per Week</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(
                  subscriptions.reduce((acc, sub) => acc + sub.meals_per_week, 0) / subscriptions.length
                ).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">Average across all plans</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Subscriptions</CardTitle>
            <CardDescription>Manage user subscriptions and their statuses</CardDescription>
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
                  <SelectItem value="all">All Statuses</SelectItem>
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
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Price</TableHead>
                  <TableHead>Next Delivery</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="font-medium">{sub.user_name}</div>
                        <div className="text-sm text-muted-foreground">{sub.user_email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{sub.plan_name}</div>
                        <Badge
                          className={`${
                            planTypeColors[sub.plan_type]
                          } hover:bg-opacity-80`}
                        >
                          {sub.plan_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${
                            statusColors[sub.status]
                          } hover:bg-opacity-80`}
                        >
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell>${sub.total_price.toFixed(2)}</TableCell>
                      <TableCell>{new Date(sub.next_delivery).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openViewDialog(sub)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {sub.status === "active" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(sub.id, "paused")}>
                                <Pause className="mr-2 h-4 w-4" />
                                Pause
                              </DropdownMenuItem>
                            )}
                            {sub.status === "paused" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(sub.id, "active")}>
                                <Play className="mr-2 h-4 w-4" />
                                Resume
                              </DropdownMenuItem>
                            )}
                            {sub.status !== "cancelled" && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleStatusChange(sub.id, "cancelled")}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel
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
      </div>

      {/* View Subscription Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>
              Detailed view of the subscription for {selectedSubscription?.user_name}.
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User</Label>
                  <p>{selectedSubscription.user_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedSubscription.user_email}</p>
                </div>
                <div>
                  <Label>Plan</Label>
                  <p>{selectedSubscription.plan_name}</p>
                  <Badge
                    className={`${
                      planTypeColors[selectedSubscription.plan_type]
                    } hover:bg-opacity-80`}
                  >
                    {selectedSubscription.plan_type}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <p>
                    <Badge
                      className={`${
                        statusColors[selectedSubscription.status]
                      } hover:bg-opacity-80`}
                    >
                      {selectedSubscription.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label>Total Price</Label>
                  <p>${selectedSubscription.total_price.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Meals per Week</Label>
                  <p>{selectedSubscription.meals_per_week}</p>
                </div>
                <div>
                  <Label>Price per Meal</Label>
                  <p>${selectedSubscription.price_per_meal.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <p>{new Date(selectedSubscription.start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Next Delivery</Label>
                  <p>{new Date(selectedSubscription.next_delivery).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedSubscription.end_date && (
                <div>
                  <Label>End Date</Label>
                  <p>{new Date(selectedSubscription.end_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
