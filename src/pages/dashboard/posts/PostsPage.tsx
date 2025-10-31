import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  PlusCircle,
  Pin,
  PinOff,
  Star,
  StarOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";

interface Post {
  id: number;
  user_id: number;
  is_hidden: boolean | number;
  is_deleted: boolean | number;
  is_pinned: boolean;
  pin_id?: number;
  is_highlighted: boolean;
  highlight_id?: number;
  status: "published" | "pending" | "draft" | "hidden" | "deleted";
  created_at: string;
  updated_at: string;
  title: string;
  content: string;
  likes_count: number;
  comments_count: number;
  user?: {
    id: number;
    full_name: string;
    display_name: string;
  };
  post_versions: {
    id: number;
    description: string;
    status: "published" | "pending" | "draft" | "hidden" | "deleted";
  }[];
  post_likes: any[];
  post_poll: any | null;
  media?: string[];
}

const statusColors: Record<Post["status"], string> = {
  published: "bg-green-100 text-green-800",
  pending: "bg-blue-100 text-blue-800",
  draft: "bg-gray-100 text-gray-800",
  hidden: "bg-yellow-100 text-yellow-800",
  deleted: "bg-red-100 text-red-800",
};

export default function PostsPage() {
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const { toast } = useToast();
  const { user, isLoading, token } = useAuth();
  const isAdmin = user?.role === "admin";
  const [showDeleted, setShowDeleted] = useState(false);

  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);
  const [isViewPostDialogOpen, setIsViewPostDialogOpen] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [pollDateError, setPollDateError] = useState<string | null>(null);
  const [handledViewId, setHandledViewId] = useState<number | null>(null);

  const [newPost, setNewPost] = useState({
    title: "",
    description: "",
    media: [] as File[],
    pollQuestion: "",
    pollOptions: ["", ""],
    pollOpenAt: "",
    pollCloseAt: "",
  });

  // New state for post versions
  const [isCreateVersionDialogOpen, setIsCreateVersionDialogOpen] =
    useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [newVersion, setNewVersion] = useState({
    description: "",
    media: [] as File[],
    pollQuestion: "",
    pollOptions: ["", ""],
    pollOpenAt: "",
    pollCloseAt: "",
  });

  const fetchPosts = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);

        if (!user) {
          setLoading(false);
          return;
        }

        if (token) apiService.setAuthToken(token);

        const url = `/posts?withLikes=true&withPolls=true&withVersions=true&page=${page}&isDeleted=${showDeleted}`
          + `&order=desc&sort=desc&orderBy=created_at&sortBy=created_at`;

        const res = await apiService.get(url);

        const pageObj = res?.data ?? res;
        const postsArray: any[] = Array.isArray(pageObj.data)
          ? pageObj.data
          : pageObj?.data ?? [];

        const transformed = postsArray.map(transformPost);

        // Sort the transformed posts by creation date in descending order
        const sortedPosts = transformed.sort((a, b) => {
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });

        setPosts(sortedPosts);
        setCurrentPage(pageObj.current_page || 1);
        setLastPage(pageObj.last_page || 1);
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        toast({
          title: "Error",
          description: "Failed to fetch posts",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast, token, showDeleted, user]
  );
  useEffect(() => {
    if (!isLoading && user) {
      fetchPosts(currentPage);
    }
  }, [isLoading, fetchPosts, currentPage, showDeleted, user]);

  function transformPost(post: any): Post {
    const sortedVersions = [...(post?.post_versions ?? [])].sort(
      (a, b) =>
        new Date(b.created_at || b.updated_at || 0).getTime() -
        new Date(a.created_at || a.updated_at || 0).getTime()
    );
    const latestVersion = sortedVersions[0];
    const latestDesc: string | undefined = latestVersion?.description;
    const latestTitle: string | undefined = latestVersion?.title;
    const titleBase = latestDesc?.slice(0, 30) ?? "";
    const derivedTitle =
      titleBase.length > 0
        ? `${titleBase}${latestDesc && latestDesc.length > 30 ? "..." : ""}`
        : `Post #${post.id}`;
    const safeTitle =
      (typeof post?.title === 'string' && post.title.trim().length > 0)
        ? post.title
        : (typeof latestTitle === 'string' && latestTitle.trim().length > 0)
          ? latestTitle
          : derivedTitle;

    return {
      ...post,
      title: safeTitle,
      content: latestDesc ?? "No Content",
      created_at: post.created_at,
      likes_count: Array.isArray(post?.post_likes)
        ? post.post_likes.length
        : post?.likes_count ?? 0,
      is_pinned: Boolean(
        post?.post_pin || post?.is_pinned || post?.post_type === "pinned"
      ),
      is_highlighted:
        !!post.highlight_caption || post.post_type === "highlighted",
      status: post?.is_deleted
        ? "deleted"
        : post?.is_hidden
        ? "hidden"
        : latestVersion?.status ?? "draft",
      media:
        latestVersion?.images?.map(
          (img: any) =>
            img.image ||
            img.imageUrl ||
            img.url ||
            img.path ||
            img.storage_path ||
            img
        ) || [],
    } as Post;
  }

  async function fetchPostById(id: number): Promise<Post | null> {
    try {
      if (token) apiService.setAuthToken(token);
      const res = await apiService.get(`/posts/${id}?withLikes=true&withPolls=true&withVersions=true`);
      const raw = res?.data ?? res;
      // some APIs wrap under .data; if raw has .id it's directly the post
      const rawPost = raw?.id ? raw : raw?.post ?? raw;
      if (!rawPost?.id) return null;
      return transformPost(rawPost);
    } catch (e) {
      return null;
    }
  }

  // Robust deep-link handler: open by ID from query, fetch single post if not in the list
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewIdStr = params.get("viewPostId");
    const targetId = viewIdStr ? Number(viewIdStr) : NaN;
    if (!viewIdStr || !targetId || Number.isNaN(targetId)) return;
    if (handledViewId === targetId) return; // already handled this ID
    if (isViewPostDialogOpen) return; // don't reopen over an open dialog
    if (isLoading || !user) return; // wait until auth and initial load ready

    const found = posts.find(p => p.id === targetId);
    if (found) {
      handleViewPost(found);
      setHandledViewId(targetId);
      return;
    }

    // Fallback: fetch single post by ID, then open
    (async () => {
      const single = await fetchPostById(targetId);
      if (single) {
        handleViewPost(single);
        setHandledViewId(targetId);
      }
    })();
  }, [location.search, posts, isViewPostDialogOpen, isLoading, user, token, handledViewId]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPost.media.length === 0) {
      toast({
        title: "Error",
        description: "At least one media file is required.",
        variant: "destructive",
      });
      return;
    }

    if (
      newPost.pollOpenAt &&
      newPost.pollCloseAt &&
      new Date(newPost.pollCloseAt) < new Date(newPost.pollOpenAt)
    ) {
      setPollDateError("Poll close date cannot be before open date.");
      return;
    } else {
      setPollDateError(null);
    }
    setIsCreatingPost(true);

    if (!user?.id) {
      setIsCreatingPost(false);
      toast({
        title: "Error",
        description: "User not authenticated or user ID is missing.",
        variant: "destructive",
      });
      return;
    }
    if (token) apiService.setAuthToken(token);

    try {
      const formData = new FormData();
      if (newPost.title) formData.append("title", newPost.title);
      formData.append("description", newPost.description);
      formData.append("user_id", String(user.id));
      // Ensure admin-created posts are published
      if (isAdmin) {
        formData.append("status", "published");
        // Some backends also honor explicit visibility flags
        formData.append("is_hidden", "0");
      }
      newPost.media.forEach((file, idx) => {
        formData.append(`images[${idx}]`, file);
      });
      formData.append("tags[0][tag_type]", "user");
      formData.append("tags[0][user_id]", String(user.id));
      formData.append("tags[0][start_pos]", "0");
      formData.append(
        "tags[0][end_pos]",
        String(Math.max(2, newPost.description.length))
      );
      if (newPost.pollQuestion) {
        formData.append("poll[question]", newPost.pollQuestion);
        formData.append("poll[result_mode]", "hidden");
        if (newPost.pollOpenAt) {
          formData.append("poll[open_at]", newPost.pollOpenAt);
        }
        if (newPost.pollCloseAt) {
          formData.append("poll[close_at]", newPost.pollCloseAt);
        }
        newPost.pollOptions.forEach((option, idx) => {
          if (option.trim()) {
            formData.append(`poll[poll_options][${idx}][option_txt]`, option);
          }
        });
      }

      const createRes: any = await apiService.postMultipart("/posts", formData);

      // Best-effort: immediately publish created post and its latest version if admin
      if (isAdmin) {
        // Try to determine the new post ID from common response shapes
        const createdObj = createRes?.data ?? createRes?.post ?? createRes;
        const newPostId: number | undefined = Number(
          createdObj?.id ?? createdObj?.post_id ?? createdObj?.data?.id
        ) || undefined;

        if (newPostId) {
          try {
            // Fetch the post to locate the latest version ID
            const createdFull = await fetchPostById(newPostId);
            const versions = createdFull?.post_versions || [];
            if (versions.length > 0) {
              const latest = [...versions].sort((a: any, b: any) => {
                const bt = new Date(b.updated_at || b.created_at || 0).getTime();
                const at = new Date(a.updated_at || a.created_at || 0).getTime();
                return bt - at;
              })[0];
              if (latest?.id) {
                // Publish latest version so UI status computes to 'published'
                await apiService.put(`/post_versions/${newPostId}/${latest.id}/status`, { status: "published" });
              }
            }
            // Also ensure the post itself is marked published and visible
            await apiService.put(`/posts/${newPostId}`, { post_id: newPostId, status: "published", is_hidden: 0 });
          } catch (publishErr) {
            // Non-fatal: we'll still refresh the list; errors will be surfaced via fetch
            console.warn("Auto-publish after create failed:", publishErr);
          }
        }
      }

      toast({ title: "Success", description: "Post created successfully!" });
      setIsCreatePostDialogOpen(false);
      setNewPost({
        title: "",
        description: "",
        media: [] as File[],
        pollQuestion: "",
        pollOptions: ["", ""],
        pollOpenAt: "",
        pollCloseAt: "",
      });

  // Show newest posts at top: go to page 1 and refetch
      setCurrentPage(1);
      await fetchPosts(1);
    } catch (error: any) {
      console.error(error);
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to create post";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost?.id) {
      toast({
        title: "Error",
        description: "No post selected to create a new version.",
        variant: "destructive",
      });
      return;
    }

    // Add this validation check
    if (newVersion.media.length === 0) {
      toast({
        title: "Error",
        description: "At least one media file is required.",
        variant: "destructive",
      });
      return;
    }

    if (
      newVersion.pollOpenAt &&
      newVersion.pollCloseAt &&
      new Date(newVersion.pollCloseAt) < new Date(newVersion.pollOpenAt)
    ) {
      setPollDateError("Poll close date cannot be before open date.");
      return;
    } else {
      setPollDateError(null);
    }

    setIsCreatingVersion(true);

    if (!user?.id) {
      setIsCreatingPost(false);
      toast({
        title: "Error",
        description: "User not authenticated or user ID is missing.",
        variant: "destructive",
      });
      return;
    }

    if (token) apiService.setAuthToken(token);

    try {
      const formData = new FormData();
      formData.append("post_id", String(selectedPost.id));
      formData.append("description", newVersion.description);
      newVersion.media.forEach((file, idx) => {
        formData.append(`images[${idx}]`, file);
      });
      formData.append("tags[0][tag_type]", "user");
      formData.append("tags[0][user_id]", String(user.id));
      formData.append("tags[0][start_pos]", "0");
      formData.append(
        "tags[0][end_pos]",
        String(Math.max(2, newVersion.description.length))
      );

      if (newVersion.pollQuestion) {
        formData.append("poll[question]", newVersion.pollQuestion);
        formData.append("poll[result_mode]", "hidden");
        if (newVersion.pollOpenAt) {
          formData.append("poll[open_at]", newVersion.pollOpenAt);
        }
        if (newVersion.pollCloseAt) {
          formData.append("poll[close_at]", newVersion.pollCloseAt);
        }
        newVersion.pollOptions.forEach((option, idx) => {
          if (option.trim()) {
            formData.append(`poll[poll_options][${idx}][option_txt]`, option);
          }
        });
      }

      await apiService.postMultipart("/post_versions", formData);

      toast({
        title: "Success",
        description: "New version created successfully!",
      });
      setIsCreateVersionDialogOpen(false);
      setNewVersion({
        description: "",
        media: [] as File[],
        pollQuestion: "",
        pollOptions: ["", ""],
        pollOpenAt: "",
        pollCloseAt: "",
      });
      fetchPosts(currentPage);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to create new version";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreatingVersion(false);
    }
  };
  useEffect(() => {
    if (selectedPost) {
      const updated = posts.find((p) => p.id === selectedPost.id);
      if (updated) setSelectedPost(updated);
    }
  }, [posts]);

  const handlePinPost = async (post: any) => {
    if (post.is_pinned) {
      return toast({
        title: "Already pinned",
        description: "This post is already pinned.",
      });
    }

    if (token) apiService.setAuthToken(token);

    try {
      await apiService.post("/post_pins", { post_id: post.id, sort_index: 1 });
      toast({ title: "Success", description: "Post pinned successfully." });
      await fetchPosts(currentPage);
    } catch {
      toast({
        title: "Error",
        description: "Failed to pin post.",
        variant: "destructive",
      });
    }
  };

  const handleUnpinPost = async (post: any) => {
    if (token) apiService.setAuthToken(token);

    try {
      // use the post.id directly since there's no post_pin object in response
      await apiService.delete(`/post_pins/${post.pin_id}`);
      toast({ title: "Success", description: "Post unpinned successfully." });
      await fetchPosts(currentPage);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unpin post.",
        variant: "destructive",
      });
    }
  };
  const handleHighlightPost = async (postId: number) => {
    if (token) apiService.setAuthToken(token);
    try {
      const res = await apiService.post("/post_highlights", {
        post_id: postId,
        short_caption: "Weekly Highlight",
        sort_index: 1,
      });

      const highlight = res?.data;

      // Optimistic UI update: attach highlight info
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? { ...post, is_highlighted: true, highlight_id: highlight.id }
            : post
        )
      );

      toast({
        title: "Success",
        description: "Post highlighted successfully.",
      });

      fetchPosts(currentPage);
    } catch {
      toast({
        title: "Error",
        description: "Failed to highlight post.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveHighlight = async (
    postId: number,
    highlightId?: number
  ) => {
    if (!highlightId) {
      toast({
        title: "Error",
        description: "No highlight found for this post.",
        variant: "destructive",
      });
      return;
    }

    if (token) apiService.setAuthToken(token);
    try {
      await apiService.delete(`/post_highlights/${highlightId}`);

      // Optimistic UI update: remove highlight info
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? { ...post, is_highlighted: false, highlight_id: undefined }
            : post
        )
      );

      toast({
        title: "Success",
        description: "Highlight removed successfully.",
      });

      fetchPosts(currentPage);
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove highlight.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (
    postId: number,
    status: "published" | "pending" | "draft" | "hidden" | "deleted"
  ) => {
    // If publishing the post, also publish the latest version so computed status updates correctly
    if (status === "published") {
      const targetPost = posts.find(p => p.id === postId);
      if (targetPost && targetPost.post_versions && targetPost.post_versions.length > 0) {
        // Find latest version by created/updated time
        const latest = [...targetPost.post_versions].sort((a: any, b: any) => {
          const bt = new Date(b.updated_at || b.created_at || 0).getTime();
          const at = new Date(a.updated_at || a.created_at || 0).getTime();
          return bt - at;
        })[0];
        if (latest) {
          // Optimistic UI update
            setPosts(prev => prev.map(p => p.id === postId ? {
              ...p,
              status: 'published',
              post_versions: p.post_versions.map(v => v.id === latest.id ? { ...v, status: 'published' } : v)
            } : p));
          await handleUpdateVersionStatus(postId, latest.id, 'published');
          return;
        }
      }
    }
    if (token) apiService.setAuthToken(token);
    try {
      await apiService.put(`/posts/${postId}`, {
        post_id: postId,
        status: status,
        is_hidden: status === "hidden" ? 1 : 0,
      });
      toast({
        title: "Success",
        description: `Post status updated to ${status}.`,
      });
      fetchPosts(currentPage);
      setIsViewPostDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to update post status.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateVersionStatus = async (
    postId: number,
    versionId: number,
    status: "published" | "pending" | "draft" | "hidden" | "deleted"
  ) => {
    if (token) apiService.setAuthToken(token);
    try {
      await apiService.put(`/post_versions/${postId}/${versionId}/status`, {
        status: status,
      });
      toast({
        title: "Success",
        description: `Post version status updated to ${status}.`,
      });
      fetchPosts(currentPage);
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to update post version status.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (token) apiService.setAuthToken(token);
    try {
      await apiService.delete(`/posts/${postId}`, { is_deleted: true });
      toast({ title: "Success", description: "Post deleted successfully." });
      setIsViewPostDialogOpen(false);
      fetchPosts(currentPage);
    } catch (error) {
      console.error("Failed to delete post:", error);
      toast({
        title: "Error",
        description: "Failed to delete post.",
        variant: "destructive",
      });
    }
  };

  const handleViewPost = (post: Post) => {
    setSelectedPost(post);
    setIsViewPostDialogOpen(true);
  };

  const filteredPosts = posts.filter((post) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      post.title.toLowerCase().includes(q) ||
      post.content.toLowerCase().includes(q);

    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading user data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>You must be logged in to view this page.</p>
      </div>
    );
  }

  const [showPollOptions, setShowPollOptions] = useState(false);

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Posts</h2>
          <Dialog
            open={isCreatePostDialogOpen}
            onOpenChange={setIsCreatePostDialogOpen}
          >
            <DialogTrigger asChild>
              <Button disabled={isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Post
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
                <DialogDescription>
                  Fill out the form below to create a new post.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePost} className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newPost.title}
                    onChange={(e) =>
                      setNewPost({ ...newPost, title: e.target.value })
                    }
                    placeholder="Enter a title"
                    maxLength={100}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newPost.description}
                    onChange={(e) =>
                      setNewPost({ ...newPost, description: e.target.value })
                    }
                    placeholder="What's on your mind?"
                    maxLength={255}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="media">Media (Image/Video)</Label>
                  <Input
                    id="media"
                    type="file"
                    multiple
                    onChange={(e) =>
                      setNewPost({
                        ...newPost,
                        media: e.target.files ? Array.from(e.target.files) : [],
                      })
                    }
                  />
                </div>
                {isAdmin && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="pollQuestion">
                        Poll Question (Optional)
                      </Label>
                      <Input
                        id="pollQuestion"
                        value={newPost.pollQuestion}
                        onChange={(e) =>
                          setNewPost({
                            ...newPost,
                            pollQuestion: e.target.value,
                          })
                        }
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
                              setNewPost({
                                ...newPost,
                                pollOptions: newOptions,
                              });
                            }}
                            placeholder={`Option ${index + 1}`}
                          />
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setNewPost({
                              ...newPost,
                              pollOptions: [...newPost.pollOptions, ""],
                            })
                          }
                        >
                          Add Option
                        </Button>
                      </div>
                    )}
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="pollOpenAt">Poll Open At</Label>
                        <Input
                          id="pollOpenAt"
                          type="datetime-local"
                          value={newPost.pollOpenAt}
                          onChange={(e) =>
                            setNewPost({
                              ...newPost,
                              pollOpenAt: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="pollCloseAt">Poll Close At</Label>
                        <Input
                          id="pollCloseAt"
                          type="datetime-local"
                          value={newPost.pollCloseAt}
                          onChange={(e) =>
                            setNewPost({
                              ...newPost,
                              pollCloseAt: e.target.value,
                            })
                          }
                        />
                      </div>
                      {pollDateError && (
                        <div className="text-red-600 text-sm">
                          {pollDateError}
                        </div>
                      )}
                    </div>
                  </>
                )}
                <Button
                  type="submit"
                  disabled={
                    isCreatingPost || isLoading || newPost.media.length === 0
                  }
                >
                  {isCreatingPost ? "Creating..." : "Create Post"}
                </Button>
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
                <Input
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDeleted(!showDeleted)}
              >
                {showDeleted ? "Hide Deleted Posts" : "Show Deleted Posts"}
              </Button>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="px-2 py-1 text-sm">
                  Page {currentPage} of {lastPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === lastPage}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(lastPage, p + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Likes</TableHead>
                  <TableHead>Poll</TableHead>
                  <TableHead>Images</TableHead>
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
                ) : filteredPosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No posts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPosts.map((post) => (
                    <TableRow
                      key={post.id}
                      className={post.is_highlighted ? "bg-yellow-50" : ""}
                    >
                      <TableCell className="w-[25%]">
                        <div className="flex items-center gap-2">
                          {post.is_highlighted && (
                            <Star className="h-4 w-4 text-yellow-500" />
                          )}
                          {post.is_pinned && (
                            <Pin className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="font-medium">{post.title}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {post.content}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${statusColors[post.status]} hover:bg-opacity-80`}
                        >
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{post.likes_count}</TableCell>
                      <TableCell>
                        {post.post_poll && post.post_poll.question ? (
                          <span>{post.post_poll.question}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No Poll</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {post.media && post.media.length > 0 ? (
                          <div className="flex gap-1">
                            {post.media.slice(0, 2).map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt="Post media"
                                className="w-10 h-10 object-cover rounded border"
                              />
                            ))}
                            {post.media.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{post.media.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No Image
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewPost(post)}
                            >
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                {post.status !== "published" &&
                                  post.status !== "deleted" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleUpdateStatus(post.id, "published")
                                      }
                                    >
                                      Publish
                                    </DropdownMenuItem>
                                  )}

                                <DropdownMenuSeparator />
                                {post.is_pinned ? (
                                  <DropdownMenuItem
                                    onClick={() => handleUnpinPost(post)}
                                  >
                                    <PinOff className="mr-2 h-4 w-4" /> Unpin
                                    Post
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handlePinPost(post)}
                                  >
                                    <Pin className="mr-2 h-4 w-4" /> Pin Post
                                  </DropdownMenuItem>
                                )}
                                {post.is_highlighted ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleRemoveHighlight(
                                        post.id,
                                        post.highlight_id
                                      )
                                    }
                                  >
                                    <StarOff className="mr-2 h-4 w-4" /> Remove
                                    Highlight
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleHighlightPost(post.id)}
                                  >
                                    <Star className="mr-2 h-4 w-4" /> Highlight
                                    Post
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeletePost(post.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </>
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

        {/* View Post Dialog */}
        <Dialog
          open={isViewPostDialogOpen}
          onOpenChange={setIsViewPostDialogOpen}
        >
          <DialogContent className="w-full max-w-[95vw] sm:max-w-screen-lg">
            <DialogHeader>
              <DialogTitle>View Post</DialogTitle>
              <DialogDescription>
                Details of the selected post.
              </DialogDescription>
            </DialogHeader>
            {selectedPost && (
              <div className="py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left panel: Post details (no poll) */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <span className="col-span-1 text-sm font-medium">Title:</span>
                      <span className="col-span-3">{selectedPost.title}</span>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <span className="col-span-1 text-sm font-medium">Content:</span>
                      <span className="col-span-3">{selectedPost.content}</span>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <span className="col-span-1 text-sm font-medium">Status:</span>
                      <Badge className={`col-span-3 w-fit ${statusColors[selectedPost.status]}`}>
                        {selectedPost.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <span className="col-span-1 text-sm font-medium">Likes:</span>
                      <span className="col-span-3">{selectedPost.likes_count}</span>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <span className="col-span-1 text-sm font-medium">Posted by:</span>
                      <span className="col-span-3">{selectedPost.user?.full_name || selectedPost.user?.display_name}</span>
                    </div>

                    <div className="flex gap-2 mt-2 items-center">
                      {selectedPost.is_pinned && (
                        <Badge variant="secondary">Pinned</Badge>
                      )}
                      {selectedPost.is_highlighted && (
                        <Badge variant="secondary">Highlighted</Badge>
                      )}
                      {isAdmin && (
                        selectedPost.is_pinned ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnpinPost(selectedPost.id)}
                          >
                            <PinOff className="mr-2 h-4 w-4" /> Unpin
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePinPost(selectedPost)}
                          >
                            <Pin className="mr-2 h-4 w-4" /> Pin
                          </Button>
                        )
                      )}
                    </div>

                    {/* Post Versions Table */}
                    {selectedPost.post_versions && selectedPost.post_versions.length > 0 && (
                      <div className="grid gap-2 mt-4">
                        <h3 className="text-lg font-bold">Versions</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedPost.post_versions.map((version) => (
                              <TableRow key={version.id}>
                                <TableCell>{version.id}</TableCell>
                                <TableCell>{version.description.slice(0, 30)}...</TableCell>
                                <TableCell>
                                  <Badge className={statusColors[version.status]}>{version.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {version.status !== "published" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateVersionStatus(selectedPost.id, version.id, "published")}
                                    >
                                      Publish
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Right panel: Poll details */}
                  <div className="space-y-3 md:pl-6 md:border-l border-t md:border-t-0 border-border pt-4 md:pt-0">
                    <h3 className="text-lg font-bold">Poll</h3>
                    {selectedPost.post_poll && selectedPost.post_poll.question ? (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => setShowPollOptions(!showPollOptions)}
                          className="justify-start px-0"
                        >
                          {selectedPost.post_poll.question}
                        </Button>
                        {showPollOptions && (
                          <div className="grid gap-1 pl-4">
                            {selectedPost.post_poll?.poll_options?.length ? (
                              selectedPost.post_poll.poll_options.map((option: { option_txt: string }, index: number) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <Badge>{option.option_txt}</Badge>
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">No options</span>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">No Poll</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {isAdmin && selectedPost && (
              <DialogFooter className="flex flex-row justify-between pt-4">
                <Button
                  variant="destructive"
                  onClick={() => handleDeletePost(selectedPost.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Post
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewPostDialogOpen(false);
                    setIsCreateVersionDialogOpen(true);
                  }}
                >
                  Create New Version
                </Button>
                {selectedPost.status !== "published" &&
                  selectedPost.status !== "deleted" && (
                    <Button
                      onClick={() =>
                        handleUpdateStatus(selectedPost.id, "published")
                      }
                    >
                      Publish Post
                    </Button>
                  )}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* New Version Dialog */}
        <Dialog
          open={isCreateVersionDialogOpen}
          onOpenChange={setIsCreateVersionDialogOpen}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                Create New Version for Post #{selectedPost?.id}
              </DialogTitle>
              <DialogDescription>
                Fill out the form below to create a new version of this post.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateVersion} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="version-description">Description</Label>
                <Textarea
                  id="version-description"
                  value={newVersion.description}
                  onChange={(e) =>
                    setNewVersion({
                      ...newVersion,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter content for the new version..."
                  maxLength={255}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="version-media">Media (Image/Video)</Label>
                <Input
                  id="version-media"
                  type="file"
                  multiple
                  onChange={(e) =>
                    setNewVersion({
                      ...newVersion,
                      media: e.target.files ? Array.from(e.target.files) : [],
                    })
                  }
                />
              </div>
              {isAdmin && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="version-poll-question">
                      Poll Question (Optional)
                    </Label>
                    <Input
                      id="version-poll-question"
                      value={newVersion.pollQuestion}
                      onChange={(e) =>
                        setNewVersion({
                          ...newVersion,
                          pollQuestion: e.target.value,
                        })
                      }
                    />
                  </div>
                  {newVersion.pollQuestion && (
                    <>
                      <div className="grid gap-2">
                        <Label>Poll Options</Label>
                        {newVersion.pollOptions.map((option, index) => (
                          <Input
                            key={index}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...newVersion.pollOptions];
                              newOptions[index] = e.target.value;
                              setNewVersion({
                                ...newVersion,
                                pollOptions: newOptions,
                              });
                            }}
                            placeholder={`Option ${index + 1}`}
                          />
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setNewVersion({
                              ...newVersion,
                              pollOptions: [...newVersion.pollOptions, ""],
                            })
                          }
                        >
                          Add Option
                        </Button>
                      </div>
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="version-poll-open">
                            Poll Open At
                          </Label>
                          <Input
                            id="version-poll-open"
                            type="datetime-local"
                            value={newVersion.pollOpenAt}
                            onChange={(e) =>
                              setNewVersion({
                                ...newVersion,
                                pollOpenAt: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="version-poll-close">
                            Poll Close At
                          </Label>
                          <Input
                            id="version-poll-close"
                            type="datetime-local"
                            value={newVersion.pollCloseAt}
                            onChange={(e) =>
                              setNewVersion({
                                ...newVersion,
                                pollCloseAt: e.target.value,
                              })
                            }
                          />
                        </div>
                        {pollDateError && (
                          <div className="text-red-600 text-sm">
                            {pollDateError}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
              <Button type="submit" disabled={isCreatingVersion}>
                {isCreatingVersion ? "Creating..." : "Create Version"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
