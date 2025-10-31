import { useState, useEffect, useRef } from "react"
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
import { Search, MoreHorizontal, UserCheck, UserX, Plus, Trash2 } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  userWallets?: any[]
}

export default function UsersPage() {
  // Safely convert any value into a human-friendly string for rendering
  const toLabel = (v: any): string => {
    if (v == null) return ""
    const t = typeof v
    if (t === "string" || t === "number" || t === "boolean") return String(v)
    if (t === "object") {
      const candidate = (v.name ?? v.code ?? v.title ?? v.label ?? v.id ?? v.value)
      return candidate != null ? String(candidate) : JSON.stringify(v)
    }
    return String(v)
  }
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
  // Delete confirmation state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<number | null>(null)
  // User preference answers state (grouped by question per new API)
  interface UserAnswerItem { id: number; answer_id: number; answer_text: string; answered_at?: string }
  interface UserAnswerGroup { question_id: number; question_text: string; answers: UserAnswerItem[] }
  const [userAnswers, setUserAnswers] = useState<UserAnswerGroup[]>([])
  const [answersLoading, setAnswersLoading] = useState(false)
  const [answersError, setAnswersError] = useState<string | null>(null)
  // Track in-flight requests to avoid stale overwrite
  const answersReqRef = useRef(0)
  const lastAnswersUserIdRef = useRef<number | null>(null)
  const { toast } = useToast()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [total, setTotal] = useState(0)

  // Add User modal state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addForm, setAddForm] = useState({
    first_name: "",
    last_name: "",
    birth_day: "",
    birth_month: "",
    birth_year: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  })
  const [addErrors, setAddErrors] = useState<Record<string, string[]>>({})
  const [showPwd, setShowPwd] = useState(false)
  const [showPwdConfirm, setShowPwdConfirm] = useState(false)

  useEffect(() => {
    fetchUsers(currentPage, perPage)
  }, [])

  const fetchUsers = async (page = 1, size = perPage) => {
    try {
      setLoading(true)
      // Ensure auth token is set on the apiService
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) {
        apiService.setAuthToken(token)
      }

      // Fetch users from the API and map to local User type
      const response = await apiService.get(
        `/admins/users?page=${page}&per_page=${size}&perPage=${size}&limit=${size}&page_size=${size}&pageSize=${size}`,
      )

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

        // Some backends (ours included) return meta nested under `error` ¯\\_(ツ)_/¯
        const metaSources = [top, top?.data, top?.meta, top?.pagination, (typeof top?.error === 'object' ? top.error : undefined)]
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

        // Derive last_page if still missing but we have total & per_page
        if ((meta.last_page == null || isNaN(Number(meta.last_page))) && meta.total != null && meta.per_page != null) {
          const per = Number(meta.per_page) || 15
          const tot = Number(meta.total) || 0
          meta.last_page = Math.max(1, Math.ceil(tot / per))
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
        userWallets: Array.isArray(u.userWallets) ? u.userWallets : [],
      }))
      setUsers(mappedUsers)

      // Pagination meta (fallbacks if not present)
  setCurrentPage(Number(meta.current_page ?? page) || 1)
  setLastPage(Number(meta.last_page ?? 1) || 1)
  // Keep user-selected perPage; do not override with backend meta
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

  const openAddModal = () => {
    setIsAddOpen(true)
    setAddErrors({})
  }

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setAddForm((prev) => ({ ...prev, [name]: value }))
    setAddErrors((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    setAddErrors({})
    try {
      // Optional basic validation
      if (addForm.password !== addForm.password_confirmation) {
        setAddErrors({ password_confirmation: ["Passwords do not match."] })
        return
      }
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) apiService.setAuthToken(token)
      const payload = { ...addForm }
      const res = await apiService.post("/users/sign-up", payload)
      toast({ title: "Success", description: res?.message || "User created successfully." })
      setIsAddOpen(false)
      setAddForm({
        first_name: "",
        last_name: "",
        birth_day: "",
        birth_month: "",
        birth_year: "",
        email: "",
        phone: "",
        password: "",
        password_confirmation: "",
      })
      fetchUsers(currentPage)
    } catch (err: any) {
      // Try to parse JSON error and extract first field
      let backendPayload: any = null
      if (err?.message && typeof err.message === "string") {
        try { backendPayload = JSON.parse(err.message) } catch {}
      }
      const backendError = err?.data?.error || err?.error || err?.response?.data?.error || backendPayload?.error
      if (backendError && typeof backendError === "object") {
        const firstKey = Object.keys(backendError)[0]
        const firstVal = backendError[firstKey]
        const messages = Array.isArray(firstVal) ? firstVal : [String(firstVal)]
        setAddErrors({ [firstKey]: messages })
        const snippet = `"${firstKey}": [\n  "${messages[0]}"\n]`
        toast({ title: "Validation Error", description: snippet, variant: "destructive" })
      } else {
        toast({ title: "Error", description: "Failed to create user.", variant: "destructive" })
      }
    } finally {
      setAddLoading(false)
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

  // Deactivate user handler (replaces hard delete)
  const handleDeleteUser = async () => {
    if (pendingDeleteUserId == null) return
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) apiService.setAuthToken(token)

      // Try JSON first with multiple id keys to satisfy various backends
      const id = pendingDeleteUserId
      const payload = { user_id: id, userId: id, id }
      try {
        await apiService.post(`/users/deactivate`, payload)
      } catch (jsonErr) {
        // Fallback to form-encoded body if JSON is not accepted
        await apiService.postFormData(`/users/deactivate`, { user_id: String(id) })
      }

      toast({ title: "Deactivated", description: "User deactivated successfully." })
      // refresh list
      fetchUsers(currentPage)
    } catch (err) {
      // Surface backend error message if available
      let message = "Failed to deactivate user."
      if (err && typeof (err as any).message === 'string') message = (err as any).message
      toast({ title: "Error", description: message, variant: 'destructive' })
    } finally {
      setPendingDeleteUserId(null)
      setIsDeleteConfirmOpen(false)
    }
  }

  // Fetch preference answers for a user (grouped by question)
  const fetchAndFilterUserAnswers = async (userId: number) => {
  const reqId = ++answersReqRef.current;
  setAnswersLoading(true);
  setAnswersError(null);
  setUserAnswers([]);
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (token) apiService.setAuthToken(token);
    const res = await apiService.get(`/admins/users_preference_answers/${userId}`);
    // Updated API shape:
    // { data: [ { question_id, question_text, answers: [{ id, answer_id, answer_text, answered_at }, ...] } ], ... }
    const groupsRaw = Array.isArray(res?.data) ? res.data : [];
    const groups: UserAnswerGroup[] = groupsRaw.map((g: any) => ({
      question_id: Number(g?.question_id),
      question_text: String(g?.question_text ?? "Question"),
      answers: Array.isArray(g?.answers)
        ? g.answers.map((a: any) => ({
            id: Number(a?.id),
            answer_id: Number(a?.answer_id),
            answer_text: String(a?.answer_text ?? "—"),
            answered_at: a?.answered_at ? String(a.answered_at) : undefined,
          }))
        : [],
    }));
    // If a newer request started, ignore this result
    if (reqId !== answersReqRef.current) return;
    lastAnswersUserIdRef.current = userId;
    setUserAnswers(groups);
  } catch (err: any) {
    if (reqId !== answersReqRef.current) return;
    setAnswersError(err?.message || 'Failed to load answers');
  } finally {
    if (reqId === answersReqRef.current) setAnswersLoading(false);
  }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleOpenUserDialog = (user: User) => {
    setSelectedUser(user)
    setIsDialogOpen(true)
    fetchAndFilterUserAnswers(user.id)
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <Button onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
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
              <Select
                value={String(perPage)}
                onValueChange={(val) => {
                  const n = Number(val)
                  setPerPage(n)
                  setCurrentPage(1)
                  // explicitly pass size to avoid stale state
                  fetchUsers(1, n)
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 (default)</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Phone No</TableHead>
                    <TableHead>Created</TableHead>
                    {/* <TableHead>Last Login</TableHead> */}
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
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => handleOpenUserDialog(user)}
                    >
                      <TableCell className="font-mono text-sm">{user.id}</TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.userRole ? user.userRole.charAt(0).toUpperCase() + user.userRole.slice(1) : "User"}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "destructive"}>{user.status}</Badge>
                      </TableCell>
                      <TableCell>{user.userPhone || "-"}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      {/* <TableCell>
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
                      </TableCell> */}
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
                            <DropdownMenuItem className="text-red-600" onClick={() => {
                              setPendingDeleteUserId(user.id)
                              setIsDeleteConfirmOpen(true)
                            }}>
                              <Trash2 className="mr-2 h-4 w-4" /> Deactivate user
                            </DropdownMenuItem>
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

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              // reset answers state when dialog closes
              // also invalidate any in-flight requests
              answersReqRef.current += 1
              lastAnswersUserIdRef.current = null
              setUserAnswers([])
              setAnswersError(null)
              setAnswersLoading(false)
            }
          }}
        >
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
                {/* <div className="flex items-center justify-between"><span className="text-muted-foreground">Last Login</span><span>{selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : "Never"}</span></div> */}
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Account Created</span><span>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : "-"}</span></div>

                {/* User Answer Section */}
                <div className="mt-4 border-t pt-3">
                  <h4 className="text-sm font-semibold mb-2">User Answers</h4>
                  {answersLoading && (
                    <div className="text-xs text-muted-foreground">Loading answers...</div>
                  )}
                  {!answersLoading && answersError && (
                    <div className="text-xs text-red-500">{answersError}</div>
                  )}
                  {!answersLoading && !answersError && userAnswers.length === 0 && (
                    <div className="text-xs text-muted-foreground">No answers found.</div>
                  )}
                  {!answersLoading && !answersError && userAnswers.length > 0 && (
                    <ul className="space-y-3 max-h-60 overflow-auto pr-1">
                      {userAnswers.map((group) => (
                        <li key={group.question_id} className="rounded-md border p-2">
                          <p className="text-xs font-medium mb-2">{group.question_text}</p>
                          {group.answers.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No selection</p>
                          ) : (
                            <ul className="ml-2 space-y-1">
                              {group.answers.map((a) => (
                                <li key={a.id} className="flex items-start justify-between gap-2">
                                  <span className="text-xs text-foreground">{a.answer_text}</span>
                                  {a.answered_at ? (
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(a.answered_at).toLocaleString()}</span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Wallets Section */}
                <div className="mt-4 border-t pt-3">
                  <h4 className="text-sm font-semibold mb-2">Wallets</h4>
                  {Array.isArray(selectedUser.userWallets) && selectedUser.userWallets.length > 0 ? (
                    <ul className="space-y-2 max-h-60 overflow-auto pr-1">
                      {selectedUser.userWallets.map((w: any, idx: number) => (
                        <li key={w.id ?? w.walletId ?? idx} className="rounded-md border p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{toLabel(w.type ?? w.walletType) || 'Wallet'}</span>
                            {typeof w.balance !== 'undefined' || typeof w.amount !== 'undefined' ? (
                              <span className="text-muted-foreground">{w.balance ?? w.amount}</span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-muted-foreground break-words">
                            {w.currency ? `Currency: ${toLabel(w.currency)}` : ''}
                            {w.status ? ` • Status: ${toLabel(w.status)}` : ''}
                          </div>
                          {w.created_at || w.createdAt ? (
                            <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {new Date(w.created_at ?? w.createdAt).toLocaleString()}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-muted-foreground">No wallet found.</div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add User Modal */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
              <DialogDescription>Enter the user details to create an account.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm" htmlFor="first_name">First name</label>
                  <Input id="first_name" name="first_name" value={addForm.first_name} onChange={handleAddChange} required className={addErrors.first_name ? 'border-red-500' : ''} />
                  {addErrors.first_name && <p className="text-red-500 text-xs mt-1">{addErrors.first_name[0]}</p>}
                </div>
                <div>
                  <label className="text-sm" htmlFor="last_name">Last name</label>
                  <Input id="last_name" name="last_name" value={addForm.last_name} onChange={handleAddChange} required className={addErrors.last_name ? 'border-red-500' : ''} />
                  {addErrors.last_name && <p className="text-red-500 text-xs mt-1">{addErrors.last_name[0]}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-sm" htmlFor="birth_day">Birth day</label>
                  <Input id="birth_day" name="birth_day" type="number" min={1} max={31} value={addForm.birth_day} onChange={handleAddChange} required className={addErrors.birth_day ? 'border-red-500' : ''} />
                  {addErrors.birth_day && <p className="text-red-500 text-xs mt-1">{addErrors.birth_day[0]}</p>}
                </div>
                <div>
                  <label className="text-sm" htmlFor="birth_month">Birth month</label>
                  <Input id="birth_month" name="birth_month" type="number" min={1} max={12} value={addForm.birth_month} onChange={handleAddChange} required className={addErrors.birth_month ? 'border-red-500' : ''} />
                  {addErrors.birth_month && <p className="text-red-500 text-xs mt-1">{addErrors.birth_month[0]}</p>}
                </div>
                <div>
                  <label className="text-sm" htmlFor="birth_year">Birth year</label>
                  <Input id="birth_year" name="birth_year" type="number" min={1900} max={3000} value={addForm.birth_year} onChange={handleAddChange} required className={addErrors.birth_year ? 'border-red-500' : ''} />
                  {addErrors.birth_year && <p className="text-red-500 text-xs mt-1">{addErrors.birth_year[0]}</p>}
                </div>
              </div>
              <div>
                <label className="text-sm" htmlFor="email">Email</label>
                <Input id="email" name="email" type="email" value={addForm.email} onChange={handleAddChange} required className={addErrors.email ? 'border-red-500' : ''} />
                {addErrors.email && <p className="text-red-500 text-xs mt-1">{addErrors.email[0]}</p>}
              </div>
              <div>
                <label className="text-sm" htmlFor="phone">Phone</label>
                <Input id="phone" name="phone" value={addForm.phone} onChange={handleAddChange} required className={addErrors.phone ? 'border-red-500' : ''} />
                {addErrors.phone && <p className="text-red-500 text-xs mt-1">{addErrors.phone[0]}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm" htmlFor="password">Password</label>
                  <div className="relative">
                    <Input id="password" name="password" type={showPwd ? 'text' : 'password'} value={addForm.password} onChange={handleAddChange} required className={`pr-9 ${addErrors.password ? 'border-red-500' : ''}`} />
                    <button type="button" className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground" onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? 'Hide password' : 'Show password'}>
                      {showPwd ? (
                        // eye-off icon
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18"/><path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"/><path d="M16.24 16.24A8.5 8.5 0 0 1 12 18.5c-4.48 0-8.27-2.94-10-7 1.05-2.6 2.92-4.74 5.24-6.06"/><path d="M9.88 5.58A8.5 8.5 0 0 1 12 5.5c4.48 0 8.27 2.94 10 7-.46 1.14-1.07 2.18-1.82 3.1"/></svg>
                      ) : (
                        // eye icon
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                  {addErrors.password && <p className="text-red-500 text-xs mt-1">{addErrors.password[0]}</p>}
                </div>
                <div>
                  <label className="text-sm" htmlFor="password_confirmation">Confirm Password</label>
                  <div className="relative">
                    <Input id="password_confirmation" name="password_confirmation" type={showPwdConfirm ? 'text' : 'password'} value={addForm.password_confirmation} onChange={handleAddChange} required className={`pr-9 ${addErrors.password_confirmation ? 'border-red-500' : ''}`} />
                    <button type="button" className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground" onClick={() => setShowPwdConfirm(v => !v)} aria-label={showPwdConfirm ? 'Hide password' : 'Show password'}>
                      {showPwdConfirm ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18"/><path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"/><path d="M16.24 16.24A8.5 8.5 0 0 1 12 18.5c-4.48 0-8.27-2.94-10-7 1.05-2.6 2.92-4.74 5.24-6.06"/><path d="M9.88 5.58A8.5 8.5 0 0 1 12 5.5c4.48 0 8.27 2.94 10 7-.46 1.14-1.07 2.18-1.82 3.1"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                  {addErrors.password_confirmation && <p className="text-red-500 text-xs mt-1">{addErrors.password_confirmation[0]}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addLoading}>{addLoading ? 'Creating...' : 'Create User'}</Button>
              </div>
            </form>
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
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate user</AlertDialogTitle>
              <AlertDialogDescription>
                Deactivating a user disables their access without permanently deleting their data. You can re-activate them later. Proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingDeleteUserId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser}>Deactivate</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}