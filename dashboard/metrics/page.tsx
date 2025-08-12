"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, Users, MessageSquare, Heart, Eye, Activity } from "lucide-react"
import { ProfileAvatar } from "@/components/profile-avatar"

interface PostMetrics {
  id: number
  title: string
  author: string
  views: number
  likes: number
  comments: number
  shares: number
  engagement_rate: number
  created_at: string
}

interface CommunityStats {
  total_posts: number
  total_users: number
  total_likes: number
  total_comments: number
  active_users_today: number
  posts_today: number
  engagement_rate: number
  growth_rate: number
}

const engagementData = [
  { name: "Jan", posts: 45, likes: 234, comments: 89 },
  { name: "Feb", posts: 52, likes: 287, comments: 102 },
  { name: "Mar", posts: 48, likes: 312, comments: 95 },
  { name: "Apr", posts: 61, likes: 398, comments: 134 },
  { name: "May", posts: 55, likes: 445, comments: 156 },
  { name: "Jun", posts: 67, likes: 523, comments: 178 },
]

const userActivityData = [
  { name: "Mon", active_users: 120 },
  { name: "Tue", active_users: 145 },
  { name: "Wed", active_users: 132 },
  { name: "Thu", active_users: 167 },
  { name: "Fri", active_users: 189 },
  { name: "Sat", active_users: 156 },
  { name: "Sun", active_users: 134 },
]

const postCategoryData = [
  { name: "Discussion", value: 35, color: "#8884d8" },
  { name: "Question", value: 25, color: "#82ca9d" },
  { name: "Tutorial", value: 20, color: "#ffc658" },
  { name: "News", value: 15, color: "#ff7300" },
  { name: "Other", value: 5, color: "#00ff00" },
]

export default function MetricsPage() {
  const [topPosts, setTopPosts] = useState<PostMetrics[]>([])
  const [stats, setStats] = useState<CommunityStats>({
    total_posts: 0,
    total_users: 0,
    total_likes: 0,
    total_comments: 0,
    active_users_today: 0,
    posts_today: 0,
    engagement_rate: 0,
    growth_rate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("7d")

  useEffect(() => {
    fetchMetrics()
  }, [timeRange])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      // Mock data for demonstration
      const mockStats: CommunityStats = {
        total_posts: 1247,
        total_users: 3456,
        total_likes: 8923,
        total_comments: 2341,
        active_users_today: 234,
        posts_today: 12,
        engagement_rate: 68.5,
        growth_rate: 15.3,
      }

      const mockTopPosts: PostMetrics[] = [
        {
          id: 1,
          title: "Welcome to our community!",
          author: "John Doe",
          views: 1234,
          likes: 89,
          comments: 23,
          shares: 12,
          engagement_rate: 7.2,
          created_at: "2024-01-20T10:30:00Z",
        },
        {
          id: 2,
          title: "Tips for new members",
          author: "Jane Smith",
          views: 987,
          likes: 67,
          comments: 18,
          shares: 8,
          engagement_rate: 6.8,
          created_at: "2024-01-19T14:22:00Z",
        },
        {
          id: 3,
          title: "Community feedback",
          author: "Alice Brown",
          views: 756,
          likes: 45,
          comments: 15,
          shares: 5,
          engagement_rate: 5.9,
          created_at: "2024-01-18T16:45:00Z",
        },
        {
          id: 4,
          title: "How to get started",
          author: "Bob Johnson",
          views: 654,
          likes: 34,
          comments: 12,
          shares: 3,
          engagement_rate: 5.2,
          created_at: "2024-01-17T09:20:00Z",
        },
      ]

      setStats(mockStats)
      setTopPosts(mockTopPosts)
    } catch (error) {
      console.error("Failed to fetch metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_posts.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="inline-flex items-center text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />+{stats.posts_today} today
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="inline-flex items-center text-green-600">
                  <Activity className="mr-1 h-3 w-3" />
                  {stats.active_users_today} active today
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.total_likes + stats.total_comments).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total_likes.toLocaleString()} likes, {stats.total_comments.toLocaleString()} comments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.engagement_rate}%</div>
              <p className="text-xs text-muted-foreground">
                <span className="inline-flex items-center text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />+{stats.growth_rate}% from last period
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Community Engagement Over Time</CardTitle>
              <CardDescription>Posts, likes, and comments by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="posts" fill="#8884d8" name="Posts" />
                  <Bar dataKey="likes" fill="#82ca9d" name="Likes" />
                  <Bar dataKey="comments" fill="#ffc658" name="Comments" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Active Users</CardTitle>
              <CardDescription>User activity throughout the week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={userActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="active_users" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Post Categories</CardTitle>
              <CardDescription>Distribution of post types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={postCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {postCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {postCategoryData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                      {item.name}
                    </div>
                    <span>{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Top Performing Posts</CardTitle>
              <CardDescription>Posts with highest engagement rates</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : (
                    topPosts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <div className="max-w-xs truncate font-medium">{post.title}</div>
                        </TableCell>
                        <TableCell>{post.author}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Eye className="mr-1 h-3 w-3" />
                            {post.views.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2 text-sm">
                            <span>{post.likes}</span>
                            <Heart className="h-3 w-3" />
                            <span>{post.comments}</span>
                            <MessageSquare className="h-3 w-3" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={post.engagement_rate > 6 ? "default" : "secondary"}>
                            {post.engagement_rate}%
                          </Badge>
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
    </div>
  )
}
