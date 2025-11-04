import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Search, RefreshCw } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

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
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [lastPage, setLastPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(15)
  const [total, setTotal] = useState<number>(0)

  const fetchMessages = async (page: number = 1, size: number = perPage) => {
    try {
      setLoading(true)
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) apiService.setAuthToken(token)
      // Use common paging aliases (omit per_page if backend rejects it); rely on response meta
      const res = await apiService.get(`/contact-us-messages?page=${page}&perPage=${size}&limit=${size}&page_size=${size}&pageSize=${size}`)
      // For this API, the body is an object with shape: { data: [], current_page, last_page, per_page, total, ... }
      const body = res as any
      const items: ContactMessage[] = Array.isArray(body?.data)
        ? (body.data as ContactMessage[])
        : Array.isArray(body)
          ? (body as ContactMessage[])
          : []
      setMessages(items)
      const cp = Number(body?.current_page ?? page) || 1
      let lp = Number(body?.last_page)
      const pp = Number(body?.per_page ?? size) || size
      const tt = Number(body?.total ?? items.length) || items.length
      if (!lp || !Number.isFinite(lp)) {
        lp = pp > 0 ? Math.ceil(tt / pp) : 1
      }
      setCurrentPage(cp)
      setLastPage(lp)
      setPerPage(pp)
      setTotal(tt)
    } catch (e: any) {
      // Fallback 1: try minimal query using only page & limit
      try {
        const res2 = await apiService.get(`/contact-us-messages?page=${page}&limit=${size}`)
        const body2 = res2 as any
        const items2: ContactMessage[] = Array.isArray(body2?.data)
          ? (body2.data as ContactMessage[])
          : Array.isArray(body2)
            ? (body2 as ContactMessage[])
            : []
        setMessages(items2)
        const cp = Number(body2?.current_page ?? page) || 1
        let lp = Number(body2?.last_page)
        const pp = Number(body2?.per_page ?? size) || size
        const tt = Number(body2?.total ?? items2.length) || items2.length
        if (!lp || !Number.isFinite(lp)) {
          lp = pp > 0 ? Math.ceil(tt / pp) : 1
        }
        setCurrentPage(cp)
        setLastPage(lp)
        setPerPage(pp)
        setTotal(tt)
        return
      } catch (e2: any) {
        // Fallback 2: if server complains about per_page, try a conservative default of 10
        const serverErr = (e2?.response?.data?.error || e?.response?.data?.error) as any
        if (serverErr && (serverErr.per_page || serverErr["per page"])) {
          try {
            const res3 = await apiService.get(`/contact-us-messages?page=${page}&limit=10`)
            const body3 = res3 as any
            const items3: ContactMessage[] = Array.isArray(body3?.data)
              ? (body3.data as ContactMessage[])
              : Array.isArray(body3)
                ? (body3 as ContactMessage[])
                : []
            setMessages(items3)
            const cp = Number(body3?.current_page ?? page) || 1
            let lp = Number(body3?.last_page)
            const tt = Number(body3?.total ?? items3.length) || items3.length
            if (!lp || !Number.isFinite(lp)) {
              const pp = 10
              lp = pp > 0 ? Math.ceil(tt / pp) : 1
            }
            setCurrentPage(cp)
            setLastPage(lp)
            setPerPage(10)
            setTotal(tt)
            return
          } catch (e3: any) {
            const desc3 = e3?.message || 'Failed to fetch contact messages.'
            toast({ title: "Error", description: desc3, variant: 'destructive' })
            setMessages([])
          }
        } else {
          const desc2 = e2?.message || 'Failed to fetch contact messages.'
          toast({ title: "Error", description: desc2, variant: 'destructive' })
          setMessages([])
        }
      }
      // keep pagination state as-is on error if all fallbacks fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages(1, perPage)
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
          <Button variant="outline" onClick={() => fetchMessages(currentPage, perPage)} disabled={loading}>
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
              <Select
                value={String(perPage)}
                onValueChange={(val) => {
                  const n = Number(val)
                  setPerPage(n)
                  // Reset to first page when per-page changes
                  fetchMessages(1, n)
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15 (default)</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
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
                    <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No messages found</TableCell>
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

        {/* Pagination */}
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage > 1 && !loading) fetchMessages(currentPage - 1, perPage)
                  }}
                />
              </PaginationItem>
              {(() => {
                const pages: number[] = []
                const maxToShow = 5
                let start = Math.max(1, currentPage - Math.floor(maxToShow / 2))
                let end = Math.min(lastPage, start + maxToShow - 1)
                start = Math.max(1, Math.min(start, Math.max(1, end - maxToShow + 1)))
                for (let p = start; p <= end; p++) pages.push(p)
                return (
                  <>
                    {start > 1 && (
                      <>
                        <PaginationItem>
                          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); fetchMessages(1, perPage) }}>1</PaginationLink>
                        </PaginationItem>
                        {start > 2 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                      </>
                    )}
                    {pages.map((p) => (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === currentPage}
                          onClick={(e) => { e.preventDefault(); if (p !== currentPage) fetchMessages(p, perPage) }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    {end < lastPage && (
                      <>
                        {end < lastPage - 1 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); fetchMessages(lastPage, perPage) }}>{lastPage}</PaginationLink>
                        </PaginationItem>
                      </>
                    )}
                  </>
                )
              })()}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage < lastPage && !loading) fetchMessages(currentPage + 1, perPage)
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <div className="mt-2 text-xs text-muted-foreground text-center">
            Page {currentPage} of {lastPage} • Showing {messages.length} of {total} items
          </div>
        </div>

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
