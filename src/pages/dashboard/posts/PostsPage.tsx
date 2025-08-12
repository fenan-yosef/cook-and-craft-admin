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
} from "@/components/ui/dropdown-menu"
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
  EyeOff,
  Pin,
  PinOff,
  Star,
  StarOff,
  Trash2,
  Heart,
  MessageCircle,
  Calendar,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Post {
  id: number
  user_id: number
  user_name: string
  title: string
  content: string
  status: "published" | "hidden" | "deleted"
  is_pinned: boolean
  is_highlighted: boolean
  likes_count: number
  comments_count: number
  reports_count: number
  created_at: string
  updated_at: string
}

const statusColors = {
  published: "bg-green-100 text-green-800",
  hidden: "bg-yellow-100 text-yellow-800",
  deleted: "bg-red-100 text-red-800",
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      // Mock data for demonstration
      const mockPosts: Post[] = [
        {
          id: 1,
          user_id: 101,
          user_name: "John Doe",
          title: "My First Post",
          content: "This is the content of my first post.",
          status: "published",
          is_pinned: true,
          is_highlighted: false,
          likes_count: 10,
          comments_count: 5,
          reports_count: 0,
          created_at: "2025-08-01T10:00:00Z",
          updated_at: "2025-08-01T10:00:00Z",
        },
        {
          id: 2,
          user_id: 102,
          user_name: "Jane Smith",
          title: "Another Day in Paradise",
          content: "Sharing my thoughts on a beautiful day.",
          status: "hidden",
          is_pinned: false,
          is_highlighted: true,
          likes_count: 20,
          comments_count: 10,
          reports_count: 1,
          created_at: "2025-08-02T11:00:00Z",
          updated_at: "2025-08-02T11:00:00Z",
        },
      ]

      setPosts(mockPosts)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch posts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Posts</h2>
          <Button>
            <Eye className="mr-2 h-4 w-4" /> View All
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Posts</CardTitle>
            <CardDescription>Manage user posts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Likes</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredPosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No posts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="font-medium">{post.title}</div>
                        <div className="text-sm text-muted-foreground">{post.content}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${statusColors[post.status]} hover:bg-opacity-80`}
                        >
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{post.likes_count}</TableCell>
                      <TableCell>{post.comments_count}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
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
    </div>
  )
}
