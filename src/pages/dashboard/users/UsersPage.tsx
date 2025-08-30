import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, MoreHorizontal, UserCheck, UserX } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { useToast } from "@/hooks/use-toast"
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination"

interface User {
  id: number
  name: string
  email: string
  status: "active" | "blocked"
  created_at: string
  last_login?: string
  userRole?: string
  userFirstName?: string
  userLastName?: string
  referralCode?: string
  isUserActive?: number
  isEmailVerified?: number
  userPhone?: string
  isPhoneVerified?: number
  isPasswordSet?: number
  userLoginCount?: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAdminConfirmOpen, setIsAdminConfirmOpen] = useState(false)
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: number
    role: "Admin" | "Driver" | "Customer"
  } | null>(null)
  const { toast } = useToast()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchUsers(currentPage)
  }, [])

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true)
      // Ensure auth token is set on the apiService
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) {
        apiService.setAuthToken(token)
      }

      // Fetch users from the API and map to local User type
      const response = await apiService.get(`/admins/users?page=${page}`)

      // Normalize common API shapes for items and pagination meta
      const normalize = (res: any) => {
        const top = res ?? {}
        let items: any[] = []

        const candidates = [
          top, // { data: [], current_page, ... }
          top?.data, // { data: [], current_page, ... } OR []
          top?.result,
          top?.results,
        ]

        for (const layer of candidates) {
          if (!layer) continue
          if (Array.isArray(layer)) {
            items = layer
            break
          }
          if (Array.isArray(layer?.data)) {
            items = layer.data
            break
          }
          if (Array.isArray(layer?.items)) {
            items = layer.items
            break
          }
          if (Array.isArray(layer?.records)) {
            items = layer.records
            break
          }
        }

        const metaSources = [top, top?.data, top?.meta, top?.pagination]
        const meta: any = {}
        for (const src of metaSources) {
          if (!src) continue
          if (meta.current_page == null)
            meta.current_page = src.current_page ?? src.currentPage ?? src.page
          if (meta.last_page == null)
            meta.last_page = src.last_page ?? src.lastPage ?? src.total_pages ?? src.totalPages
          if (meta.per_page == null)
            meta.per_page = src.per_page ?? src.perPage ?? src.limit ?? src.page_size ?? src.pageSize
          if (meta.total == null)
            meta.total = src.total ?? src.totalItems ?? src.total_results ?? src.totalResults
        }

        return { items, meta }
      }

      const { items, meta } = normalize(response)

      const mappedUsers: User[] = items.map((u: any) => ({
        id: Number(u.userId),
        name: `${u.userFirstName || ""} ${u.userLastName || ""}`.trim() || u.userEmail,
        email: u.userEmail,
        status: u.isUserActive === 1 ? "active" : "blocked",
        created_at: u.userAccountCreatedAt,
        last_login: u.userLastLogin || undefined,
        userRole: u.userRole,
        userFirstName: u.userFirstName,
        userLastName: u.userLastName,
        referralCode: u.referralCode,
        isUserActive: u.isUserActive,
        isEmailVerified: u.isEmailVerified,
        userPhone: u.userPhone,
        isPhoneVerified: u.isPhoneVerified,
        isPasswordSet: u.isPasswordSet,
        userLoginCount: u.userLoginCount,
      }))
      setUsers(mappedUsers)

      // Pagination meta (fallbacks if not present)
      setCurrentPage(Number(meta.current_page ?? page) || 1)
      setLastPage(Number(meta.last_page ?? 1) || 1)
      setPerPage(Number((meta.per_page ?? mappedUsers.length) || 15))
      setTotal(Number(meta.total ?? mappedUsers.length))

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBlockUser = async (userId: number) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) apiService.setAuthToken(token)
      await apiService.patch(`/admins/users/${userId}/block`)
      setUsers(users.map((user) => (user.id === userId ? { ...user, status: "blocked" as const } : user)))
      toast({
        title: "Success",
        description: "User blocked successfully",
      })
      fetchUsers(currentPage)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive",
      })
    }
  }

  const handleUnblockUser = async (userId: number) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) apiService.setAuthToken(token)
      await apiService.patch(`/admins/users/${userId}/unblock`)
      setUsers(users.map((user) => (user.id === userId ? { ...user, status: "active" as const } : user)))
      toast({
        title: "Success",
        description: "User unblocked successfully",
      })
      fetchUsers(currentPage)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive",
      })
    }
  }

  const handleChangeRole = async (userId: number, role: string) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) apiService.setAuthToken(token)
      // Normalize selected role to lowercase for API
      const normalizedRole = role.toLowerCase()
      await apiService.patchFormData(`/admins/users/${userId}/role`, { role: normalizedRole })
      // Update local state with normalized role
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, userRole: normalizedRole } : u)))
      // Display success toast with capitalized role
      const displayRole = normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)
      toast({ title: "Success", description: `Role changed to ${displayRole}` })
      fetchUsers(currentPage)
    } catch (error) {
      toast({ title: "Error", description: "Failed to change role", variant: "destructive" })
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
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
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => {
                        setSelectedUser(user)
                        setIsDialogOpen(true)
                      }}
                    >
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.userRole ? user.userRole.charAt(0).toUpperCase() + user.userRole.slice(1) : "User"}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "destructive"}>{user.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                                Change Role
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuRadioGroup
                                  value={(user.userRole || "").slice(0, 1).toUpperCase() + (user.userRole || "").slice(1).toLowerCase()}
                                  onValueChange={(val) => {
                                    if (val === "Admin") {
                                      setPendingRoleChange({ userId: user.id, role: "Admin" })
                                      setIsAdminConfirmOpen(true)
                                    } else {
                                      handleChangeRole(user.id, val)
                                    }
                                  }}
                                >
                                  <DropdownMenuRadioItem value="Admin">Admin</DropdownMenuRadioItem>
                                  <DropdownMenuRadioItem value="Driver">Driver</DropdownMenuRadioItem>
                                  <DropdownMenuRadioItem value="Customer">Customer</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            {user.status === "active" ? (
                              <DropdownMenuItem onClick={() => handleBlockUser(user.id)}>
                                <UserX className="mr-2 h-4 w-4" />
                                Block User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleUnblockUser(user.id)}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Unblock User
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

            {/* Pagination */}
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage > 1) {
                          const next = currentPage - 1
                          setCurrentPage(next)
                          fetchUsers(next)
                        }
                      }}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>

                  {(() => {
                    const items: Array<number | "left-ellipsis" | "right-ellipsis"> = []
                    if (lastPage <= 7) {
                      for (let i = 1; i <= lastPage; i++) items.push(i)
                    } else {
                      items.push(1)
                      if (currentPage > 3) items.push("left-ellipsis")
                      const start = Math.max(2, currentPage - 1)
                      const end = Math.min(lastPage - 1, currentPage + 1)
                      for (let i = start; i <= end; i++) items.push(i)
                      if (currentPage < lastPage - 2) items.push("right-ellipsis")
                      items.push(lastPage)
                    }

                    return items.map((it, idx) => {
                      if (it === "left-ellipsis" || it === "right-ellipsis")
                        return (
                          <PaginationItem key={`${it}-${idx}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )
                      const pageNum = it as number
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            isActive={pageNum === currentPage}
                            onClick={(e) => {
                              e.preventDefault()
                              if (pageNum !== currentPage) {
                                setCurrentPage(pageNum)
                                fetchUsers(pageNum)
                              }
                            }}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })
                  })()}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage < lastPage) {
                          const next = currentPage + 1
                          setCurrentPage(next)
                          fetchUsers(next)
                        }
                      }}
                      className={currentPage >= lastPage ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <div className="mt-2 text-xs text-muted-foreground text-center">
                {total > 0 ? (
                  <>
                    Showing {(currentPage - 1) * perPage + 1} -
                    {Math.min(currentPage * perPage, total)} of {total}
                  </>
                ) : (
                  <>No results</>
                )}
              </div>
            </div>

          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                {selectedUser ? selectedUser.name : ""}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">First Name</span><span>{selectedUser.userFirstName || "-"}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Last Name</span><span>{selectedUser.userLastName || "-"}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Email</span><span>{selectedUser.email}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Phone</span><span>{selectedUser.userPhone || "-"}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Role</span><span>{selectedUser.userRole ? selectedUser.userRole.charAt(0).toUpperCase() + selectedUser.userRole.slice(1) : "-"}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Referral Code</span><span>{selectedUser.referralCode || "-"}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Active</span><span>
                  <Badge variant={selectedUser.isUserActive === 1 ? "default" : "destructive"}>
                    {selectedUser.isUserActive === 1 ? "Yes" : "No"}
                  </Badge>
                </span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Email Verified</span><span>
                  <Badge variant={selectedUser.isEmailVerified === 1 ? "default" : "secondary"}>
                    {selectedUser.isEmailVerified === 1 ? "Verified" : "Not Verified"}
                  </Badge>
                </span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Phone Verified</span><span>
                  <Badge variant={selectedUser.isPhoneVerified === 1 ? "default" : "secondary"}>
                    {selectedUser.isPhoneVerified === 1 ? "Verified" : "Not Verified"}
                  </Badge>
                </span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Password Set</span><span>{selectedUser.isPasswordSet === 1 ? "Yes" : "No"}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Login Count</span><span>{selectedUser.userLoginCount ?? 0}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Last Login</span><span>{selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : "Never"}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Account Created</span><span>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : "-"}</span></div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={isAdminConfirmOpen} onOpenChange={setIsAdminConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Promote to Admin</AlertDialogTitle>
              <AlertDialogDescription>
                Promoting a user to Admin grants elevated permissions and access across the system. This change is
                intended to be permanent and cannot be reverted from within the application. Do you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingRoleChange(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingRoleChange) {
                    handleChangeRole(pendingRoleChange.userId, pendingRoleChange.role)
                  }
                  setPendingRoleChange(null)
                  setIsAdminConfirmOpen(false)
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}