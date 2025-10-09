import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

// Backend-integrated model for wallet conversion rules
type WalletConversionRule = {
  id: number
  from_type_id: number
  to_type_id: number
  rate_numerator: number
  rate_denominator: number
  is_active: boolean
  // Optional labels if API provides nested objects; used for nicer display when available
  from_type_name?: string
  to_type_name?: string
}

export default function ConversionRulesPage() {
  const { toast } = useToast()

  // Data state
  const [rules, setRules] = useState<WalletConversionRule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")

  // Add/Edit dialog state
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<WalletConversionRule | null>(null)

  // Form state (shared by add/edit)
  const [form, setForm] = useState({
    from_type_id: "",
    to_type_id: "",
    rate_numerator: "1",
    rate_denominator: "1",
    is_active: true,
  })

  // Calculator state
  const [simulateAmount, setSimulateAmount] = useState<string>("")
  const [selectedRuleId, setSelectedRuleId] = useState<string>("")

  // Helpers
  const toNumber = (v: any, fallback = 0) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }

  const loadRules = async () => {
    setLoading(true)
    setError("")
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) apiService.setAuthToken(token)
      const res = await apiService.get("/admins/wallets/rules")
      const top: any = res ?? {}
      const arr: any[] = Array.isArray(top?.data) ? top.data : Array.isArray(top) ? top : []
      const mapped: WalletConversionRule[] = arr.map((it: any) => ({
        id: toNumber(it.id),
        from_type_id: toNumber(it.from_type_id ?? it.fromTypeId ?? it.from_type?.id),
        to_type_id: toNumber(it.to_type_id ?? it.toTypeId ?? it.to_type?.id),
        rate_numerator: toNumber(it.rate_numerator ?? it.rateNumerator ?? 1, 1),
        rate_denominator: toNumber(it.rate_denominator ?? it.rateDenominator ?? 1, 1),
        is_active: Boolean(it.is_active ?? it.isActive ?? true),
        from_type_name: it.from_type?.name ?? it.fromType?.name ?? it.from_type_name,
        to_type_name: it.to_type?.name ?? it.toType?.name ?? it.to_type_name,
      }))
      setRules(mapped)
    } catch (e: any) {
      setError(e?.message || "Failed to load conversion rules.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRules()
  }, [])

  // Handlers
  const openAdd = () => {
    setForm({ from_type_id: "", to_type_id: "", rate_numerator: "1", rate_denominator: "1", is_active: true })
    setAddOpen(true)
  }
  const openEdit = (rule: WalletConversionRule) => {
    setEditingRule(rule)
    setForm({
      from_type_id: String(rule.from_type_id || ""),
      to_type_id: String(rule.to_type_id || ""),
      rate_numerator: String(rule.rate_numerator || "1"),
      rate_denominator: String(rule.rate_denominator || "1"),
      is_active: !!rule.is_active,
    })
    setEditOpen(true)
  }

  const submitAdd = async () => {
    try {
      const payload = {
        from_type_id: String(form.from_type_id || ""),
        to_type_id: String(form.to_type_id || ""),
        rate_numerator: String(form.rate_numerator || "1"),
        rate_denominator: String(form.rate_denominator || "1"),
        is_active: form.is_active ? "1" : "0",
      }
      await apiService.postFormData("/wallet-conversion-rules", payload)
      toast({ title: "Rule added", description: "Conversion rule created successfully." })
      setAddOpen(false)
      await loadRules()
    } catch (e: any) {
      toast({ title: "Failed to add", description: e?.message || "Unable to create conversion rule.", variant: "destructive" })
    }
  }

  const submitEdit = async () => {
    if (!editingRule) return
    try {
      const payload = {
        from_type_id: String(form.from_type_id || ""),
        to_type_id: String(form.to_type_id || ""),
        rate_numerator: String(form.rate_numerator || "1"),
        rate_denominator: String(form.rate_denominator || "1"),
        is_active: form.is_active ? "1" : "0",
      }
      await apiService.patchFormData(`/wallet-conversion-rules/${editingRule.id}`, payload)
      toast({ title: "Rule updated", description: "Conversion rule saved successfully." })
      setEditOpen(false)
      setEditingRule(null)
      await loadRules()
    } catch (e: any) {
      toast({ title: "Failed to update", description: e?.message || "Unable to update conversion rule.", variant: "destructive" })
    }
  }

  // Calculator derived values
  const selectedRule = useMemo(() => rules.find(r => String(r.id) === selectedRuleId) || null, [rules, selectedRuleId])
  const simulation = useMemo(() => {
    const amount = Number(simulateAmount) || 0
    const r = selectedRule
    const warnings: string[] = []
    if (!r) return { result: 0, warnings: ["Select a rule to simulate."] }
    if (!r.is_active) warnings.push("This rule is inactive.")
    const denom = Number(r.rate_denominator) || 0
    const numer = Number(r.rate_numerator) || 0
    if (denom === 0) {
      warnings.push("Denominator is 0; cannot compute.")
      return { result: 0, warnings }
    }
    const result = (amount * numer) / denom
    return { result, warnings }
  }, [simulateAmount, selectedRule])

  // UI
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Conversion Rules</h1>
        <Button onClick={openAdd}>Add Rule</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Rules</CardTitle>
          <CardDescription>Define how to convert from one wallet type to another.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-600">{error}</div>
          )}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm py-10">Loading...</TableCell>
                  </TableRow>
                )}
                {!loading && rules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm py-10">No rules found.</TableCell>
                  </TableRow>
                )}
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.from_type_name ? (
                        <span>{r.from_type_name} <span className="text-xs text-muted-foreground">(#{r.from_type_id})</span></span>
                      ) : (
                        <span>Type #{r.from_type_id}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.to_type_name ? (
                        <span>{r.to_type_name} <span className="text-xs text-muted-foreground">(#{r.to_type_id})</span></span>
                      ) : (
                        <span>Type #{r.to_type_id}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{r.rate_numerator} : {r.rate_denominator}</span>
                    </TableCell>
                    <TableCell>
                      {r.is_active ? (
                        <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Active</span>
                      ) : (
                        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Inactive</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversion Calculator</CardTitle>
          <CardDescription>Select a rule and enter the amount to convert.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Rule</Label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={selectedRuleId}
              onChange={(e) => setSelectedRuleId(e.target.value)}
            >
              <option value="">Select rule…</option>
              {rules.map(r => (
                <option key={r.id} value={r.id}>
                  {r.from_type_name || `Type #${r.from_type_id}`} → {r.to_type_name || `Type #${r.to_type_id}`} @ {r.rate_numerator}:{r.rate_denominator} {r.is_active ? "" : "(inactive)"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Amount in source wallet</Label>
            <Input type="number" placeholder="e.g. 100" value={simulateAmount} onChange={(e) => setSimulateAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Result</Label>
            <div className="text-sm">{simulation.result.toFixed(2)}</div>
            {simulation.warnings.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-xs text-amber-600">
                {simulation.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Formula: result = amount × numerator ÷ denominator
        </CardFooter>
      </Card>

      {/* Add Rule Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Conversion Rule</DialogTitle>
            <DialogDescription>Define from/to wallet type IDs and the conversion ratio.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From Type ID</Label>
                <Input value={form.from_type_id} onChange={(e) => setForm(f => ({ ...f, from_type_id: e.target.value }))} placeholder="e.g. 2 (Points)" />
              </div>
              <div className="space-y-1.5">
                <Label>To Type ID</Label>
                <Input value={form.to_type_id} onChange={(e) => setForm(f => ({ ...f, to_type_id: e.target.value }))} placeholder="e.g. 1 (Cash)" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rate Numerator</Label>
                <Input type="number" value={form.rate_numerator} onChange={(e) => setForm(f => ({ ...f, rate_numerator: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Rate Denominator</Label>
                <Input type="number" value={form.rate_denominator} onChange={(e) => setForm(f => ({ ...f, rate_denominator: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingRule(null) }}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Conversion Rule</DialogTitle>
            <DialogDescription>Update the conversion details for this rule.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From Type ID</Label>
                <Input value={form.from_type_id} onChange={(e) => setForm(f => ({ ...f, from_type_id: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>To Type ID</Label>
                <Input value={form.to_type_id} onChange={(e) => setForm(f => ({ ...f, to_type_id: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rate Numerator</Label>
                <Input type="number" value={form.rate_numerator} onChange={(e) => setForm(f => ({ ...f, rate_numerator: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Rate Denominator</Label>
                <Input type="number" value={form.rate_denominator} onChange={(e) => setForm(f => ({ ...f, rate_denominator: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditingRule(null) }}>Cancel</Button>
            <Button onClick={submitEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="text-xs text-muted-foreground">
        Uses real API: GET /admins/wallets/rules, POST /wallet-conversion-rules, PATCH /wallet-conversion-rules/:id. Wallet type names are shown when provided by the API; otherwise IDs are displayed.
      </div>
    </div>
  )
}
