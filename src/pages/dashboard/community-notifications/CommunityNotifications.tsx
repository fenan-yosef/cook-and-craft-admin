import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"
import { Search } from "lucide-react"

interface NotificationItem {
	id: number
	created_at: string
	updated_at?: string
	user_id?: number
	content: string
	seen: boolean
	dismissed: boolean
}

export default function CommunityNotifications() {
	const { toast } = useToast()
	const [items, setItems] = useState<NotificationItem[]>([])
	const [loading, setLoading] = useState<boolean>(true)
	const [search, setSearch] = useState<string>("")
	const [selected, setSelected] = useState<number[]>([])
	const [createOpen, setCreateOpen] = useState<boolean>(false)
	const [newContent, setNewContent] = useState<string>("")
	const [creating, setCreating] = useState<boolean>(false)
	const [marking, setMarking] = useState<boolean>(false)

	useEffect(() => {
		const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
		if (token) apiService.setAuthToken(token)
		fetchNotifications()
	}, [])

	const fetchNotifications = async () => {
		try {
			setLoading(true)
			const res = await apiService.get(`/notifications`)
			const arr = Array.isArray(res?.data) ? res.data : []
			const mapped: NotificationItem[] = arr.map((n: any) => ({
				id: Number(n.id),
				created_at: String(n.created_at ?? n.createdAt ?? ""),
				updated_at: n.updated_at ?? n.updatedAt,
				user_id: n.user_id != null ? Number(n.user_id) : undefined,
				content: String(n.content ?? ""),
				seen: Boolean(n.seen),
				dismissed: Boolean(n.dismissed),
			}))
			setItems(mapped)
		} catch (err: any) {
			toast({ title: "Error", description: err?.message || "Failed to fetch notifications", variant: "destructive" })
		} finally {
			setLoading(false)
		}
	}

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase()
		if (!q) return items
		return items.filter((it) =>
			(it.content || "").toLowerCase().includes(q) || String(it.user_id ?? "").includes(q)
		)
	}, [items, search])

	const toggleSelect = (id: number) => {
		setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
	}

	const clearSelection = () => setSelected([])

	const markSeen = async (ids: number[]) => {
		if (!ids.length) return
		try {
			setMarking(true)
			await apiService.post(`/notifications/seen`, { notification_ids: ids })
			toast({ title: "Updated", description: `Marked ${ids.length} as seen.` })
			// Optimistic local update
			setItems((prev) => prev.map((it) => (ids.includes(it.id) ? { ...it, seen: true } : it)))
			clearSelection()
		} catch (err: any) {
			toast({ title: "Error", description: err?.message || "Failed to mark as seen", variant: "destructive" })
		} finally {
			setMarking(false)
		}
	}

	const markSeenSingle = (id: number) => markSeen([id])

	const dismiss = async (id: number) => {
		try {
			await apiService.delete(`/notifications/${id}/dismiss`)
			toast({ title: "Dismissed", description: "Notification dismissed." })
			setItems((prev) => prev.map((it) => (it.id === id ? { ...it, dismissed: true } : it)))
		} catch (err: any) {
			toast({ title: "Error", description: err?.message || "Failed to dismiss", variant: "destructive" })
		}
	}

	const createNotification = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!newContent.trim()) {
			toast({ title: "Validation", description: "Content is required.", variant: "destructive" })
			return
		}
		try {
			setCreating(true)
			await apiService.post(`/notifications`, {
				content: newContent.trim(),
				seen: false,
				dismissed: false,
			})
			toast({ title: "Created", description: "Notification created." })
			setCreateOpen(false)
			setNewContent("")
			fetchNotifications()
		} catch (err: any) {
			toast({ title: "Error", description: err?.message || "Failed to create notification", variant: "destructive" })
		} finally {
			setCreating(false)
		}
	}

	return (
		<div className="flex flex-col">
			<div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
				<div className="flex items-center justify-between">
					<h2 className="text-3xl font-bold tracking-tight">Community Notifications</h2>
					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={fetchNotifications} disabled={loading}>Refresh</Button>
						<Button onClick={() => setCreateOpen(true)}>New Notification</Button>
					</div>
				</div>

				{/* Summary cards */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">Total</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{items.length}</div>
							<p className="text-xs text-muted-foreground">All notifications</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">Seen</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{items.filter(i => i.seen).length}</div>
							<p className="text-xs text-muted-foreground">Marked as seen</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">Dismissed</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{items.filter(i => i.dismissed).length}</div>
							<p className="text-xs text-muted-foreground">No longer shown</p>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>All Notifications</CardTitle>
						<CardDescription>Manage community notifications</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-2 mb-4">
							<div className="relative flex-1 max-w-sm">
								<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Search by content or user id..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-8"
								/>
							</div>
							<Button
								variant="secondary"
								onClick={() => markSeen(selected)}
								disabled={selected.length === 0 || marking}
							>
								{marking ? "Marking..." : `Mark Seen (${selected.length})`}
							</Button>
							<Button variant="outline" onClick={clearSelection} disabled={selected.length === 0}>Clear</Button>
						</div>

						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-10">Select</TableHead>
									<TableHead>Content</TableHead>
									<TableHead>User</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Created</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{loading ? (
									<TableRow>
										<TableCell colSpan={6} className="text-center">Loading...</TableCell>
									</TableRow>
								) : filtered.length === 0 ? (
									<TableRow>
										<TableCell colSpan={6} className="text-center">No notifications</TableCell>
									</TableRow>
								) : (
									filtered.map((n) => (
										<TableRow key={n.id}>
											<TableCell>
												<input
													type="checkbox"
													checked={selected.includes(n.id)}
													onChange={() => toggleSelect(n.id)}
													aria-label={`Select notification ${n.id}`}
												/>
											</TableCell>
											<TableCell className="max-w-[420px]">
												<div className="font-medium break-words">{n.content}</div>
												{/* <div className="text-xs text-muted-foreground">ID: {n.id}</div> */}
											</TableCell>
											<TableCell>{n.user_id ?? "—"}</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<Badge variant={n.seen ? "default" : "secondary"}>{n.seen ? "Seen" : "Unseen"}</Badge>
													<Badge variant={n.dismissed ? "destructive" : "secondary"}>{n.dismissed ? "Dismissed" : "Active"}</Badge>
												</div>
											</TableCell>
											<TableCell>{n.created_at ? new Date(n.created_at).toLocaleString() : "—"}</TableCell>
											<TableCell className="text-right space-x-2">
												<Button size="sm" variant="outline" onClick={() => markSeenSingle(n.id)} disabled={n.seen}>Mark seen</Button>
												<Button size="sm" variant="destructive" onClick={() => dismiss(n.id)} disabled={n.dismissed}>Dismiss</Button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>

			{/* Create Notification Dialog */}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>New Notification</DialogTitle>
						<DialogDescription>Compose a notification for the community.</DialogDescription>
					</DialogHeader>
					<form onSubmit={createNotification} className="grid gap-4 py-2">
						<div>
							<label htmlFor="notif_content" className="text-sm">Content</label>
							<Input id="notif_content" value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Your notification" />
						</div>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
							<Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create"}</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	)
}

