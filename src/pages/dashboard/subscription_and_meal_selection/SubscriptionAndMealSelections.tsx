import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Edit, Trash2 } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

type AddonSelection = { addon_id: number; quantity: number; addon_name?: string }
type MealSelection = { meal_id: number; meal_name?: string; qty: number; addons?: AddonSelection[] }

interface SubMealSelectionRow {
  id?: number
  subscriptionId: number
  subscriptionName?: string
  intervalId: number
  intervalName?: string
  selections: MealSelection[]
}

export default function SubscriptionAndMealSelectionsPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<SubMealSelectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  // Option dropdown data
  const [subscriptionOptions, setSubscriptionOptions] = useState<Array<{ id: number; name: string }>>([])
  const [intervalOptions, setIntervalOptions] = useState<Array<{ id: number; title: string }>>([])
  const [mealOptions, setMealOptions] = useState<Array<{ id: number; name: string }>>([])
  const [optionsLoading, setOptionsLoading] = useState({ subs: false, intervals: false, meals: false })
  const [addonsByMealId, setAddonsByMealId] = useState<Record<number, Array<{ id: number; name: string }>>>({})
  const [addonsLoadingByMealId, setAddonsLoadingByMealId] = useState<Record<number, boolean>>({})
  // Modal state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [form, setForm] = useState({
    subscriptionId: "",
    subscriptionName: "",
    intervalId: "",
    intervalName: "",
    selections: [
      {
        meal_id: "",
        meal_name: "",
        qty: "",
        addons: [{ addon_id: "", quantity: "1" }],
      },
    ] as Array<{ meal_id: string; meal_name: string; qty: string; addons: Array<{ addon_id: string; quantity: string }> }>,
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Simple mock meal catalog for name lookup when only meal_id is present
  const mealCatalog: Record<number, string> = {
    1: "Grilled Chicken Bowl",
    2: "Beef Stir Fry",
    3: "Tuna Salad",
    4: "Pasta Primavera",
    5: "Veggie Burrito",
    6: "Mushroom Risotto",
    7: "Tofu Teriyaki",
  }

  useEffect(() => {
    // Ensure apiService includes Authorization header on this page
    const token = typeof window !== "undefined" ? window.localStorage.getItem("auth_token") : null
    if (token) {
      apiService.setAuthToken(token)
    }
    fetchRows()
    fetchSubscriptionOptions()
    fetchIntervalOptions()
    fetchMealOptions()
  }, [])

  const extractFirstObject = (payload: any): any | null => {
    const candidates = [
      payload?.data?.data,
      payload?.data,
      payload,
    ]

    for (const c of candidates) {
      if (!c) continue
      if (Array.isArray(c) && c.length > 0) return c[0]
      if (typeof c === 'object') return c
    }
    return null
  }

  const getAllowedAddonsForMeal = async (mealId: number): Promise<Array<{ id: number; name: string }>> => {
    if (!mealId) return []
    // Already loaded
    if (addonsByMealId[mealId]) return addonsByMealId[mealId]
    // In-flight
    if (addonsLoadingByMealId[mealId]) return []

    setAddonsLoadingByMealId(prev => ({ ...prev, [mealId]: true }))
    try {
      const res: any = await apiService.get(`/meals/${mealId}`)
      const obj = extractFirstObject(res)
      const addonsRaw = obj?.Addons ?? obj?.addons ?? obj?.add_ons ?? obj?.AddOns ?? []

      const mapped = (Array.isArray(addonsRaw) ? addonsRaw : [])
        .map((a: any) => {
          const addonObj = a?.addon ?? a?.Addon ?? a?.add_on ?? a
          const id = Number(addonObj?.id ?? addonObj?.ID ?? a?.addon_id ?? a?.addonId ?? a?.id ?? 0)
          const name = addonObj?.name ?? addonObj?.Name ?? a?.addon_name ?? a?.name ?? `Addon #${id}`
          const activeRaw = addonObj?.is_active ?? addonObj?.IsActive ?? addonObj?.active ?? addonObj?.isAddonActive
          const isActive = typeof activeRaw === 'number' ? activeRaw === 1 : (typeof activeRaw === 'boolean' ? activeRaw : true)
          if (!id || !isActive) return null
          return { id, name }
        })
        .filter(Boolean) as Array<{ id: number; name: string }>

      // Unique by id
      const uniq = Array.from(new Map(mapped.map(a => [a.id, a])).values())
      setAddonsByMealId(prev => ({ ...prev, [mealId]: uniq }))
      return uniq
    } catch {
      setAddonsByMealId(prev => ({ ...prev, [mealId]: [] }))
      return []
    } finally {
      setAddonsLoadingByMealId(prev => ({ ...prev, [mealId]: false }))
    }
  }

  const buildSubscriptionLabel = (s: any): string => {
    const id = s?.id ?? s?.ID
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const dti = s?.delivery_time_id || s?.deliveryTime || s?.delivery_time || {}
    const dayNumRaw = dti?.day?.day_of_week ?? dti?.day_of_week ?? dti?.dayOfWeek
    let dayName: string | undefined
    if (typeof dayNumRaw === 'number') {
      const idx = (dayNumRaw % 7)
      dayName = idx === 0 ? 'Sunday' : dayNames[idx]
    }
    const start: string | undefined = dti?.start_time || dti?.startTime
    const end: string | undefined = dti?.end_time || dti?.endTime
    const timePart = start && end ? `${start.slice(0,5)}–${end.slice(0,5)}` : undefined
    return `#${id}${dayName ? ' - ' + dayName : ''}${timePart ? ' ' + timePart : ''}`
  }

  const extractArray = (payload: any): any[] => {
    const candidates = [payload, payload?.data, payload?.data?.data, payload?.result, payload?.results, payload?.list, payload?.items]
    for (const c of candidates) {
      if (!c) continue
      if (Array.isArray(c)) return c
      if (Array.isArray(c?.data)) return c.data
    }
    return []
  }

  // Modal helpers
  const resetForm = () => {
    setForm({
      subscriptionId: "",
      subscriptionName: "",
      intervalId: "",
      intervalName: "",
      selections: [{ meal_id: "", meal_name: "", qty: "", addons: [{ addon_id: "", quantity: "1" }] }],
    })
    setEditingIndex(null)
  }

  const openAddModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (row: SubMealSelectionRow, index: number) => {
    setEditingIndex(index)
    setForm({
      subscriptionId: String(row.subscriptionId ?? ""),
      subscriptionName: row.subscriptionName ?? "",
      intervalId: String(row.intervalId ?? ""),
      intervalName: row.intervalName ?? "",
      selections: (row.selections ?? []).map((s) => ({
        meal_id: String(s.meal_id ?? ""),
        meal_name: s.meal_name ?? mealCatalog[s.meal_id] ?? "",
        qty: String(s.qty ?? ""),
        addons:
          Array.isArray(s.addons) && s.addons.length > 0
            ? s.addons.map((a) => ({
                addon_id: String(a.addon_id ?? ""),
                quantity: String(a.quantity ?? ""),
              }))
            : [{ addon_id: "", quantity: "1" }],
      })),
    })
    setIsModalOpen(true)
  }

  const addSelectionItem = () => {
    setForm((prev) => ({
      ...prev,
      selections: [...prev.selections, { meal_id: "", meal_name: "", qty: "", addons: [{ addon_id: "", quantity: "1" }] }],
    }))
  }

  const removeSelectionItem = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      selections: prev.selections.filter((_, i) => i !== idx),
    }))
  }

  const updateSelectionField = (idx: number, key: "meal_id" | "meal_name" | "qty", value: string) => {
    setForm((prev) => {
      const next = [...prev.selections]
      // Keep numbers as strings in form state; convert on submit
      ;(next[idx] as any)[key] = value
      return { ...prev, selections: next }
    })

    // When meal changes, refresh allowed addons list and reset addon selection if needed.
    if (key === "meal_id") {
      const mealId = Number(value || 0)
      if (mealId) {
        void (async () => {
          const allowed = await getAllowedAddonsForMeal(mealId)
          setForm((prev) => {
            const nextSelections = [...prev.selections]
            const sel = { ...nextSelections[idx] }
            const currentAddonId = Number(sel?.addons?.[0]?.addon_id || 0)
            const allowedIds = new Set(allowed.map(a => a.id))
            const nextAddonId = allowed.length > 0 ? String(allowed[0].id) : ""

            if (!currentAddonId || !allowedIds.has(currentAddonId)) {
              sel.addons = [{ addon_id: nextAddonId, quantity: sel?.addons?.[0]?.quantity ?? "1" }]
              nextSelections[idx] = sel as any
              return { ...prev, selections: nextSelections }
            }
            return prev
          })
        })()
      }
    }
  }

  const updateAddonField = (selectionIdx: number, addonIdx: number, key: "addon_id" | "quantity", value: string) => {
    setForm((prev) => {
      const nextSelections = [...prev.selections]
      const sel = { ...nextSelections[selectionIdx] }
      const nextAddons = [...(sel.addons ?? [])]
      const nextAddon = { ...(nextAddons[addonIdx] ?? { addon_id: "", quantity: "1" }) }
      ;(nextAddon as any)[key] = value
      nextAddons[addonIdx] = nextAddon
      ;(sel as any).addons = nextAddons
      nextSelections[selectionIdx] = sel
      return { ...prev, selections: nextSelections }
    })
  }

  const handleSubmit = async () => {
    if (saving) return
    // Resolve subscription & interval names from options if blank
    const subscriptionIdNum = Number(form.subscriptionId || 0)
    const intervalIdNum = Number(form.intervalId || 0)
    const subOpt = subscriptionOptions.find(o => o.id === subscriptionIdNum)
    const intOpt = intervalOptions.find(o => o.id === intervalIdNum)
    // Build a normalized row from form values
    const selectionNorm: MealSelection[] = form.selections
      .map((s) => {
        const idNum = Number(s.meal_id || 0)
        const opt = mealOptions.find(m => m.id === idNum)
        const addonsNorm: AddonSelection[] = (s.addons ?? [])
          .map((a) => ({
            addon_id: Number(a.addon_id || 0),
            quantity: Number(a.quantity || 0),
          }))
          .filter((a) => a.addon_id > 0 && a.quantity > 0)
        return {
          meal_id: idNum,
          meal_name: (s.meal_name && s.meal_name.trim() !== "") ? s.meal_name : (opt?.name || mealCatalog[idNum]),
          qty: Number(s.qty || 0),
          addons: addonsNorm,
        }
      })
      .filter((s) => s.meal_id > 0 && s.qty > 0)

    const normalized: SubMealSelectionRow = {
      subscriptionId: subscriptionIdNum,
      subscriptionName: subOpt?.name || form.subscriptionName || undefined,
      intervalId: intervalIdNum,
      intervalName: intOpt?.title || form.intervalName || undefined,
      selections: selectionNorm,
    }

    if (!normalized.subscriptionId || !normalized.intervalId) {
      toast({ title: "Missing data", description: "Please select a subscription and interval.", variant: "destructive" })
      return
    }
    if (normalized.selections.length === 0) {
      toast({ title: "No meals selected", description: "Please add at least one meal selection.", variant: "destructive" })
      return
    }

    // Add-ons are optional for the PUT update. Only include addons for selections
    // where the user explicitly picked them. Omitting the `addons` property will
    // leave any existing addons untouched/deleted according to backend semantics.

    const payload = {
      subscription_id: normalized.subscriptionId,
      interval_id: normalized.intervalId,
      selections: normalized.selections.map((s) => {
        const base: any = { meal_id: s.meal_id, qty: s.qty }
        const addonsArray = (s.addons ?? [])
          .map((a) => ({ addon_id: a.addon_id, quantity: a.quantity }))
          .filter((a) => a.addon_id > 0 && a.quantity > 0)
        if (addonsArray.length > 0) base.addons = addonsArray
        return base
      }),
    }

    try {
      setSaving(true)
      await apiService.post("/admins/sub-meal-selections/update?_method=put", payload)
      toast({ title: "Saved", description: "Meal selections updated successfully." })
      setIsModalOpen(false)
      resetForm()
      await fetchRows()
    } catch (err: any) {
      console.error("Failed to save meal selections", err)
      toast({
        title: "Error",
        description: err?.message || "Failed to update meal selections.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const fetchRows = async () => {
    try {
      setLoading(true)
      // There is no global list endpoint; build rows by fetching selections per subscription.
      const subsRes: any = await apiService.get("/subscriptions")
      const subsList = extractArray(subsRes)
      const subscriptionIds = subsList
        .map((s: any) => Number(s?.id ?? s?.ID ?? 0))
        .filter((id: number) => id > 0)

      const subscriptionLabelById = new Map<number, string>()
      for (const s of subsList) {
        const id = Number(s?.id ?? s?.ID ?? 0)
        if (!id) continue
        subscriptionLabelById.set(id, buildSubscriptionLabel(s))
      }

      const chunkSize = 8
      const allRows: SubMealSelectionRow[] = []

      for (let i = 0; i < subscriptionIds.length; i += chunkSize) {
        const chunk = subscriptionIds.slice(i, i + chunkSize)
        const results = await Promise.all(
          chunk.map(async (subscriptionId) => {
            try {
              const res: any = await apiService.get(`/sub-meal-selections/subscription/${subscriptionId}`)
              return { subscriptionId, payload: res }
            } catch {
              return { subscriptionId, payload: null }
            }
          })
        )

        for (const { subscriptionId, payload } of results) {
          if (!payload) continue

          const list = extractArray(payload)

          // Case A: API returns grouped rows (one per interval) with `selections` array.
          const looksGrouped = list.some((it: any) => Array.isArray(it?.selections) || Array.isArray(it?.meal_selections) || Array.isArray(it?.items))

          if (looksGrouped) {
            for (const item of list) {
              const intervalId = Number(item?.interval_id ?? item?.intervalId ?? item?.interval?.id ?? 0)
              const intervalName = item?.interval?.name ?? item?.interval_name ?? item?.intervalTitle ?? item?.interval?.title ?? undefined
              const rawSelections = item?.selections ?? item?.meal_selections ?? item?.items ?? []
              const selections: MealSelection[] = Array.isArray(rawSelections)
                ? rawSelections.map((s: any) => {
                    const mealId = Number(s?.meal_id ?? s?.mealId ?? s?.id ?? 0)
                    const rawAddons = s?.addons ?? s?.add_ons ?? s?.addons_list ?? []
                    const addons: AddonSelection[] = Array.isArray(rawAddons)
                      ? rawAddons
                          .map((a: any) => ({
                            addon_id: Number(a?.addon_id ?? a?.addonId ?? a?.id ?? 0),
                            quantity: Number(a?.quantity ?? a?.qty ?? 0),
                            addon_name: a?.addon_name ?? a?.name ?? a?.addon?.name,
                          }))
                          .filter((a: any) => a.addon_id)
                      : []
                    return {
                      meal_id: mealId,
                      meal_name: s?.meal_name ?? s?.meal?.name ?? mealCatalog[mealId] ?? undefined,
                      qty: Number(s?.qty ?? s?.quantity ?? 0),
                      addons,
                    }
                  })
                : []

              allRows.push({
                id: item?.id ? Number(item.id) : undefined,
                subscriptionId,
                subscriptionName: subscriptionLabelById.get(subscriptionId) ?? `#${subscriptionId}`,
                intervalId,
                intervalName,
                selections,
              })
            }
            continue
          }

          // Case B: API returns a flat list of selection rows with interval_id/meal_id.
          const byInterval = new Map<number, MealSelection[]>()
          for (const s of list) {
            const intervalId = Number(s?.interval_id ?? s?.intervalId ?? 0)
            const mealId = Number(s?.meal_id ?? s?.mealId ?? s?.id ?? 0)
            if (!intervalId || !mealId) continue

            const rawAddons = s?.addons ?? s?.add_ons ?? s?.addons_list ?? []
            const addons: AddonSelection[] = Array.isArray(rawAddons)
              ? rawAddons
                  .map((a: any) => ({
                    addon_id: Number(a?.addon_id ?? a?.addonId ?? a?.id ?? 0),
                    quantity: Number(a?.quantity ?? a?.qty ?? 0),
                    addon_name: a?.addon_name ?? a?.name ?? a?.addon?.name,
                  }))
                  .filter((a: any) => a.addon_id)
              : []

            const entry: MealSelection = {
              meal_id: mealId,
              meal_name: s?.meal_name ?? s?.meal?.name ?? mealCatalog[mealId] ?? undefined,
              qty: Number(s?.qty ?? s?.quantity ?? 0),
              addons,
            }
            const prev = byInterval.get(intervalId) ?? []
            prev.push(entry)
            byInterval.set(intervalId, prev)
          }

          for (const [intervalId, selections] of byInterval.entries()) {
            allRows.push({
              subscriptionId,
              subscriptionName: subscriptionLabelById.get(subscriptionId) ?? `#${subscriptionId}`,
              intervalId,
              intervalName: intervalOptions.find(o => o.id === intervalId)?.title,
              selections,
            })
          }
        }
      }

      setRows(allRows)
    } catch (error: unknown) {
      setRows([])
      toast({
        title: "Error",
        description: (error as any)?.message || "Failed to load meal selections.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch dropdown options
  const fetchSubscriptionOptions = async () => {
    try {
      setOptionsLoading(prev => ({ ...prev, subs: true }))
      const res = await apiService.get("/subscriptions")
      const items = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : []
      const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
      const mapped = items.map((s: any) => {
        const id = s.id ?? s.ID
        if (!id) return null
        const dti = s.delivery_time_id || s.deliveryTime || s.delivery_time || {}
        const dayNumRaw = dti?.day?.day_of_week ?? dti?.day_of_week ?? dti?.dayOfWeek
        let dayName: string | undefined
        if (typeof dayNumRaw === 'number') {
          // API uses 1 = Monday ... 7 = Sunday
          const idx = (dayNumRaw % 7) // 1->1 ... 7->0
          dayName = idx === 0 ? 'Sunday' : dayNames[idx]
        }
        const start: string | undefined = dti?.start_time || dti?.startTime
        const end: string | undefined = dti?.end_time || dti?.endTime
        const timePart = start && end ? `${start.slice(0,5)}–${end.slice(0,5)}` : undefined
        const label = `#${id}${dayName ? ' - ' + dayName : ''}${timePart ? ' ' + timePart : ''}`
        return { id, name: label }
      }).filter((s: any) => s && s.id)
      setSubscriptionOptions(mapped)
    } catch (e) {
      setSubscriptionOptions([])
    } finally {
      setOptionsLoading(prev => ({ ...prev, subs: false }))
    }
  }

  const fetchIntervalOptions = async () => {
    try {
      setOptionsLoading(prev => ({ ...prev, intervals: true }))
      const res = await apiService.get("/subscription_intervals")
      const items = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : []
      const mapped = items.map((it: any) => {
        const id = it.id
        if (!id) return null
        const baseTitle = it.title ?? it.name ?? `Interval #${id}`
        const start = it.start_date || it.startDate
        const end = it.end_date || it.endDate
        const fullTitle = (start && end) ? `${baseTitle} ${start} - ${end}` : baseTitle
        return { id, title: fullTitle }
      }).filter((i: any) => i && i.id)
      setIntervalOptions(mapped)
    } catch (e) {
      setIntervalOptions([])
    } finally {
      setOptionsLoading(prev => ({ ...prev, intervals: false }))
    }
  }

  const fetchMealOptions = async () => {
    try {
      setOptionsLoading(prev => ({ ...prev, meals: true }))
      const res = await apiService.get("/meals")
      const items = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : []
      const mapped = items.map((m: any) => ({ id: m.id ?? m.ID, name: m.name ?? m.Label ?? m.label ?? `Meal #${m.id}` })).filter((m: any) => m.id)
      setMealOptions(mapped)
    } catch (e) {
      setMealOptions([])
    } finally {
      setOptionsLoading(prev => ({ ...prev, meals: false }))
    }
  }

  const getAddonsForMealId = (mealId: number) => {
    if (!mealId) return []
    return addonsByMealId[mealId] ?? []
  }

  const filtered = rows.filter((r) => {
    const q = searchTerm.toLowerCase()
    const sub = r.subscriptionName?.toLowerCase() ?? String(r.subscriptionId)
    const intval = r.intervalName?.toLowerCase() ?? String(r.intervalId)
    const selectionStr = r.selections.map((s) => `${s.meal_id}x${s.qty}`).join(",")
    return sub.includes(q) || intval.includes(q) || selectionStr.includes(q)
  })

  const handleDeleteRow = async (row: SubMealSelectionRow) => {
    if (deletingId !== null) return
    // If row has no persisted id just remove locally
    if (!row.id) {
      setRows(prev => prev.filter(r => r !== row))
      return
    }
    if (!window.confirm('Delete this selection set? This cannot be undone.')) return
    setDeletingId(row.id)
    try {
      await apiService.delete(`/sub-meal-selections/${row.id}`)
      setRows(prev => prev.filter(r => r.id !== row.id))
    } catch (err: any) {
      // Surface error (toast hook pattern similar to other pages if desired)
      console.error('Delete failed', err)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Subscription & Meal Selections</h2>
          <Button onClick={() => openAddModal()}>
            <Plus className="mr-2 h-4 w-4" /> Add Selection
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Selections</CardTitle>
            <CardDescription>Subscription and interval meal selections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by subscription, interval, or meal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Selections</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No selections found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row, idx) => (
                    <TableRow key={row.id ?? `${row.subscriptionId}-${row.intervalId}-${idx}`}>
                      <TableCell>
                        <div className="font-medium">{row.subscriptionName ?? `#${row.subscriptionId}`}</div>
                        <div className="text-xs text-muted-foreground">ID: {row.subscriptionId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.intervalName ?? `#${row.intervalId}`}</div>
                        <div className="text-xs text-muted-foreground">ID: {row.intervalId}</div>
                      </TableCell>
                      <TableCell>
                        {row.selections.length === 0 ? (
                          <span>—</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {row.selections.map((s, i) => (
                              <Badge key={`${s.meal_id}-${i}`} variant="secondary">
                                {(s.meal_name ?? mealCatalog[s.meal_id] ?? `Meal ${s.meal_id}`)} × {s.qty}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(row, idx)} disabled={deletingId === row.id}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteRow(row)} disabled={deletingId === row.id}>
                          {deletingId === row.id ? 'Deleting...' : (<><Trash2 className="mr-2 h-4 w-4" /> Delete</>)}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Selection Modal */}
  <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm() }}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editingIndex === null ? "Add Selection" : "Edit Selection"}</DialogTitle>
            <DialogDescription>
              {editingIndex === null ? "Create a new subscription meal selection." : "Update this subscription meal selection."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Subscription</Label>
                <Select
                  value={form.subscriptionId}
                  onValueChange={(val) => {
                    const opt = subscriptionOptions.find(o => String(o.id) === val)
                    setForm(p => ({ ...p, subscriptionId: val, subscriptionName: opt?.name || p.subscriptionName }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={optionsLoading.subs ? 'Loading...' : 'Select subscription'} />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptionOptions.map(o => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Interval</Label>
                <Select
                  value={form.intervalId}
                  onValueChange={(val) => {
                    const opt = intervalOptions.find(o => String(o.id) === val)
                    setForm(p => ({ ...p, intervalId: val, intervalName: opt?.title || p.intervalName }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={optionsLoading.intervals ? 'Loading...' : 'Select interval'} />
                  </SelectTrigger>
                  <SelectContent>
                    {intervalOptions.map(o => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Meal Selections</Label>
                <Button type="button" size="sm" variant="secondary" onClick={addSelectionItem}>
                  <Plus className="mr-2 h-4 w-4" /> Add Meal
                </Button>
              </div>
              <div className="space-y-3">
                {form.selections.map((s, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div className="md:col-span-7 space-y-1">
                      <Label>Meal</Label>
                      <Select
                        value={s.meal_id}
                        onValueChange={(val) => {
                          const opt = mealOptions.find(m => String(m.id) === val)
                          updateSelectionField(i, 'meal_id', val)
                          if (opt) updateSelectionField(i, 'meal_name', opt.name)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={optionsLoading.meals ? 'Loading meals...' : 'Select meal'} />
                        </SelectTrigger>
                        <SelectContent>
                          {mealOptions.map(m => (
                            <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3">
                      <Label htmlFor={`qty_${i}`}>Qty</Label>
                      <Input id={`qty_${i}`} type="number" min="0" value={s.qty} onChange={(e) => updateSelectionField(i, 'qty', e.target.value)} />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <Button type="button" variant="destructive" size="icon" onClick={() => removeSelectionItem(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="md:col-span-7 space-y-1">
                      <Label>Addon (optional)</Label>
                      {(() => {
                        const mealId = Number(s.meal_id || 0)
                        const allowed = getAddonsForMealId(mealId)
                        const isLoadingAddons = !!addonsLoadingByMealId[mealId]
                        const placeholder = !mealId
                          ? 'Select meal first'
                          : isLoadingAddons
                            ? 'Loading addons...'
                            : (allowed.length === 0 ? 'No addons available' : 'Select addon')
                        return (
                      <Select
                        value={s.addons?.[0]?.addon_id ?? ""}
                        onValueChange={(val) => updateAddonField(i, 0, 'addon_id', val)}
                        disabled={!mealId || isLoadingAddons || allowed.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {allowed.map(a => (
                            <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                        )
                      })()}
                    </div>
                    <div className="md:col-span-3">
                      <Label htmlFor={`addon_qty_${i}`}>Addon Qty</Label>
                      <Input
                        id={`addon_qty_${i}`}
                        type="number"
                        min="1"
                        value={s.addons?.[0]?.quantity ?? "1"}
                        onChange={(e) => updateAddonField(i, 0, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : (editingIndex === null ? "Add" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

