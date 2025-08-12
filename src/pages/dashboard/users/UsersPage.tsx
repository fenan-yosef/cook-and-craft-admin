import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, UserCheck, UserX } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: number
  name: string
  email: string
  status: "active" | "blocked"
  created_at: string
  last_login?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      // In a real app, you'd have an endpoint to list all users
      // For now, we'll simulate the data
      const mockUsers: User[] = [
        {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          status: "active",
          created_at: "2024-01-15T10:30:00Z",
          last_login: "2024-01-20T14:22:00Z",
        },
        {
          id: 2,
          name: "Jane Smith",
          email: "jane@example.com",
          status: "blocked",
          created_at: "2024-01-10T09:15:00Z",
          last_login: "2024-01-18T11:45:00Z",
        },
      ]
      setUsers(mockUsers)
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
      await apiService.patch(`/users/${userId}/block`)
      setUsers(users.map((user) => (user.id === userId ? { ...user, status: "blocked" as const } : user)))
      toast({
        title: "Success",
        description: "User blocked successfully",
      })
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
      await apiService.patch(`/users/${userId}/unblock`)
      setUsers(users.map((user) => (user.id === userId ? { ...user, status: "active" as const } : user)))
      toast({
        title: "Success",
        description: "User unblocked successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive",
      })
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
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
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
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
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
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
