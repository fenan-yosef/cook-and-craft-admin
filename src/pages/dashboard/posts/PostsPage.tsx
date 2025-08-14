// src/pages/dashboard/posts/PostsPage.tsx

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Eye, Trash2, PlusCircle, Pin, PinOff, Star, StarOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";

interface Post {
  id: number;
  user_id: number;
  is_hidden: number;
  is_pinned: boolean;
  is_highlighted: boolean;
  status: "published" | "pending" | "draft" | "hidden" | "deleted";
  created_at: string;
  updated_at: string;
  title: string;
  content: string;
  likes_count: number;
  comments_count: number;
  post_versions: { id: number; description: string }[];
  post_likes: any[];
  post_poll: any | null;
  media?: { id: number; storage_path: string }[];
}

const statusColors = {
  published: "bg-green-100 text-green-800",
  pending: "bg-blue-100 text-blue-800",
  draft: "bg-gray-100 text-gray-800",
  hidden: "bg-yellow-100 text-yellow-800",
  deleted: "bg-red-100 text-red-800",
};

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { user, isLoading } = useAuth(); // Destructure isLoading from useAuth
  const isAdmin = user?.role === "admin";

  const [newPost, setNewPost] = useState({
    description: "",
    media: [] as File[],
    pollQuestion: "",
    pollOptions: ["", ""],
    pollOpenAt: "",
    pollCloseAt: "",
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(
        "/posts?withLikes=true&withPolls=true&withPins=true&withHighlights=true"
      );
      const postsData = response.data.data;

      const transformedPosts = postsData.map((post: any) => ({
        ...post,
        title: post.post_versions[0]?.description.substring(0, 30) + "..." || `Post #${post.id}`,
        content: post.post_versions[0]?.description || "No Content",
        likes_count: post.post_likes?.length || 0,
        is_pinned: !!post.post_pin,
        is_highlighted: !!post.post_highlight,
        status: post.status,
      }));

      setPosts(transformedPosts);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      toast({ title: "Error", description: "Failed to fetch posts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingPost(true);

    // FIX: Check for user and user.id before attempting to create the post
    if (!user || !user.email) {
        setIsCreatingPost(false);
        toast({ title: "Error", description: "User not authenticated or user ID is missing.", variant: "destructive" });
        return;
    }

    try {
      const formData = new FormData();
      formData.append("description", newPost.description);
      formData.append("user_id", String(user.id));
      formData.append("status", isAdmin ? "published" : "pending");

      if (newPost.media.length === 0) {
        toast({ title: "Error", description: "At least one media file is required.", variant: "destructive" });
        setIsCreatingPost(false);
        return;
      }
      
      newPost.media.forEach((file, index) => formData.append(`media[${index}][file]`, file));

      formData.append("tags[0][tag_type]", "user");
      formData.append("tags[0][user_id]", String(user.id));
      formData.append("tags[0][start_pos]", "1");
      formData.append("tags[0][end_pos]", Math.max(2, newPost.description.length).toString());

      if (isAdmin && newPost.pollQuestion) {
        formData.append("poll[question]", newPost.pollQuestion);
        formData.append("poll[result_mode]", "public");
        if (newPost.pollOpenAt) formData.append("poll[open_at]", newPost.pollOpenAt);
        if (newPost.pollCloseAt) formData.append("poll[close_at]", newPost.pollCloseAt);
        newPost.pollOptions.forEach((option, idx) => {
          if (option) formData.append(`poll[poll_options][${idx}][option_txt]`, option);
        });
      }

      await apiService.postMultipart("/posts", formData);

      toast({ title: "Success", description: "Post created successfully!" });
      setIsDialogOpen(false);
      setNewPost({ description: "", media: [], pollQuestion: "", pollOptions: ["", ""], pollOpenAt: "", pollCloseAt: "" });
      fetchPosts();
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.response?.data?.message || error.message || "Failed to create post";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handlePinPost = async (postId: number, isPinned: boolean) => {
    if (isPinned) return toast({ title: "Already pinned", description: "This post is already pinned." });
    try {
      await apiService.post("/post_pins", { post_id: postId, sort_index: 1 });
      toast({ title: "Success", description: "Post pinned successfully." });
      fetchPosts();
    } catch {
      toast({ title: "Error", description: "Failed to pin post.", variant: "destructive" });
    }
  };

  const handleUnpinPost = async (postId: number) => {
    try {
      await apiService.delete(`/post_pins/${postId}`);
      toast({ title: "Success", description: "Post unpinned successfully." });
      fetchPosts();
    } catch {
      toast({ title: "Error", description: "Failed to unpin post.", variant: "destructive" });
    }
  };

  const handleHighlightPost = async (postId: number, isHighlighted: boolean) => {
    if (isHighlighted) return toast({ title: "Already highlighted", description: "This post is already highlighted." });
    try {
      await apiService.post("/post_highlights", { post_id: postId, short_caption: "Weekly Highlight", sort_index: 1 });
      toast({ title: "Success", description: "Post highlighted successfully." });
      fetchPosts();
    } catch {
      toast({ title: "Error", description: "Failed to highlight post.", variant: "destructive" });
    }
  };

  const handleRemoveHighlight = async (postId: number) => {
    try {
      await apiService.delete(`/post_highlights/${postId}`);
      toast({ title: "Success", description: "Highlight removed successfully." });
      fetchPosts();
    } catch {
      toast({ title: "Error", description: "Failed to remove highlight.", variant: "destructive" });
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await apiService.delete(`/posts/${postId}`);
      toast({ title: "Success", description: "Post deleted successfully." });
      fetchPosts();
    } catch {
      toast({ title: "Error", description: "Failed to delete post.", variant: "destructive" });
    }
  };

  const filteredPosts = posts.filter(
    (post) => post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              post.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Posts</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={isLoading}><PlusCircle className="mr-2 h-4 w-4" /> Create Post</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
                <DialogDescription>Fill out the form below to create a new post.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePost} className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newPost.description}
                    onChange={(e) => setNewPost({ ...newPost, description: e.target.value })}
                    placeholder="What's on your mind?"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="media">Media (Image/Video)</Label>
                  <Input
                    id="media"
                    type="file"
                    multiple
                    onChange={(e) => setNewPost({ ...newPost, media: e.target.files ? Array.from(e.target.files) : [] })}
                  />
                </div>
                {isAdmin && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="pollQuestion">Poll Question (Optional)</Label>
                      <Input
                        id="pollQuestion"
                        value={newPost.pollQuestion}
                        onChange={(e) => setNewPost({ ...newPost, pollQuestion: e.target.value })}
                      />
                    </div>
                    {newPost.pollQuestion && (
                      <div className="grid gap-2">
                        <Label>Poll Options</Label>
                        {newPost.pollOptions.map((option, index) => (
                          <Input
                            key={index}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...newPost.pollOptions];
                              newOptions[index] = e.target.value;
                              setNewPost({ ...newPost, pollOptions: newOptions });
                            }}
                            placeholder={`Option ${index + 1}`}
                          />
                        ))}
                        <Button type="button" variant="outline" onClick={() => setNewPost({ ...newPost, pollOptions: [...newPost.pollOptions, ""] })}>
                          Add Option
                        </Button>
                      </div>
                    )}
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="pollOpenAt">Poll Open At</Label>
                        <Input id="pollOpenAt" type="datetime-local" value={newPost.pollOpenAt} onChange={(e) => setNewPost({ ...newPost, pollOpenAt: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="pollCloseAt">Poll Close At</Label>
                        <Input id="pollCloseAt" type="datetime-local" value={newPost.pollCloseAt} onChange={(e) => setNewPost({ ...newPost, pollCloseAt: e.target.value })} />
                      </div>
                    </div>
                  </>
                )}
                <Button type="submit" disabled={isCreatingPost || isLoading}>{isCreatingPost ? "Creating..." : "Create Post"}</Button>
              </form>
            </DialogContent>
          </Dialog>
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
                <Input placeholder="Search posts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Likes</TableHead>
                  <TableHead>Pinned</TableHead>
                  <TableHead>Highlighted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filteredPosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No posts found</TableCell>
                  </TableRow>
                ) : (
                  filteredPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="font-medium">{post.title}</div>
                        <div className="text-sm text-muted-foreground">{post.content}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[post.status]} hover:bg-opacity-80`}>{post.status}</Badge>
                      </TableCell>
                      <TableCell>{post.likes_count}</TableCell>
                      <TableCell>{post.is_pinned ? <Badge variant="secondary">Pinned</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{post.is_highlighted ? <Badge variant="secondary">Highlighted</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                {post.is_pinned ? (
                                  <DropdownMenuItem onClick={() => handleUnpinPost(post.id)}><PinOff className="mr-2 h-4 w-4" /> Unpin Post</DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handlePinPost(post.id, post.is_pinned)}><Pin className="mr-2 h-4 w-4" /> Pin Post</DropdownMenuItem>
                                )}
                                {post.is_highlighted ? (
                                  <DropdownMenuItem onClick={() => handleRemoveHighlight(post.id)}><StarOff className="mr-2 h-4 w-4" /> Remove Highlight</DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleHighlightPost(post.id, post.is_highlighted)}><Star className="mr-2 h-4 w-4" /> Highlight Post</DropdownMenuItem>
                                )}
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeletePost(post.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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