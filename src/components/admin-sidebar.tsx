import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  MessageSquare,
  Calendar,
  Settings,
  LogOut,
  ChevronRight,
  Wallet,
  CookieIcon,
  Cookie,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    // url: "/dashboard/users",
    icon: Users,
    items: [
      {
        title: "All Users",
        url: "/dashboard/users",
        icon: Users,
      },
      {
        title: "Questions",
        url: "/dashboard/questions",
      },
      // {
      //   title: "User Preferences",
      //   icon: Settings,
      //   items: [
          
      //     // {
      //     //   title: "Answers",
      //     //   url: "/dashboard/answers",
      //     // },
      //     // {
      //     //   title: "User Answers",
      //     //   url: "/dashboard/user-answers",
      //     // },
      //   ],
      // },
      {
        title: "Wallets",
        icon: Wallet,
        items: [
          {
            title: "All Wallets",
            url: "/dashboard/wallets",
          },
          {
            title: "Shop Redemption",
            url: "/dashboard/shop-redemptions",
          },
          {
            title: "Conversion Rules",
            url: "/dashboard/conversion-rules",
          },
        ],
      },
      {
        title: "Contact Us Messages",
        url: "/dashboard/contact-us-messages",
        icon: Settings,
      }
    ]
  },
  {
    title: "Shop Management",
    icon: ShoppingCart,
    items: [
      {
        title: "Products",
        url: "/dashboard/products",
      },
      {
        title:"Product Categories",
        url: "/dashboard/categories"
      },
      {
        title: "Addons",
        url: "/dashboard/addons",
      },
      {
        title: "Orders",
        url: "/dashboard/orders",
      },
      {
        title: "Delivery Zones",
        url: "/dashboard/delivery-zones",
      },
    ],
  },
  {
    title: "Community",
    icon: MessageSquare,
    items: [
      {
        title: "Posts",
        url: "/dashboard/posts",
      },
      {
        title: "Polls",
        url: "/dashboard/posts/polls",
      },
      {
        title: "Reports",
        url: "/dashboard/reports",
      },
      {
        title: "Metrics",
        url: "/dashboard/metrics",
      },
      // {
      //   title: "Notifications",
      //   url: "/dashboard/community-notifications",
      // }
    ],
  },
  {
    title: "Loyality & Rewards",
    icon: Settings,
    items: [
      {
        title: "Rewards",
        url: "/dashboard/rewards",
      },
      {
        title: "Coupons",
        url: "/dashboard/coupons",
      },
    ],
  },
  {
    title: "Subscriptions",
    icon: Calendar,
    items: [
      {
        title: "Subscription Plans",
        url: "/dashboard/subscription-intervals",
      },
      {
        title: "Subscription Type",
        url: "/dashboard/subscription-types",
      },
      {
        title: "Subscriptions",
        url: "/dashboard/subscriptions",
      },
      {
        title: "Meal Selections",
        url: "/dashboard/subscription-meal-selections",
      },
    
    
    ],
  },
  {
    title: "Recipes",
    url: "/dashboard/recipes",
    icon: Cookie,
  },
  {
    title: "Meals",
    url: "/dashboard/meals",
    icon: CookieIcon,
  },
  {
    title: "Send Notifications",
    url: "/dashboard/notifications",
    icon: MessageSquare,
  }
]

