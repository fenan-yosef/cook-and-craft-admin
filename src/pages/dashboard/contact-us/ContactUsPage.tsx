import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Search, RefreshCw } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { useToast } from "@/hooks/use-toast"

type ContactMessage = {
  id: number
  full_name: string
  reason: string
  description: string
  created_at?: string
}

const mockData: ContactMessage[] = [
  {
    id: 1,
    full_name: "Omar Ahmed Abuelkhier",
    reason: "blablalba",
    description: "blablablablabalbalbalbal",
    created_at: new Date().toISOString(),
  },
]

export default function ContactUsPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [search, setSearch] = useState<string>("")
  const { toast } = useToast()

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) apiService.setAuthToken(token)
      // When backend is ready, replace this with the real endpoint, e.g. /contact_messages
      // For now, fall back to mock data
      // const res = await apiService.get('/contact_messages')
      // const items = Array.isArray(res?.data) ? res.data : []
      const items = mockData
      setMessages(items)
    } catch (e: any) {
      toast({ title: "Using mock data", description: "Failed to fetch from API; showing mock entries." })
      setMessages(mockData)
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
                  <TableHead>Reason</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
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
                      <TableCell className="font-medium">{m.full_name}</TableCell>
                      <TableCell>{m.reason}</TableCell>
                      <TableCell className="max-w-[480px] truncate" title={m.description}>{m.description}</TableCell>
                      <TableCell>{m.created_at ? new Date(m.created_at).toLocaleString() : "—"}</TableCell>
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
