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
    // Build a normalized row from form values
    const selectionNorm: MealSelection[] = form.selections
      .map((s) => ({
        meal_id: Number(s.meal_id || 0),
        meal_name: s.meal_name && s.meal_name.trim() !== "" ? s.meal_name : mealCatalog[Number(s.meal_id || 0)],
        qty: Number(s.qty || 0),
      }))
      .filter((s) => s.meal_id > 0 && s.qty >= 0)

    const normalized: SubMealSelectionRow = {
      subscriptionId: Number(form.subscriptionId || 0),
      subscriptionName: form.subscriptionName || undefined,
      intervalId: Number(form.intervalId || 0),
      intervalName: form.intervalName || undefined,
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
                  <TableHead className="text-right">Action</TableHead>
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
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(row, idx)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
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
              <div>
                <Label htmlFor="subscriptionName">Subscription Name</Label>
                <Input id="subscriptionName" value={form.subscriptionName} onChange={(e) => setForm((p) => ({ ...p, subscriptionName: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="subscriptionId">Subscription ID</Label>
                <Input id="subscriptionId" type="number" value={form.subscriptionId} onChange={(e) => setForm((p) => ({ ...p, subscriptionId: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="intervalName">Interval Name</Label>
                <Input id="intervalName" value={form.intervalName} onChange={(e) => setForm((p) => ({ ...p, intervalName: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="intervalId">Interval ID</Label>
                <Input id="intervalId" type="number" value={form.intervalId} onChange={(e) => setForm((p) => ({ ...p, intervalId: e.target.value }))} />
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
                    <div className="md:col-span-6">
                      <Label htmlFor={`meal_name_${i}`}>Meal Name</Label>
                      <Input id={`meal_name_${i}`} value={s.meal_name} onChange={(e) => updateSelectionField(i, "meal_name", e.target.value)} />
                    </div>
                    <div className="md:col-span-3">
                      <Label htmlFor={`meal_id_${i}`}>Meal ID</Label>
                      <Input id={`meal_id_${i}`} type="number" value={s.meal_id} onChange={(e) => updateSelectionField(i, "meal_id", e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor={`qty_${i}`}>Qty</Label>
                      <Input id={`qty_${i}`} type="number" min="0" value={s.qty} onChange={(e) => updateSelectionField(i, "qty", e.target.value)} />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
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