export function AdminSidebar() {
  const location = useLocation()
  const auth = useAuth()
  const user = auth?.user
  const logout = auth?.logout

  // Persisted open/closed state for collapsible menu sections
  const COLLAPSIBLE_STATE_KEY = 'admin_sidebar_collapsible_state'
  type CollapsibleState = Record<string, boolean>
  const [collapsibleState, setCollapsibleState] = useState<CollapsibleState>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem(COLLAPSIBLE_STATE_KEY)
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return {}

      const sanitized: CollapsibleState = {}
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === 'boolean') sanitized[key] = value
      }
      return sanitized
    } catch {
      return {}
    }
  })

  const collapsibleKey = useCallback((parts: string[]) => ['admin_sidebar', ...parts].join('::'), [])
  const setSectionOpen = useCallback((key: string, open: boolean) => {
    setCollapsibleState(prev => {
      if (prev[key] === open) return prev
      return { ...prev, [key]: open }
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(COLLAPSIBLE_STATE_KEY, JSON.stringify(collapsibleState))
    } catch {
      // ignore storage errors (private mode / quota)
    }
  }, [collapsibleState])

  // Resizable width state (persisted)
  const DEFAULT_WIDTH = 260
  const MIN_WIDTH = 200
  const MAX_WIDTH = 480
  const [width, setWidth] = useState<number>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('admin_sidebar_width') : null
    const w = stored ? parseInt(stored, 10) : DEFAULT_WIDTH
    return isNaN(w) ? DEFAULT_WIDTH : Math.min(Math.max(MIN_WIDTH, w), MAX_WIDTH)
  })
  const resizingRef = useRef(false)
  const lastXRef = useRef(0)

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return
    const delta = e.clientX - lastXRef.current
    lastXRef.current = e.clientX
    setWidth(prev => {
      const next = Math.min(Math.max(prev + delta, MIN_WIDTH), MAX_WIDTH)
      return next
    })
  }, [])

  const stopResizing = useCallback(() => {
    if (resizingRef.current) {
      resizingRef.current = false
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_sidebar_width', String(width))
      }
    }
  }, [width])

  const startResizing = useCallback((e: React.MouseEvent) => {
    resizingRef.current = true
    lastXRef.current = e.clientX
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopResizing)
    window.addEventListener('mouseleave', stopResizing)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stopResizing)
      window.removeEventListener('mouseleave', stopResizing)
    }
  }, [onMouseMove, stopResizing])

  // Allow text wrapping for long titles
  const longTitleClass = "whitespace-normal break-words"

  return (
    <div
      className="relative flex h-full select-none"
      data-resizable-sidebar
    >
      <Sidebar
        style={{ ['--sidebar-width' as any]: width + 'px' }}
        className="border-r"
      >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex h-8 w-10 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                <img
                  src="/assets/photo_2025-08-21_11-16-40.jpg"
                  alt="Logo"
                  className=" rounded object-cover"
                />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Cook And Crafts</span>
                <span className="text-xs">Admin Panel</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.items ? (
                    <Collapsible
                      open={!!collapsibleState[collapsibleKey([item.title])]}
                      onOpenChange={(open) => setSectionOpen(collapsibleKey([item.title]), open)}
                      className="group/collapsible"
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <item.icon />
                          <span className={longTitleClass}>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              {subItem.items ? (
                                <Collapsible
                                  open={!!collapsibleState[collapsibleKey([item.title, subItem.title])]}
                                  onOpenChange={(open) =>
                                    setSectionOpen(collapsibleKey([item.title, subItem.title]), open)
                                  }
                                  className="group/collapsible"
                                >
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuSubButton>
                                      {subItem.icon && <subItem.icon />}
                                      <span className={longTitleClass}>{subItem.title}</span>
                                      <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuSubButton>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <SidebarMenuSub>
                                      {subItem.items.map((nested) => (
                                        <SidebarMenuSubItem key={nested.title}>
                                          <SidebarMenuSubButton asChild isActive={location.pathname === nested.url!}>
                                            <Link to={nested.url!}>
                                              <span className={longTitleClass}>{nested.title}</span>
                                            </Link>
                                          </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                      ))}
                                    </SidebarMenuSub>
                                  </CollapsibleContent>
                                </Collapsible>
                              ) : (
                                <SidebarMenuSubButton asChild isActive={location.pathname === subItem.url!}>
                                  <Link to={subItem.url!}>
                                    <span className={longTitleClass}>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              )}
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url}>
                        <item.icon />
                        <span className={longTitleClass}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="mr-2 h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.25a7.75 7.75 0 1115.5 0v.25a.75.75 0 01-.75.75h-14a.75.75 0 01-.75-.75v-.25z" />
              </svg>
              <span>{user?.name || "Admin"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                if (logout) logout()
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      </Sidebar>
      {/* Resize Handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={startResizing}
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-primary/40 active:bg-primary/60 transition-colors"
        title="Drag to resize sidebar"
      />
    </div>
  )
}
