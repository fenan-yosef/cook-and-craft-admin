import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"

// Mock audience presets (for demo only)
const AUDIENCE_PRESETS = [
  { id: "all", label: "All Users" },
  { id: "active", label: "Active Users" },
  { id: "inactive", label: "Inactive Users" },
  { id: "drivers", label: "Drivers" },
  { id: "admins", label: "Admins" },
]

type Channel = "push" | "whatsapp" | "email"

export default function NotificationsPage() {
  const { toast } = useToast()

  const [channel, setChannel] = useState<Channel>("push")
  const [audience, setAudience] = useState<string>("all")
  // recipients as objects so we can keep user IDs when available
  const [recipients, setRecipients] = useState<Array<{ id?: number; label: string; email?: string }>>([])
  const [recipientInput, setRecipientInput] = useState<string>("")
  const [suggestions, setSuggestions] = useState<Array<{ id: number; label: string; email?: string }>>([])
  const [subject, setSubject] = useState<string>("")
  const [message, setMessage] = useState<string>("")
  const [sending, setSending] = useState(false)

  const channelLabel = useMemo(() => {
    switch (channel) {
      case "push": return "Push Notification"
      case "whatsapp": return "WhatsApp"
      case "email": return "Email"
    }
  }, [channel])

  const canSend = useMemo(() => {
    if (!message.trim()) return false
    // Title/subject is required for email and push according to API
    if ((channel === "email" || channel === "push") && !subject.trim()) return false
    return true
  }, [channel, message, subject])

  const examplePlaceholder = useMemo(() => {
    if (channel === "whatsapp") return "+9665..., +9665..., ..."
    if (channel === "email") return "user@example.com, second@example.com, ..."
    return "search by email or username... (optional)"
  }, [channel])

  // Debounced user search for recipient suggestions
  useEffect(() => {
    if (!recipientInput || recipientInput.trim().length < 2) {
      setSuggestions([])
      return
    }
    const id = setTimeout(async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        if (token) apiService.setAuthToken(token)
        const q = encodeURIComponent(recipientInput.trim())
        const res = await apiService.get(`/admins/users?search=${q}`)
        const items = Array.isArray(res?.data) ? res.data : []
        const mapped = items.map((u: any) => ({ id: Number(u.userId ?? u.id ?? 0), label: (u.userFirstName && u.userLastName) ? `${u.userFirstName} ${u.userLastName}` : (u.userEmail || u.userName || u.name || String(u.userId || u.id || '')), email: u.userEmail || u.email }))
        setSuggestions(mapped)
      } catch (e) {
        setSuggestions([])
      }
    }, 300)
    return () => clearTimeout(id)
  }, [recipientInput])

  const mapAudienceToType = (v: string) => {
    // Map our UI presets to API audience_type values
    switch (v) {
      case 'drivers': return 'driver'
      case 'admins': return 'staff'
      case 'active':
      case 'inactive':
      case 'all':
      default: return v === 'all' ? 'all' : 'customer'
    }
  }

  const handleSend = async () => {
    try {
      setSending(true)

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (token) apiService.setAuthToken(token)

      const audience_type = mapAudienceToType(audience)
      const specific_user_ids = recipients.filter(r => typeof r.id === 'number').map(r => Number(r.id))

      const payload: any = {
        type: channel, // email / whatsapp / push
        title: (channel === 'email' || channel === 'push') ? subject || undefined : undefined,
        content: message,
        audience_type,
      }

      if (specific_user_ids.length > 0) payload.specific_user_ids = specific_user_ids

      await apiService.post('/notifications', payload)

      toast({ title: 'Sent', description: `Your ${channelLabel} was queued.` })

      // Reset minimal fields
      setMessage("")
      if (channel === 'email') setSubject("")
      setRecipients([])
      setRecipientInput("")
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to send', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Send Notifications</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New Notification</CardTitle>
            <CardDescription>Draft and send a notification via Push, WhatsApp, or Email.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label>Channel</Label>
                  <Select value={channel} onValueChange={(v: Channel) => setChannel(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="push">Push Notification</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Audience</Label>
                  <Select value={audience} onValueChange={(v) => setAudience(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCE_PRESETS.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">Use presets or specify recipients below to target specific users.</p>
                </div>

                <div>
                  <Label>Recipients (optional)</Label>
                  <div className="mt-1">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {recipients.map((r, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-sm">
                          <span className="mr-2">{r.label}</span>
                          <button type="button" onClick={() => setRecipients(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground">×</button>
                        </span>
                      ))}
                    </div>
                    <Input
                      value={recipientInput}
                      onChange={e => setRecipientInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault()
                          const v = recipientInput.trim()
                          if (v) {
                            setRecipients(prev => {
                              const exists = prev.some(p => p.label === v)
                              if (exists) return prev
                              return [...prev, { label: v }]
                            })
                            setRecipientInput('')
                            setSuggestions([])
                          }
                        }
                        if (e.key === 'Backspace' && recipientInput === '') {
                          // remove last
                          setRecipients(prev => prev.slice(0, -1))
                        }
                      }}
                      placeholder={examplePlaceholder}
                    />
                    {suggestions.length > 0 && (
                      <div className="mt-1 border rounded bg-white shadow-sm max-h-40 overflow-auto">
                        {suggestions.map(s => (
                          <div key={s.id} className="p-2 hover:bg-slate-50 cursor-pointer" onMouseDown={(e) => { e.preventDefault(); setRecipients(prev => {
                              const label = s.email || s.label
                              if (prev.some(p => p.label === label)) return prev
                              return [...prev, { id: s.id, label, email: s.email }]
                            }); setRecipientInput(''); setSuggestions([]) }}>
                            <div className="text-sm">{s.label}</div>
                            {s.email && <div className="text-xs text-muted-foreground">{s.email}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Search and add users by email or username. Press Enter or comma to add typed value.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {(channel === 'email' || channel === 'push') && (
                  <div>
                    <Label>Subject</Label>
                    <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" />
                  </div>
                )}
                <div>
                  <Label>Message</Label>
                  <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={`Your ${channelLabel?.toLowerCase() || 'message'}...`} rows={8} />
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleSend} disabled={!canSend || sending}>
                    {sending ? 'Sending…' : 'Send'}
                  </Button>
                  <Badge variant="secondary" className="ml-2">Mock</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
