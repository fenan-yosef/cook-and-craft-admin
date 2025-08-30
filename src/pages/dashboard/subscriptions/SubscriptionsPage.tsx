import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  PlusCircle,
  Pencil,
  Trash2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context";



interface Subscription {
  id: number
  user_id?: number
  user_name?: string
  user_email?: string
  type?: "weekly" | "monthly" | "quarterly"
  interval_count?: number
  first_interval_id?: number
  people_count?: number
  meals_per_interval?: number
  zone_name?: string
  delivery_time_id?: {
    id: number
    start_time: string
    end_time: string
    day: { day_of_week: number }
  }
  bag_deposit_cents?: number
  delivery_fee_cents?: number
  subtotal_cents?: number
  discount_cents?: number
  total_cents?: number
  payment_status: "paid" | "unpaid"
  status: "active" | "paused" | "cancelled" | "expired"
  created_at?: string
  updated_at?: string
  coupon_code?: string
  delivery_latlng?: {
    latitude: number
    longitude: number
  }
}

const statusColors = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
  paid: "bg-green-100 text-green-800",
  unpaid: "bg-red-100 text-red-800",
}

const planTypeColors = {
  weekly: "bg-blue-100 text-blue-800",
  monthly: "bg-purple-100 text-purple-800",
  quarterly: "bg-indigo-100 text-indigo-800",
}

// Base URL for the API
const API_BASE_URL = "https://cook-craft.dhcb.io/api"

