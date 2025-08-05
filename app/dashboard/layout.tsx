"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { AdminSidebar } from "@/components/admin-sidebar"
import { ProfileAvatar } from "@/components/profile-avatar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { redirect, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Separator } from "@/components/ui/separator"

const getTitleFromPathname = (pathname: string) => {
  const path = pathname.split("/").pop() || "dashboard"
  switch (path) {
    case "dashboard":
      return "Dashboard"
    case "users":
      return "Users Management"
    case "subscriptions":
      return "Subscriptions Management"
    case "reports":
      return "Reports Management"
    case "recipes":
      return "Recipes Management"
    case "products":
      return "Products Management"
    case "preferences":
      return "Preferences Management"
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  const pageTitle = getTitleFromPathname(pathname)

  useEffect(() => {
    if (!isLoading && !user) {
      redirect("/login")
    }
  }, [user, isLoading])

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
          <div className="ml-auto flex h-14 items-center justify-end">
            <ProfileAvatar />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
