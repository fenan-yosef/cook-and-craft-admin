import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Search, RefreshCw } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type ContactMessage = {
  id: number
  full_name: string
  email: string
  phone: string
  reason: string
  description: string
  created_at?: string
}

export default function ContactUsPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [search, setSearch] = useState<string>("")
  const { toast } = useToast()
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selected, setSelected] = useState<ContactMessage | null>(null)

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) apiService.setAuthToken(token)
      const res = await apiService.get('/contact-us-messages')
      const items = Array.isArray(res?.data) ? res.data : []
      setMessages(items as ContactMessage[])
    } catch (e: any) {
      const desc = e?.message || 'Failed to fetch contact messages.'
      toast({ title: "Error", description: desc, variant: 'destructive' })
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return messages.filter((m) =>
      m.full_name.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term) ||
      m.phone.toLowerCase().includes(term) ||
      m.reason.toLowerCase().includes(term) ||
      m.description.toLowerCase().includes(term)
    )
  }, [messages, search])

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Contact Us Messages</h2>
          <Button variant="outline" onClick={fetchMessages} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Messages</CardTitle>
            <CardDescription>Review incoming contact requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, reason, or text..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Description</TableHead>
                  {/* <TableHead>Created</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No messages found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium cursor-pointer" onClick={()=>{ setSelected(m); setIsViewOpen(true); }}>{m.full_name}</TableCell>
                      <TableCell className="cursor-pointer" onClick={()=>{ setSelected(m); setIsViewOpen(true); }}>{m.email}</TableCell>
                      <TableCell className="cursor-pointer" onClick={()=>{ setSelected(m); setIsViewOpen(true); }}>{m.phone}</TableCell>
                      <TableCell className="cursor-pointer" onClick={()=>{ setSelected(m); setIsViewOpen(true); }}>{m.reason}</TableCell>
                      <TableCell className="max-w-[480px] truncate cursor-pointer" title={m.description} onClick={()=>{ setSelected(m); setIsViewOpen(true); }}>{m.description}</TableCell>
                      {/* <TableCell className="cursor-pointer" onClick={()=>{ setSelected(m); setIsViewOpen(true); }}>{m.created_at ? new Date(m.created_at).toLocaleString() : "—"}</TableCell> */}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Message Modal */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Contact Message</DialogTitle>
              <DialogDescription>Details of the selected message</DialogDescription>
            </DialogHeader>
            {selected ? (
              <div className="space-y-3 text-sm">
                {/* <div><span className="text-muted-foreground">ID:</span> {selected.id}</div> */}
                <div><span className="text-muted-foreground">Full Name:</span> {selected.full_name}</div>
                <div><span className="text-muted-foreground">Email:</span> {selected.email}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selected.phone}</div>
                <div><span className="text-muted-foreground">Reason:</span> {selected.reason}</div>
                <div>
                  <span className="text-muted-foreground">Description:</span>
                  <div className="mt-2 max-h-[420px] overflow-auto rounded border bg-muted/30 p-3 whitespace-pre-wrap break-words leading-relaxed">
                    {selected.description}
                  </div>
                </div>
                {/* <div><span className="text-muted-foreground">Created:</span> {selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</div> */}
              </div>
            ) : (
              <div className="py-4">No message selected.</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
