"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import { ProfileAvatar } from "@/components/profile-avatar"

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
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
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
          user_id: 1,
          user_name: "John Doe",
          title: "Welcome to our community!",
          content:
            "This is a great place to share ideas and connect with others. Looking forward to engaging discussions!",
          status: "published",
          is_pinned: true,
          is_highlighted: false,
          likes_count: 45,
          comments_count: 12,
          reports_count: 0,
          created_at: "2024-01-20T10:30:00Z",
          updated_at: "2024-01-20T10:30:00Z",
        },
        {
          id: 2,
          user_id: 2,
          user_name: "Jane Smith",
          title: "Tips for new members",
          content:
            "Here are some helpful tips for getting started in our community. Be respectful, engage meaningfully, and have fun!",
          status: "published",
          is_pinned: false,
          is_highlighted: true,
          likes_count: 23,
          comments_count: 8,
          reports_count: 0,
          created_at: "2024-01-19T14:22:00Z",
          updated_at: "2024-01-19T14:22:00Z",
        },
        {
          id: 3,
          user_id: 3,
          user_name: "Bob Johnson",
          title: "Inappropriate content example",
          content:
            "This post contains content that violates community guidelines and has been reported multiple times.",
          status: "hidden",
          is_pinned: false,
          is_highlighted: false,
          likes_count: 2,
          comments_count: 15,
          reports_count: 5,
          created_at: "2024-01-18T16:45:00Z",
          updated_at: "2024-01-19T09:30:00Z",
        },
        {
          id: 4,
          user_id: 4,
          user_name: "Alice Brown",
          title: "Community feedback",
          content: "I love this platform! The community is so welcoming and supportive. Keep up the great work!",
          status: "published",
          is_pinned: false,
          is_highlighted: false,
          likes_count: 67,
          comments_count: 24,
          reports_count: 0,
          created_at: "2024-01-17T09:20:00Z",
          updated_at: "2024-01-17T09:20:00Z",
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

  const updatePostStatus = async (postId: number, newStatus: Post["status"]) => {
    try {
      // In real app: await apiService.put(`/posts/${postId}`, { status: newStatus })
      setPosts(
        posts.map((post) =>
          post.id === postId ? { ...post, status: newStatus, updated_at: new Date().toISOString() } : post,
        ),
      )
      toast({
        title: "Success",
        description: `Post ${newStatus} successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update post status",
        variant: "destructive",
      })
    }
  }

  const togglePin = async (postId: number) => {
    try {
      const post = posts.find((p) => p.id === postId)
      if (!post) return

      if (post.is_pinned) {
        // In real app: await apiService.delete(`/post_pins/${pinId}`)
      } else {
        // In real app: await apiService.post("/post_pins", { post_id: postId })
      }

      setPosts(
        posts.map((p) =>
          p.id === postId ? { ...p, is_pinned: !p.is_pinned, updated_at: new Date().toISOString() } : p,
        ),
      )

      toast({
        title: "Success",
        description: `Post ${post.is_pinned ? "unpinned" : "pinned"} successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle pin status",
        variant: "destructive",
      })
    }
  }

  const toggleHighlight = async (postId: number) => {
    try {
      const post = posts.find((p) => p.id === postId)
      if (!post) return

      if (post.is_highlighted) {
        // In real app: await apiService.delete(`/post_highlights/${highlightId}`)
      } else {
        // In real app: await apiService.post("/post_highlights", { post_id: postId })
      }

      setPosts(
        posts.map((p) =>
          p.id === postId ? { ...p, is_highlighted: !p.is_highlighted, updated_at: new Date().toISOString() } : p,
        ),
      )

      toast({
        title: "Success",
        description: `Post ${post.is_highlighted ? "unhighlighted" : "highlighted"} successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle highlight status",
        variant: "destructive",
      })
    }
  }

  const deletePost = async (postId: number) => {
    try {
      // In real app: await apiService.delete(`/posts/${postId}`)
      setPosts(posts.filter((post) => post.id !== postId))
      toast({
        title: "Success",
        description: "Post deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      })
    }
  }

  const viewPost = (post: Post) => {
    setSelectedPost(post)
    setIsViewDialogOpen(true)
  }

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.user_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || post.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Community Posts</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Posts</CardTitle>
            <CardDescription>Moderate community posts, manage visibility, and handle reports</CardDescription>
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Reports</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Date</TableHead>
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
                ) : filteredPosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No posts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium truncate">{post.title}</div>
                          <div className="text-sm text-muted-foreground truncate">{post.content}</div>
                        </div>
                      </TableCell>
                      <TableCell>{post.user_name}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[post.status]}>{post.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2 text-sm">
                          <div className="flex items-center">
                            <Heart className="mr-1 h-3 w-3" />
                            {post.likes_count}
                          </div>
                          <div className="flex items-center">
                            <MessageCircle className="mr-1 h-3 w-3" />
                            {post.comments_count}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {post.reports_count > 0 ? (
                          <Badge variant="destructive">{post.reports_count}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {post.is_pinned && <Pin className="h-4 w-4 text-blue-600" />}
                          {post.is_highlighted && <Star className="h-4 w-4 text-yellow-600" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewPost(post)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {post.status === "published" ? (
                              <DropdownMenuItem onClick={() => updatePostStatus(post.id, "hidden")}>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Hide Post
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => updatePostStatus(post.id, "published")}>
                                <Eye className="mr-2 h-4 w-4" />
                                Publish Post
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => togglePin(post.id)}>
                              {post.is_pinned ? (
                                <>
                                  <PinOff className="mr-2 h-4 w-4" />
                                  Unpin Post
                                </>
                              ) : (
                                <>
                                  <Pin className="mr-2 h-4 w-4" />
                                  Pin Post
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleHighlight(post.id)}>
                              {post.is_highlighted ? (
                                <>
                                  <StarOff className="mr-2 h-4 w-4" />
                                  Remove Highlight
                                </>
                              ) : (
                                <>
                                  <Star className="mr-2 h-4 w-4" />
                                  Highlight Post
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => deletePost(post.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Post
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

        {/* View Post Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Post Details</DialogTitle>
              <DialogDescription>View full post content and details</DialogDescription>
            </DialogHeader>
            {selectedPost && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Title</Label>
                  <p className="text-sm mt-1">{selectedPost.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Author</Label>
                  <p className="text-sm mt-1">{selectedPost.user_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Content</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{selectedPost.content}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={`mt-1 ${statusColors[selectedPost.status]}`}>{selectedPost.status}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="text-sm mt-1">{new Date(selectedPost.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Likes</Label>
                    <p className="text-sm mt-1">{selectedPost.likes_count}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Comments</Label>
                    <p className="text-sm mt-1">{selectedPost.comments_count}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Reports</Label>
                    <p className="text-sm mt-1">{selectedPost.reports_count}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Pin className="h-4 w-4" />
                    <span className="text-sm">{selectedPost.is_pinned ? "Pinned" : "Not pinned"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4" />
                    <span className="text-sm">{selectedPost.is_highlighted ? "Highlighted" : "Not highlighted"}</span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
