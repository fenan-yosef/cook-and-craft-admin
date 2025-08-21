"use client"

import { useEffect, useState } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { AdminSidebar } from "@/components/admin-sidebar"
import { ProfileAvatar } from "@/components/profile-avatar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Sun, Moon } from "lucide-react"

const getTitleFromPathname = (pathname: string) => {
  const path = pathname.split("/").pop() || "dashboard"
  switch (path) {
    case "dashboard":
      return "Dashboard"
    case "users":
      return "Users Management"
    case "subscriptions":
      return "Subscriptions Management"
    case "subscription-meal-selections":
      return "Subscription and Meal Selection Management"
    case "subscription-intervals":
      return "Subscription Intervals Management"
    case "reports":
      return "Reports Management"
    case "recipes":
      return "Recipes Management"
    case "products":
      return "Products Management"
    case "questions":
      return "Questions Management"
    case "answers":
      return "Answers Management"
    case "user-answers":
      return "User Answers Management"
    case "posts":
      return "Posts Management"
    case "orders":
      return "Orders Management"
    case "metrics":
      return "Community Metrics"
    case "meals":
      return "Meals Management"
    case "delivery-zones":
      return "Delivery Zones Management"
    case "coupons":
      return "Coupons Management"
    default:
      return "Dashboard"
  }
}

export default function DashboardLayout() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const pageTitle = getTitleFromPathname(location.pathname)
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null
    const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    const shouldBeDark = saved ? saved === "dark" : prefersDark

    setIsDark(shouldBeDark)
    if (shouldBeDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }

    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login")
    }
  }, [user, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">{pageTitle}</h1>
          <div className="ml-auto flex h-14 items-center justify-end gap-3">
            {mounted ? (
              <div className="flex items-center gap-2">
                <Sun className={`h-4 w-4 ${!isDark ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
                <Switch
                  className="duration-300"
                  checked={isDark}
                  onCheckedChange={(checked) => {
                    setIsDark(checked)
                    if (checked) {
                      document.documentElement.classList.add("dark")
                      localStorage.setItem("theme", "dark")
                    } else {
                      document.documentElement.classList.remove("dark")
                      localStorage.setItem("theme", "light")
                    }
                  }}
                  aria-label="Toggle dark mode"
                />
                <Moon className={`h-4 w-4 ${isDark ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
              </div>
            ) : (
              <div className="h-6 w-11 rounded-full bg-muted" aria-hidden />
            )}
            <ProfileAvatar />
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
