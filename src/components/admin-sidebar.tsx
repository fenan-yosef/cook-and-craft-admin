import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  MessageSquare,
  Calendar,
  LogOut,
  ChevronRight,
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
    title: "Shop Management",
    icon: ShoppingCart,
    items: [
      {
        title: "Users",
        url: "/dashboard/users",
      },
      {
        title: "Products",
        url: "/dashboard/products",
      },
      {
        title: "Orders",
        url: "/dashboard/orders",
      },
      {
        title: "Coupons",
        url: "/dashboard/coupons",
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
        title: "User Posts",
        url: "/dashboard/userposts",
      },
      {
        title: "Reports",
        url: "/dashboard/reports",
      },
      {
        title: "Metrics",
        url: "/dashboard/metrics",
      },
    ],
  },
  {
    title: "Subscriptions",
    icon: Calendar,
    items: [
      {
        title: "Recipes",
        url: "/dashboard/recipes",
      },
      {
        title: "Meals",
        url: "/dashboard/meals",
      },
      {
        title: "Subscriptions",
        url: "/dashboard/subscriptions",
      },
      {
        title: "Preferences",
        url: "/dashboard/preferences",
      },
    ],
  },
]

export function AdminSidebar() {
  const location = useLocation()
  const auth = useAuth()
  const user = auth?.user
  const logout = auth?.logout

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Package className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Admin Panel</span>
                <span className="text-xs">Management Dashboard</span>
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
                    <Collapsible defaultOpen className="group/collapsible">
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <item.icon />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={location.pathname === subItem.url}>
                                <Link to={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
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
              <Users />
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
  )
}
