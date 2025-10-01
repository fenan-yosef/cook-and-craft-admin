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

type MealSelection = { meal_id: number; meal_name?: string; qty: number }

interface SubMealSelectionRow {
  id?: number
  subscriptionId: number
  subscriptionName?: string
  intervalId: number
  intervalName?: string
  selections: MealSelection[]
}

export default function SubscriptionAndMealSelectionsPage() {
  const [rows, setRows] = useState<SubMealSelectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  // Option dropdown data
  const [subscriptionOptions, setSubscriptionOptions] = useState<Array<{ id: number; name: string }>>([])
  const [intervalOptions, setIntervalOptions] = useState<Array<{ id: number; title: string }>>([])
  const [mealOptions, setMealOptions] = useState<Array<{ id: number; name: string }>>([])
  const [optionsLoading, setOptionsLoading] = useState({ subs: false, intervals: false, meals: false })
  // Modal state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [form, setForm] = useState({
    subscriptionId: "",
    subscriptionName: "",
    intervalId: "",
    intervalName: "",
    selections: [{ meal_id: "", meal_name: "", qty: "" }] as Array<{ meal_id: string; meal_name: string; qty: string }>,
  })
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
    fetchRows()
    fetchSubscriptionOptions()
    fetchIntervalOptions()
    fetchMealOptions()
  }, [])

  // Modal helpers
  const resetForm = () => {
    setForm({
      subscriptionId: "",
      subscriptionName: "",
      intervalId: "",
      intervalName: "",
      selections: [{ meal_id: "", meal_name: "", qty: "" }],
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
      })),
    })
    setIsModalOpen(true)
  }

  const addSelectionItem = () => {
    setForm((prev) => ({
      ...prev,
      selections: [...prev.selections, { meal_id: "", meal_name: "", qty: "" }],
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
  }

  const handleSubmit = () => {
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
        return {
          meal_id: idNum,
          meal_name: (s.meal_name && s.meal_name.trim() !== "") ? s.meal_name : (opt?.name || mealCatalog[idNum]),
          qty: Number(s.qty || 0),
        }
      })
      .filter((s) => s.meal_id > 0 && s.qty >= 0)

    const normalized: SubMealSelectionRow = {
      subscriptionId: subscriptionIdNum,
      subscriptionName: subOpt?.name || form.subscriptionName || undefined,
      intervalId: intervalIdNum,
      intervalName: intOpt?.title || form.intervalName || undefined,
      selections: selectionNorm,
    }

    setRows((prev) => {
      if (editingIndex === null) {
        return [normalized, ...prev]
      }
      const clone = [...prev]
      clone[editingIndex] = { ...clone[editingIndex], ...normalized }
      return clone
    })

    setIsModalOpen(false)
    resetForm()
  }

  const fetchRows = async () => {
    try {
      setLoading(true)
      const response = await apiService.get("/sub-meal-selections/subscription")
      const payload = response ?? {}
      const candidates = [payload, (payload as any)?.data, (payload as any)?.data?.data, (payload as any)?.result, (payload as any)?.results, (payload as any)?.list]
      let list: any[] = []
      for (const layer of candidates) {
        if (!layer) continue
        if (Array.isArray(layer)) { list = layer; break }
        if (Array.isArray((layer as any).data)) { list = (layer as any).data; break }
      }
      const mapped: SubMealSelectionRow[] = list.map((item: any) => {
        const subscriptionId = Number(
          item.subscription_id ?? item.subscriptionId ?? item.subscription?.id ?? 0
        )
        const subscriptionName =
          item.subscription?.name ?? item.subscription_name ?? item.subscriptionTitle ?? item.subscription?.title ?? undefined
        const intervalId = Number(
          item.interval_id ?? item.intervalId ?? item.interval?.id ?? 0
        )
        const intervalName =
          item.interval?.name ?? item.interval_name ?? item.intervalTitle ?? item.interval?.title ?? undefined
    const rawSelections = item.selections ?? item.meal_selections ?? item.items ?? []
        const selections: MealSelection[] = Array.isArray(rawSelections)
          ? rawSelections.map((s: any) => ({
      meal_id: Number(s.meal_id ?? s.mealId ?? s.id ?? 0),
      meal_name: s.meal_name ?? s.meal?.name ?? mealCatalog[Number(s.meal_id ?? s.mealId ?? s.id ?? 0)] ?? undefined,
      qty: Number(s.qty ?? s.quantity ?? 0),
            }))
          : []
        return {
          id: item.id ? Number(item.id) : undefined,
          subscriptionId,
          subscriptionName,
          intervalId,
          intervalName,
          selections,
        }
      })
      setRows(mapped.length > 0 ? mapped : getMockRows())
    } catch (error) {
      setRows(getMockRows())
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

  const getMockRows = (): SubMealSelectionRow[] => [
    {
      id: 1,
      subscriptionId: 11,
      subscriptionName: "Weekly Plan",
      intervalId: 101,
      intervalName: "Sep 1–7",
      selections: [
  { meal_id: 1, meal_name: mealCatalog[1], qty: 2 },
  { meal_id: 3, meal_name: mealCatalog[3], qty: 1 },
      ],
    },
    {
      id: 2,
      subscriptionId: 12,
      subscriptionName: "Vegetarian Plan",
      intervalId: 102,
      intervalName: "Sep 8–14",
      selections: [
  { meal_id: 5, meal_name: mealCatalog[5], qty: 1 },
  { meal_id: 7, meal_name: mealCatalog[7], qty: 2 },
      ],
    },
  ]

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
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit}>{editingIndex === null ? "Add" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

