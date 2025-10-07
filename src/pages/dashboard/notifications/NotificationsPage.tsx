import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

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
  const [recipients, setRecipients] = useState<string>("")
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
    if (channel === "email" && !subject.trim()) return false
    return true
  }, [channel, message, subject])

  const examplePlaceholder = useMemo(() => {
    if (channel === "whatsapp") return "+9665..., +9665..., ..."
    if (channel === "email") return "user@example.com, second@example.com, ..."
    return "userId1, userId2, ... (optional)"
  }, [channel])

  const handleSend = async () => {
    try {
      setSending(true)
      // Mock a small delay
      await new Promise(r => setTimeout(r, 800))

      // Prepare mock payload
      const payload: any = {
        channel,
        audience,
        recipients: recipients
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        subject: channel === 'email' ? subject : undefined,
        message,
      }

      console.log("[NotificationsPage] mock send:", payload)
      toast({
        title: "Sent",
        description: `Your ${channelLabel} was queued (mock).`,
      })
      // Reset minimal fields
      setMessage("")
      if (channel === 'email') setSubject("")
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to send (mock)", variant: "destructive" })
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
                  <Input
                    value={recipients}
                    onChange={e => setRecipients(e.target.value)}
                    placeholder={examplePlaceholder}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Comma separated: {channel === 'whatsapp' ? 'phone numbers' : channel === 'email' ? 'email addresses' : 'user IDs'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {channel === 'email' && (
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
