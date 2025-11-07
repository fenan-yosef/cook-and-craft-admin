import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { apiService } from "@/lib/api-service"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type PollOptionDraft = {
  option_txt: string
  link_url: string
  order_num: number
  image: File | null
}

type ApiPoll = {
  id: number
  user_id?: number
  question: string
  title?: string | null
  description?: string | null
  result_mode: "public" | "hidden"
  open_at?: string | null
  close_at?: string | null
  is_open?: number | boolean
  created_at?: string
  updated_at?: string
  poll_options?: Array<{
    id: number
    option_txt: string
    link_url?: string | null
    order_num?: number
    image?: any
  }>
}

export default function PollsPage() {
  const { toast } = useToast()
  const { token } = useAuth()

  const [polls, setPolls] = useState<ApiPoll[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [perPage, setPerPage] = useState(15)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    question: "",
    result_mode: "public" as "public" | "hidden",
    open_at: "",
    close_at: "",
  })
  const [options, setOptions] = useState<PollOptionDraft[]>([
    { option_txt: "", link_url: "", order_num: 1, image: null },
    { option_txt: "", link_url: "", order_num: 2, image: null },
  ])

  useEffect(() => {
    if (token) apiService.setAuthToken(token)
  }, [token])

  const fetchPolls = useCallback(async (page = 1, size = perPage) => {
    try {
      setLoading(true)
      const res: any = await apiService.get(`/polls?page=${page}&per_page=${size}`)
      const pageObj = res?.data ?? res
      const arr: any[] = Array.isArray(pageObj?.data) ? pageObj.data : []
      setPolls(arr as ApiPoll[])
      setCurrentPage(Number(pageObj?.current_page ?? 1))
      setLastPage(Number(pageObj?.last_page ?? 1))
      setTotal(Number(pageObj?.total ?? arr.length ?? 0))
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to fetch polls", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [perPage, toast])

  useEffect(() => {
    fetchPolls(1, perPage)
  }, [fetchPolls, perPage])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return polls
    return polls.filter(p =>
      (p.title || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.question || "").toLowerCase().includes(q)
    )
  }, [polls, search])

  const resetCreate = () => {
    setNewPoll({ title: "", description: "", question: "", result_mode: "public", open_at: "", close_at: "" })
    setOptions([
      { option_txt: "", link_url: "", order_num: 1, image: null },
      { option_txt: "", link_url: "", order_num: 2, image: null },
    ])
  }

  const createPoll = async () => {
    try {
      const errs: string[] = []
      if (!newPoll.question.trim()) errs.push("Question is required")
      if (!newPoll.result_mode) errs.push("Result mode is required")
      const cleanOpts = options.filter(o => o.option_txt.trim())
      if (cleanOpts.length < 2) errs.push("At least two options are required")
      if (errs.length) { toast({ title: "Validation", description: errs.join("; ") }); return }

      setCreating(true)
      const fd = new FormData()
      if (newPoll.title.trim()) fd.append("title", newPoll.title.trim())
      if (newPoll.description.trim()) fd.append("description", newPoll.description.trim())
      fd.append("question", newPoll.question.trim())
      fd.append("result_mode", newPoll.result_mode)
      if (newPoll.open_at) fd.append("open_at", newPoll.open_at)
      if (newPoll.close_at) fd.append("close_at", newPoll.close_at)

      cleanOpts.forEach((opt, i) => {
        fd.append(`poll_options[${i}][option_txt]`, opt.option_txt.trim())
        if (opt.link_url.trim()) fd.append(`poll_options[${i}][link_url]`, opt.link_url.trim())
        if (typeof opt.order_num === 'number') fd.append(`poll_options[${i}][order_num]`, String(opt.order_num))
        if (opt.image) fd.append(`poll_options[${i}][image]`, opt.image)
      })

  await apiService.postMultipart("/polls", fd)
      // optimistic: prepend or refetch
      await fetchPolls(1, perPage)
      setIsCreateOpen(false)
      resetCreate()
      toast({ title: "Success", description: "Poll created" })
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.message || e?.message || "Failed to create poll", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  const deletePoll = async (poll: ApiPoll) => {
    if (!poll?.id) return
    if (!window.confirm(`Delete poll "${poll.title || poll.question}"?`)) return
    try {
      await apiService.delete(`/polls/${poll.id}`)
      setPolls(prev => prev.filter(p => p.id !== poll.id))
      toast({ title: "Deleted", description: "Poll removed" })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to delete poll", variant: "destructive" })
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Polls</h2>
          <Button onClick={() => setIsCreateOpen(true)}>Create Poll</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Polls</CardTitle>
            <CardDescription>Manage polls separate from posts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Input placeholder="Search polls..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setCurrentPage(1); fetchPolls(1, Number(v)) }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Per page" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Open</TableHead>
                  <TableHead>Close</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center">No polls found</TableCell></TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-xs truncate">{p.question}</TableCell>
                      <TableCell className="max-w-xs truncate">{p.title || "—"}</TableCell>
                      <TableCell>{p.result_mode}</TableCell>
                      <TableCell>{p.open_at || "—"}</TableCell>
                      <TableCell>{p.close_at || "—"}</TableCell>
                      <TableCell>{Array.isArray(p.poll_options) ? p.poll_options.length : 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => deletePoll(p)}>Delete</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Page {currentPage} of {lastPage}{total ? ` • ${total} items` : ""}</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={loading || currentPage<=1} onClick={() => { const p = Math.max(1, currentPage-1); setCurrentPage(p); fetchPolls(p, perPage) }}>Previous</Button>
                <Button variant="outline" size="sm" disabled={loading || currentPage>=lastPage} onClick={() => { const p = Math.min(lastPage, currentPage+1); setCurrentPage(p); fetchPolls(p, perPage) }}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetCreate() }}>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Poll</DialogTitle>
              <DialogDescription>Separate polls with title/description and options (images optional)</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-1">
              <div className="grid gap-1">
                <Label>Title (optional)</Label>
                <Input value={newPoll.title} onChange={(e) => setNewPoll(s => ({ ...s, title: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <Label>Description (optional)</Label>
                <Input value={newPoll.description} onChange={(e) => setNewPoll(s => ({ ...s, description: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <Label>Question</Label>
                <Input value={newPoll.question} onChange={(e) => setNewPoll(s => ({ ...s, question: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label>Result mode</Label>
                  <Select value={newPoll.result_mode} onValueChange={(v) => setNewPoll(s => ({ ...s, result_mode: v as any }))}>
                    <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">public</SelectItem>
                      <SelectItem value="hidden">hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1" />
                <div className="grid gap-1">
                  <Label>Open at (ISO)</Label>
                  <Input type="datetime-local" value={newPoll.open_at} onChange={(e) => setNewPoll(s => ({ ...s, open_at: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label>Close at (ISO)</Label>
                  <Input type="datetime-local" value={newPoll.close_at} onChange={(e) => setNewPoll(s => ({ ...s, close_at: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Options</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setOptions(prev => [...prev, { option_txt: "", link_url: "", order_num: prev.length+1, image: null }])}>Add</Button>
                </div>
                <div className="grid gap-3">
                  {options.map((op, i) => (
                    <div key={i} className="rounded border p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Option text" value={op.option_txt} onChange={(e) => setOptions(arr => { const n = arr.slice(); n[i] = { ...n[i], option_txt: e.target.value }; return n })} />
                        <Input placeholder="Link URL (optional)" value={op.link_url} onChange={(e) => setOptions(arr => { const n = arr.slice(); n[i] = { ...n[i], link_url: e.target.value }; return n })} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <Input type="number" placeholder="Order" value={op.order_num} onChange={(e) => setOptions(arr => { const n = arr.slice(); n[i] = { ...n[i], order_num: Number(e.target.value || 0) }; return n })} />
                        <Input type="file" accept="image/*" onChange={(e) => { const file = (e.target.files && e.target.files[0]) || null; setOptions(arr => { const n = arr.slice(); n[i] = { ...n[i], image: file }; return n }) }} />
                      </div>
                      <div className="flex justify-end">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setOptions(prev => prev.filter((_, idx) => idx !== i))}>Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">We will send poll_options[i] with optional image file.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={creating}>Cancel</Button>
              <Button onClick={createPoll} disabled={creating}>{creating ? "Saving..." : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