export default function SubscriptionsPage() {
  const { token } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const { toast } = useToast()

  // State for the new subscription form with the correct payload structure
  const [newSubscriptionForm, setNewSubscriptionForm] = useState({
    first_interval_id: 0,
    type: "weekly",
    people_count: 0,
    meals_per_interval: 0,
    bag_deposit_cents: 0,
    delivery_time_id: 0,
    coupon_code: "",
    payment_status: "paid",
    status: "active",
    user_location_id: 0,
  })

  // State for the edit subscription form with the correct payload structure
  const [editSubscriptionForm, setEditSubscriptionForm] = useState({
    first_interval_id: 0,
    type: "weekly",
    people_count: 0,
    meals_per_interval: 0,
    bag_deposit_cents: 0,
    delivery_time_id: 0,
    coupon_code: "",
    payment_status: "paid",
    status: "active",
    user_location_id: 0,
  })

  useEffect(() => {
    if (token) {
      fetchSubscriptions()
    } else {
      setLoading(false)
      toast({
        title: "Error",
        description: "Authentication token not available. Please log in.",
        variant: "destructive",
      })
    }
  }, [token])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/subscriptions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error("Failed to fetch subscriptions")
      const data = await response.json()
      // Use the provided API response structure for the data
      setSubscriptions(data.data.map((sub: any) => ({
        ...sub,
        total_cents: sub.total_cents,
        delivery_time_id: sub.delivery_time_id,
        zone_name: sub.zone_name,
        people_count: sub.people_count,
        meals_per_interval: sub.meals_per_interval,
      })))
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

  const fetchSubscriptionById = async (id: number) => {
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/subscriptions/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error("Failed to fetch subscription details")
      const data = await response.json()
      // Map the fetched data to the correct edit form structure
      setEditSubscriptionForm({
        first_interval_id: data.data.first_interval_id,
        type: data.data.type,
        people_count: data.data.people_count,
        meals_per_interval: data.data.meals_per_interval,
        bag_deposit_cents: data.data.bag_deposit_cents,
        delivery_time_id: data.data.delivery_time_id?.id, // Use the ID
        coupon_code: data.data.coupon_code,
        payment_status: data.data.payment_status,
        status: data.data.status,
        user_location_id: data.data.user_location_id, // Assuming this exists
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load subscription details for editing.",
        variant: "destructive",
      })
    }
  }

  const handleCreateSubscription = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSubscriptionForm),
      })
      if (!response.ok) throw new Error("Failed to create subscription")
      toast({
        title: "Success",
        description: "Subscription created successfully.",
      })
      setIsCreateDialogOpen(false)
      fetchSubscriptions()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create subscription.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateSubscription = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedSubscription || !token) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/subscriptions/${selectedSubscription.id}?_method=put`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editSubscriptionForm),
        },
      )
      if (!response.ok) throw new Error("Failed to update subscription")
      toast({
        title: "Success",
        description: "Subscription updated successfully.",
      })
      setIsEditDialogOpen(false)
      fetchSubscriptions()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subscription.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSubscription = async (subscriptionId: number) => {
    if (window.confirm("Are you sure you want to delete this subscription?")) {
      if (!token) return

      try {
        const response = await fetch(`${API_BASE_URL}/subscriptions/${subscriptionId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!response.ok) throw new Error("Failed to delete subscription")
        toast({
          title: "Success",
          description: "Subscription deleted successfully.",
        })
        fetchSubscriptions()
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete subscription.",
          variant: "destructive",
        })
      }
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

  const openEditDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription)
    fetchSubscriptionById(subscription.id)
    setIsEditDialogOpen(true)
  }

  const filteredSubscriptions = subscriptions
    .filter((sub) => statusFilter === "all" || sub.status === statusFilter)
    .filter(
      (sub) =>
        (sub.user_name?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
        (sub.user_email?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
        (sub.zone_name?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()),
    )

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Subscriptions</h2>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Subscription
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscriptions.length}</div>
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
                  .reduce((acc, sub) => acc + (sub.total_cents ?? 0 / 100), 0)
                  .toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Meals Per Interval</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(subscriptions.reduce((acc, sub) => acc + (sub.meals_per_interval ?? 0), 0) / subscriptions.length).toFixed(1)}
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
                  <TableHead>Plan Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>People</TableHead>
                  <TableHead>Meals</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Delivery Window</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      No subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="font-medium">{sub.user_name ?? `User #${sub.user_id}`}</div>
                        <div className="text-sm text-muted-foreground">{sub.user_email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={planTypeColors[sub.type as keyof typeof planTypeColors]}
                        >
                          {sub.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={statusColors[sub.status]}
                        >
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{sub.people_count}</TableCell>
                      <TableCell>{sub.meals_per_interval}</TableCell>
                      <TableCell>{sub.zone_name}</TableCell>
                      <TableCell>${((sub.total_cents ?? 0) / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        {sub.delivery_time_id
                          ? `${sub.delivery_time_id.start_time.substring(0, 5)} - ${sub.delivery_time_id.end_time.substring(0, 5)}`
                          : "N/A"}
                      </TableCell>
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
                            <DropdownMenuItem onClick={() => openEditDialog(sub)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
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
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteSubscription(sub.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
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
              Detailed view of the subscription for {selectedSubscription?.user_name ?? `User #${selectedSubscription?.user_id}`}.
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User</Label>
                  <p>{selectedSubscription.user_name ?? `User #${selectedSubscription.user_id}`}</p>
                  <p className="text-sm text-muted-foreground">{selectedSubscription.user_email}</p>
                </div>
                <div>
                  <Label>Plan Type</Label>
                  <p>
                    <Badge
                      className={planTypeColors[selectedSubscription.type as keyof typeof planTypeColors]}
                    >
                      {selectedSubscription.type}
                    </Badge>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <p>
                    <Badge
                      className={statusColors[selectedSubscription.status]}
                    >
                      {selectedSubscription.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label>Total Price</Label>
                  <p>${((selectedSubscription.total_cents ?? 0) / 100).toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>People</Label>
                  <p>{selectedSubscription.people_count}</p>
                </div>
                <div>
                  <Label>Meals per Interval</Label>
                  <p>{selectedSubscription.meals_per_interval}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Zone</Label>
                  <p>{selectedSubscription.zone_name}</p>
                </div>
                <div>
                  <Label>Delivery Window</Label>
                  <p>
                    {selectedSubscription.delivery_time_id
                      ? `${selectedSubscription.delivery_time_id.start_time.substring(0, 5)} - ${selectedSubscription.delivery_time_id.end_time.substring(0, 5)}`
                      : "N/A"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Created At</Label>
                  <p>{selectedSubscription.created_at ? new Date(selectedSubscription.created_at).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Badge className={statusColors[selectedSubscription.payment_status]}>
                    {selectedSubscription.payment_status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bag Deposit</Label>
                  <p>${((selectedSubscription.bag_deposit_cents ?? 0) / 100).toFixed(2)}</p>
                </div>
                <div>
                  <Label>Delivery Fee</Label>
                  <p>${((selectedSubscription.delivery_fee_cents ?? 0) / 100).toFixed(2)}</p>
                </div>
              </div>
              <div>
                <Label>Coupon Code</Label>
                <p>{selectedSubscription.coupon_code || "None"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Subscription Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Subscription</DialogTitle>
            <DialogDescription>Fill out the form to create a new subscription.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubscription} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="first_interval_id" className="text-right">
                First Interval ID
              </Label>
              <Input
                id="first_interval_id"
                type="number"
                value={newSubscriptionForm.first_interval_id}
                onChange={(e) => setNewSubscriptionForm({ ...newSubscriptionForm, first_interval_id: parseInt(e.target.value) })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="people_count" className="text-right">
                People Count
              </Label>
              <Input
                id="people_count"
                type="number"
                value={newSubscriptionForm.people_count}
                onChange={(e) => setNewSubscriptionForm({ ...newSubscriptionForm, people_count: parseInt(e.target.value) })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="meals_per_interval" className="text-right">
                Meals per Interval
              </Label>
              <Input
                id="meals_per_interval"
                type="number"
                value={newSubscriptionForm.meals_per_interval}
                onChange={(e) => setNewSubscriptionForm({ ...newSubscriptionForm, meals_per_interval: parseInt(e.target.value) })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bag_deposit_cents" className="text-right">
                Bag Deposit (cents)
              </Label>
              <Input
                id="bag_deposit_cents"
                type="number"
                value={newSubscriptionForm.bag_deposit_cents}
                onChange={(e) => setNewSubscriptionForm({ ...newSubscriptionForm, bag_deposit_cents: parseInt(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="delivery_time_id" className="text-right">
                Delivery Time ID
              </Label>
              <Input
                id="delivery_time_id"
                type="number"
                value={newSubscriptionForm.delivery_time_id}
                onChange={(e) => setNewSubscriptionForm({ ...newSubscriptionForm, delivery_time_id: parseInt(e.target.value) })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user_location_id" className="text-right">
                User Location ID
              </Label>
              <Input
                id="user_location_id"
                type="number"
                value={newSubscriptionForm.user_location_id}
                onChange={(e) => setNewSubscriptionForm({ ...newSubscriptionForm, user_location_id: parseInt(e.target.value) })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="coupon_code" className="text-right">
                Coupon Code
              </Label>
              <Input
                id="coupon_code"
                value={newSubscriptionForm.coupon_code}
                onChange={(e) => setNewSubscriptionForm({ ...newSubscriptionForm, coupon_code: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment_status" className="text-right">
                Payment Status
              </Label>
              <Select
                value={newSubscriptionForm.payment_status}
                onValueChange={(value) => setNewSubscriptionForm({ ...newSubscriptionForm, payment_status: value as "paid" | "unpaid" })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={newSubscriptionForm.status}
                onValueChange={(value) => setNewSubscriptionForm({ ...newSubscriptionForm, status: value as "active" | "paused" | "cancelled" | "expired" })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Plan Type
              </Label>
              <Select
                value={newSubscriptionForm.type}
                onValueChange={(value) => setNewSubscriptionForm({ ...newSubscriptionForm, type: value as "weekly" | "monthly" | "quarterly" })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a plan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Modify the subscription details for {selectedSubscription?.user_name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubscription} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_first_interval_id" className="text-right">
                First Interval ID
              </Label>
              <Input
                id="edit_first_interval_id"
                type="number"
                value={editSubscriptionForm.first_interval_id}
                onChange={(e) => setEditSubscriptionForm({ ...editSubscriptionForm, first_interval_id: parseInt(e.target.value) })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_people_count" className="text-right">
                People Count
              </Label>
              <Input
                id="edit_people_count"
                type="number"
                value={editSubscriptionForm.people_count}
                onChange={(e) => setEditSubscriptionForm({ ...editSubscriptionForm, people_count: parseInt(e.target.value) })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_meals_per_interval" className="text-right">
                Meals per Interval
              </Label>
              <Input
                id="edit_meals_per_interval"
                type="number"
                value={editSubscriptionForm.meals_per_interval}
                onChange={(e) => setEditSubscriptionForm({ ...editSubscriptionForm, meals_per_interval: parseInt(e.target.value) })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_bag_deposit_cents" className="text-right">
                Bag Deposit (cents)
              </Label>
              <Input
                id="edit_bag_deposit_cents"
                type="number"
                value={editSubscriptionForm.bag_deposit_cents}
                onChange={(e) => setEditSubscriptionForm({ ...editSubscriptionForm, bag_deposit_cents: parseInt(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_delivery_time_id" className="text-right">
                Delivery Time ID
              </Label>
              <Input
                id="edit_delivery_time_id"
                type="number"
                value={editSubscriptionForm.delivery_time_id}
                onChange={(e) => setEditSubscriptionForm({ ...editSubscriptionForm, delivery_time_id: parseInt(e.target.value) })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_user_location_id" className="text-right">
                User Location ID
              </Label>
              <Input
                id="edit_user_location_id"
                type="number"
                value={editSubscriptionForm.user_location_id}
                onChange={(e) => setEditSubscriptionForm({ ...editSubscriptionForm, user_location_id: parseInt(e.target.value) })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_coupon_code" className="text-right">
                Coupon Code
              </Label>
              <Input
                id="edit_coupon_code"
                value={editSubscriptionForm.coupon_code}
                onChange={(e) => setEditSubscriptionForm({ ...editSubscriptionForm, coupon_code: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_payment_status" className="text-right">
                Payment Status
              </Label>
              <Select
                value={editSubscriptionForm.payment_status}
                onValueChange={(value) => setEditSubscriptionForm({ ...editSubscriptionForm, payment_status: value as "paid" | "unpaid" })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_status" className="text-right">
                Status
              </Label>
              <Select
                value={editSubscriptionForm.status}
                onValueChange={(value) => setEditSubscriptionForm({ ...editSubscriptionForm, status: value as "active" | "paused" | "cancelled" | "expired" })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_type" className="text-right">
                Plan Type
              </Label>
              <Select
                value={editSubscriptionForm.type}
                onValueChange={(value) => setEditSubscriptionForm({ ...editSubscriptionForm, type: value as "weekly" | "monthly" | "quarterly" })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a plan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
