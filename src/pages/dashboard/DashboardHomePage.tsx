"use client"

import { useEffect, useState } from "react"
import { apiService } from "@/lib/api-service"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Users, ShoppingCart, MessageSquare, Calendar } from "lucide-react"

interface DashboardStats {
  totalUsers: number
  totalOrders: number
  totalPosts: number
  totalSubscriptions: number
  revenue: number
  growth: number
}

export default function DashboardHomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalOrders: 0,
    totalPosts: 0,
    totalSubscriptions: 0,
    revenue: 0,
    growth: 0,
  })
  const [isProcessingRecurring, setIsProcessingRecurring] = useState(false)
  const [isSendingIntervals, setIsSendingIntervals] = useState(false)
  const [isSyncingProducts, setIsSyncingProducts] = useState(false)
  const [isSyncingRecipes, setIsSyncingRecipes] = useState(false)
  const [isSyncingAddons, setIsSyncingAddons] = useState(false)
  const [isAutoAssigningMeals, setIsAutoAssigningMeals] = useState(false)
  const [foodicsAuthCode, setFoodicsAuthCode] = useState("")
  const [isAuthorizingFoodics, setIsAuthorizingFoodics] = useState(false)

  const ensureAuthToken = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (token) {
      apiService.setAuthToken(token)
      return true
    }
    toast({
      title: "Auth required",
      description: "Please log in first.",
      variant: "destructive",
    })
    return false
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get auth token from localStorage
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
        if (token) apiService.setAuthToken(token)

        // Fetch all needed resources in parallel
        const [postsRes, usersRes, ordersRes, subsRes] = await Promise.all([
          apiService.get("/posts?withLikes=true&withPolls=true&page=1"), // added page=1
          apiService.get("/admins/users"),
          apiService.get("/admins/orders"),
          apiService.get("/subscriptions"),
        ])

        setStats({
          totalUsers: Array.isArray(usersRes.data) ? usersRes.data.length : 0,
          totalOrders: Array.isArray(ordersRes.data) ? ordersRes.data.length : 0,
          totalPosts: Array.isArray(postsRes.data) ? postsRes.data.length : 0,
          totalSubscriptions: Array.isArray(subsRes.data) ? subsRes.data.length : 0,
          revenue: 45678, // TODO: Replace with real revenue endpoint if available
          growth: 12.5,   // TODO: Replace with real growth calculation if available
        })
      } catch (err) {
        // fallback to 0s if error
        setStats({
          totalUsers: 0,
          totalOrders: 0,
          totalPosts: 0,
          totalSubscriptions: 0,
          revenue: 0,
          growth: 0,
        })
      }
    }
    fetchStats()
  }, [])

  const handleProcessRecurringSubscriptions = async () => {
    if (!ensureAuthToken()) return
    setIsProcessingRecurring(true)
    try {
      await apiService.post("/test/process-recurring-subscriptions", {})
      toast({
        title: "Recurring subscriptions job started",
        description: "Backend is processing recurring subscriptions.",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error"
      toast({
        title: "Failed to trigger recurring processing",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsProcessingRecurring(false)
    }
  }

  const handleSendIntervalsToFoodics = async () => {
    if (!ensureAuthToken()) return
    setIsSendingIntervals(true)
    try {
      await apiService.post("/test/send-intervals-to-foodics", {})
      toast({
        title: "Intervals sent to Foodics",
        description: "Manual sync request submitted successfully.",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error"
      toast({
        title: "Failed to send intervals",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSendingIntervals(false)
    }
  }

  const handleAutoAssignMeals = async () => {
    if (!ensureAuthToken()) return
    setIsAutoAssigningMeals(true)
    try {
      await apiService.post("/test/auto-assign-meals", {})
      toast({
        title: "Auto-assign meals started",
        description: "Backend job queued successfully.",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error"
      toast({
        title: "Failed to start auto-assign",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsAutoAssigningMeals(false)
    }
  }

  const normalizeFoodicsCode = () => {
    const raw = foodicsAuthCode.trim()
    if (!raw) return null
    // Allow pasting the full redirect URL; extract ?code=... if present.
    try {
      const maybeUrl = new URL(raw)
      const fromQuery = maybeUrl.searchParams.get("code")
      return (fromQuery || raw).trim() || null
    } catch {
      return raw
    }
  }

  const handleAuthorizeFoodics = async () => {
    if (!ensureAuthToken()) return
    const code = normalizeFoodicsCode()
    if (!code) {
      toast({
        title: "Foodics code required",
        description: "Paste the authorization code or redirect URL first.",
        variant: "destructive",
      })
      return
    }

    setIsAuthorizingFoodics(true)
    try {
      await apiService.post("/authorize", { code })
      toast({
        title: "Authorization submitted",
        description: "Backend will store the Foodics token for future syncs.",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error"
      toast({
        title: "Failed to authorize",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsAuthorizingFoodics(false)
    }
  }

  const handleSyncProducts = async () => {
    if (!ensureAuthToken()) return
    setIsSyncingProducts(true)
    try {
      await apiService.post("/sync-products", {})
      toast({
        title: "Products sync started",
        description: "Backend job queued successfully.",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error"
      toast({
        title: "Failed to sync products",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSyncingProducts(false)
    }
  }

  const handleSyncRecipes = async () => {
    if (!ensureAuthToken()) return
    setIsSyncingRecipes(true)
    try {
      await apiService.post("/sync-recipes", {})
      toast({
        title: "Recipes sync started",
        description: "Backend job queued successfully.",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error"
      toast({
        title: "Failed to sync recipes",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSyncingRecipes(false)
    }
  }

  const handleSyncAddons = async () => {
    if (!ensureAuthToken()) return
    setIsSyncingAddons(true)
    try {
      await apiService.post("/sync-addons", {})
      toast({
        title: "Add-ons sync started",
        description: "Backend job queued successfully.",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error"
      toast({
        title: "Failed to sync add-ons",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSyncingAddons(false)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+20.1% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+15.3% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Community Posts</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPosts.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+8.7% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubscriptions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+25.2% from last month</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest activities across all modules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New user registered</p>
                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Order #1234 completed</p>
                    <p className="text-xs text-muted-foreground">5 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New post reported</p>
                    <p className="text-xs text-muted-foreground">10 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Subscription renewed</p>
                    <p className="text-xs text-muted-foreground">15 minutes ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Monthly revenue and growth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">This Month</span>
                  <span className="text-2xl font-bold">SAR {stats.revenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Growth</span>
                  <span className="text-sm font-medium text-green-600">+{stats.growth}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${Math.min(stats.growth * 5, 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="px-8 mb-8 grid gap-4 lg:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Foodics Integration (Admin Tools)</CardTitle>
            <CardDescription>Testing & manual triggers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="Paste Foodics authorization code"
                  value={foodicsAuthCode}
                  onChange={(e) => setFoodicsAuthCode(e.target.value)}
                />
                <Button onClick={handleAuthorizeFoodics} disabled={isAuthorizingFoodics}>
                  {isAuthorizingFoodics ? "Authorizing..." : "Authorize"}
                </Button>
              </div>

              <Button
                onClick={handleProcessRecurringSubscriptions}
                disabled={isProcessingRecurring}
              >
                {isProcessingRecurring ? "Processing..." : "Process Recurring Subscriptions"}
              </Button>
              <Button
                variant="outline"
                onClick={handleSendIntervalsToFoodics}
                disabled={isSendingIntervals}
              >
                {isSendingIntervals ? "Sending..." : "Send Intervals to Foodics"}
              </Button>

              <Button
                variant="outline"
                onClick={handleAutoAssignMeals}
                disabled={isAutoAssigningMeals}
              >
                {isAutoAssigningMeals ? "Auto-assigning..." : "Auto-assign Meals"}
              </Button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={handleSyncProducts} disabled={isSyncingProducts}>
                  {isSyncingProducts ? "Syncing..." : "Sync Products"}
                </Button>
                <Button variant="outline" onClick={handleSyncRecipes} disabled={isSyncingRecipes}>
                  {isSyncingRecipes ? "Syncing..." : "Sync Recipes"}
                </Button>
                <Button variant="outline" onClick={handleSyncAddons} disabled={isSyncingAddons}>
                  {isSyncingAddons ? "Syncing..." : "Sync Add-ons"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
