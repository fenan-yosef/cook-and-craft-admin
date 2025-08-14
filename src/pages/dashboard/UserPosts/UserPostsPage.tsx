// src/pages/dashboard/posts/UserPostsPage.tsx

import { useState, useEffect } from "react";
// Removed unused useParams import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "../../../lib/api-service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Post {
  id: number;
  user_id: number;
  is_hidden: number;
  status: "published" | "pending" | "draft" | "hidden" | "deleted";
  created_at: string;
  updated_at: string;
  title: string;
  content: string;
  likes_count: number;
  comments_count: number;
  post_versions: {
    id: number;
    description: string;
  }[];
  post_likes: any[];
  post_poll: any | null;
}

interface User {
  id: number;
  name: string;
  email: string;
}

const statusColors = {
  published: "bg-green-100 text-green-800",
  pending: "bg-blue-100 text-blue-800",
  draft: "bg-gray-100 text-gray-800",
  hidden: "bg-yellow-100 text-yellow-800",
  deleted: "bg-red-100 text-red-800",
};

export default function UserPostsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId !== null) {
      fetchUserPosts(selectedUserId);
    } else {
      setPosts([]);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.get("/admins/users");
      const usersData = response.data.data;
      setUsers(usersData);
      if (usersData.length > 0) {
        setSelectedUserId(usersData[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async (id: number) => {
    try {
      setLoadingPosts(true);
      const response = await apiService.get(`/users/${id}/posts`);
      
      const postsData = response.data.data;

      const transformedPosts = postsData.map((post: any) => ({
        ...post,
        title: post.post_versions[0]?.description.substring(0, 30) + "..." || `Post #${post.id}`,
        content: post.post_versions[0]?.description || "No Content",
        likes_count: post.post_likes.length,
        comments_count: 0,
      }));

      setPosts(transformedPosts);
    } catch (error) {
      console.error(`Failed to fetch posts for user ${id}:`, error);
      toast({
        title: "Error",
        description: `Failed to fetch posts for user ${id}`,
        variant: "destructive",
      });
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const selectedUser = users.find(user => user.id === selectedUserId);

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="md:w-1/4 p-4 md:p-8 pt-6 border-r">
        <h3 className="text-2xl font-bold tracking-tight mb-4">Users</h3>
        <ul className="space-y-2">
          {loading ? (
            <p>Loading users...</p>
          ) : users.length === 0 ? (
            <p>No users found.</p>
          ) : (
            users.map(user => (
              <li key={user.id}>
                <Button 
                  variant={selectedUserId === user.id ? "secondary" : "ghost"}
                  onClick={() => setSelectedUserId(user.id)}
                  className="w-full justify-start"
                >
                  {user.name}
                </Button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">
            Posts by {selectedUser ? selectedUser.name : "..."}
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Posts</CardTitle>
            <CardDescription>Manage posts for the selected user.</CardDescription>
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
                {loadingPosts ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading posts...
                    </TableCell>
                  </TableRow>
                ) : filteredPosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No posts found for this user.
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
  );
}