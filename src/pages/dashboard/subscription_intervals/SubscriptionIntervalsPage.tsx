import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Edit, Trash2, Calendar as CalendarIcon } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
// Calendar removed in favor of week dropdown selection

interface Interval {
  id: number
  title: string
  start_date: string
  end_date: string
  status: "active"
  is_served: number
  price_per_serving_cents: number
  cutoff_date?: string
}

export default function SubscriptionIntervalsPage() {
  const [intervals, setIntervals] = useState<Interval[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  // Add Product Modal State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addForm, setAddForm] = useState({
    title: "",
    start_date: "",
    end_date: "",
    status: "active" as "active" | "expired",
    price_per_serving_cents: "",
    cutoff_date: "",
  })
  // Meals selection state for Add modal
  const [mealsOptions, setMealsOptions] = useState<{ id: number; name: string }[]>([])
  const [mealsLoading, setMealsLoading] = useState(false)
  const [selectedMealIds, setSelectedMealIds] = useState<number[]>([])

  // Edit Product Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    id: "",
    title: "",
    start_date: "",
    end_date: "",
    status: "active" as "active" | "expired",
    price_per_serving_cents: "",
    cutoff_date: "",
  })
  // Edit selected week key
  const [editSelectedWeekKey, setEditSelectedWeekKey] = useState("")
  // Precomputed selectable weeks: start from next Monday (no past or current week)
  const generateWeeks = (countForward = 16) => {
    const today = new Date()
    today.setHours(0,0,0,0)
    const day = today.getDay() // 0 Sun ... 6 Sat
    const daysUntilNextMonday = day === 1 ? 7 : ((8 - day) % 7 || 7)
    const firstMonday = new Date(today)
    firstMonday.setDate(firstMonday.getDate() + daysUntilNextMonday)
    firstMonday.setHours(0,0,0,0)
    const fmt = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth()+1).padStart(2,'0')
      const dd = String(d.getDate()).padStart(2,'0')
      return `${y}-${m}-${dd}`
    }
    const weeks: { label: string; start: string; end: string; isoKey: string }[] = []
    for (let i = 0; i < countForward; i++) {
      const start = new Date(firstMonday)
      start.setDate(start.getDate() + 7 * i)
      start.setHours(0,0,0,0)
      // API expects end as next Monday (exclusive) to make exactly 7 days
      const endApi = new Date(start)
      endApi.setDate(endApi.getDate() + 7)
      endApi.setHours(0,0,0,0)
      // For label, also show Sunday for clarity
      const endDisplay = new Date(start)
      endDisplay.setDate(endDisplay.getDate() + 6)
      endDisplay.setHours(0,0,0,0)
      const startStr = fmt(start)
      const endApiStr = fmt(endApi)
      const endDisplayStr = fmt(endDisplay)
      weeks.push({
        label: `${startStr} → ${endDisplayStr}`,
        start: startStr,
        end: endApiStr,
        isoKey: startStr
      })
    }
    return weeks
  }
  const [weekOptions, setWeekOptions] = useState(() => generateWeeks())
  // Deletion state
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    fetchIntervals()
  }, [])

  // Lazy-load meals when Add modal opens
  useEffect(() => {
    if (isAddOpen && mealsOptions.length === 0) {
      ;(async () => {
        try {
          setMealsLoading(true)
          const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
          if (token) apiService.setAuthToken(token)
          const res: any = await apiService.get("/meals")
          // Normalize to an array and map common name/title fields
          const candidates = [res, res?.data, res?.result, res?.results, res?.items, res?.records]
          let items: any[] = []
          for (const c of candidates) {
            if (Array.isArray(c)) { items = c; break }
            if (c && Array.isArray(c.data)) { items = c.data; break }
          }
          const mapped = (items || []).map((m: any) => {
            const idRaw = m.id ?? m.mealId ?? m.meal_id ?? m.ID
            const nameRaw = m.name ?? m.title ?? m.mealName ?? m.meal_title ?? m.Label
            const id = Number(idRaw)
            const name = nameRaw != null ? String(nameRaw) : `Meal #${idRaw ?? ""}`
            return { id, name }
          }).filter((m: any) => !isNaN(m.id))
          setMealsOptions(mapped)
        } catch (e) {
          // silent fail; UI shows empty list
        } finally {
          setMealsLoading(false)
        }
      })()
    }
  }, [isAddOpen, mealsOptions.length])

  const fetchIntervals = async () => {
    try {
      setLoading(true)
      const response = await apiService.get("/subscription_intervals")
      const mappedIntervals: Interval[] = (response.data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        start_date: item.start_date,
        end_date: item.end_date,
        status: item.status,
        price_per_serving_cents: item.price_per_serving_cents,
        cutoff_date: item.cutoff_date || item.cutoffDate || undefined,
      }))
      setIntervals(mappedIntervals)
    } catch (error) {
      // Mock data for demonstration
      const mockIntervals: Interval[] = [
        {
          id: 1,
          title: "aa",
          start_date: "2025-09-01",
          end_date: "2025-10-14",
          status: "active",
          is_served: 1,
          price_per_serving_cents: 0,
        },
      ]
      setIntervals(mockIntervals)
    } finally {
      setLoading(false)
    }
  }

  // Handle Add Product Form Changes
  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement
    const { name, value } = target
    setAddForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Reset Add Product Form
  const resetAddForm = () => {
    setAddForm({
      title: "",
      start_date: "",
      end_date: "",
      status: "active",
      price_per_serving_cents: "",
      cutoff_date: "",
    })
    setSelectedWeekKey("")
    setSelectedMealIds([])
  }

  // computeWeekRange removed (selection via predefined week list)

  // Week selection via dropdown
  const [selectedWeekKey, setSelectedWeekKey] = useState("")
  const handleSelectWeek = (key: string) => {
    setSelectedWeekKey(key)
    const wk = weekOptions.find(w => w.isoKey === key)
    if (wk) {
      setAddForm(prev => ({ ...prev, start_date: wk.start, end_date: wk.end }))
    }
  }

  // Auto-select first week when opening Add modal
  useEffect(() => {
    if (isAddOpen && weekOptions.length > 0 && !selectedWeekKey) {
      const wk = weekOptions[0]
      setSelectedWeekKey(wk.isoKey)
      setAddForm(prev => ({ ...prev, start_date: wk.start, end_date: wk.end }))
    }
  }, [isAddOpen, weekOptions, selectedWeekKey])

  // Submit Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    try {
      // Validation: ensure we have start/end and they form exactly 7-day Monday-next Monday window
      if (!addForm.start_date || !addForm.end_date) {
        throw new Error('Please select a week (Mon-Sun).')
      }
      if (!addForm.cutoff_date) {
        throw new Error('Please provide a cutoff date.')
      }
      const parseLocal = (s: string) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d) }
      const start = parseLocal(addForm.start_date)
      const end = parseLocal(addForm.end_date)
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000*60*60*24))
      const startDay = start.getDay()
      const endDay = end.getDay()
      const isMonday = startDay === 1
      const isNextMonday = endDay === 1
      if (diffDays !== 7 || !isMonday || !isNextMonday) {
        throw new Error('Selected range must be Monday to next Monday (7 days).')
      }
      const payload = {
        title: addForm.title,
        start_date: addForm.start_date,
        end_date: addForm.end_date,
        status: addForm.status,
        price_per_serving_cents: Number(addForm.price_per_serving_cents) * 100,
        cutoff_date: addForm.cutoff_date,
      }

      // Send POST request via apiService
      const createRes: any = await apiService.post("/subscription_intervals", payload)

      // Attempt to extract created interval id
      let createdIntervalId: number | null = null
      const candidates = [createRes, createRes?.data, createRes?.result]
      for (const c of candidates) {
        if (c && (c.id != null || c.interval_id != null)) {
          createdIntervalId = Number(c.id ?? c.interval_id)
          break
        }
      }

      // Assign meals if any selected and we have an interval id
      if (selectedMealIds.length > 0) {
        if (!createdIntervalId) {
          // Fallback: try to infer id by refetching and matching
          try {
            await fetchIntervals()
            const match = (prev => prev.find(i => i.title === addForm.title && i.start_date === addForm.start_date && i.end_date === addForm.end_date))(intervals)
            if (match) createdIntervalId = match.id
          } catch {}
        }
        if (createdIntervalId) {
          try {
            await apiService.post("/meals/assign-meals-to-interval", {
              interval_id: createdIntervalId,
              meal_ids: selectedMealIds,
            })
            toast({ title: "Meals assigned", description: `${selectedMealIds.length} meal(s) assigned to interval.` })
          } catch (assignErr: any) {
            toast({ title: "Interval created, but meal assignment failed", description: assignErr?.message || "Couldn't assign meals.", variant: "destructive" })
          }
        } else {
          toast({ title: "Interval created, but couldn't resolve ID", description: "Meals not assigned automatically.", variant: "destructive" })
        }
      }

      toast({
        title: "Success",
        description: "Interval added successfully.",
      })
      setIsAddOpen(false)
      resetAddForm()
      fetchIntervals()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add interval.",
        variant: "destructive",
      })
    } finally {
      setAddLoading(false)
    }
  }

  // Open Edit Modal and pre-fill fields
  const openEditModal = (interval: Interval) => {
    setEditForm({
      id: String(interval.id),
      title: interval.title,
      start_date: interval.start_date,
      end_date: interval.end_date,
      status: (interval.status as "active" | "expired") ?? "active",
      price_per_serving_cents: (interval.price_per_serving_cents / 100).toString(),
      cutoff_date: interval.cutoff_date || "",
    })
    // Ensure existing interval week is present in options; prepend if missing
    const exists = weekOptions.find(w => w.start === interval.start_date)
    if (!exists) {
      // Build a Mon->Sun label from stored Mon->next Mon dates
      const [y,m,d] = interval.end_date.split('-').map(Number)
      const endDate = new Date(y, (m ?? 1) - 1, d)
      endDate.setDate(endDate.getDate() - 1) // display Sunday
      const ymd = `${endDate.getFullYear()}-${String(endDate.getMonth()+1).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`
      setWeekOptions(prev => [{
        label: `${interval.start_date} → ${ymd}`,
        start: interval.start_date,
        end: interval.end_date,
        isoKey: interval.start_date
      }, ...prev])
    }
    setEditSelectedWeekKey(interval.start_date)
    setIsEditOpen(true)
  }

  // Handle Edit Product Form Changes
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement
    const { name, value } = target
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Reset Edit Product Form
  const resetEditForm = () => {
    setEditForm({
      id: "",
      title: "",
      start_date: "",
      end_date: "",
      status: "active",
      price_per_serving_cents: "",
      cutoff_date: "",
    })
    setEditSelectedWeekKey("")
  }

  // Submit Edit Product
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      if (!editForm.start_date || !editForm.end_date) {
        throw new Error('Please select a week (Mon-Sun).')
      }
      if (!editForm.cutoff_date) {
        throw new Error('Please provide a cutoff date.')
      }
      const parseLocal = (s: string) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d) }
      const start = parseLocal(editForm.start_date)
      const end = parseLocal(editForm.end_date)
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000*60*60*24))
      const isMonday = start.getDay() === 1
      const isNextMonday = end.getDay() === 1
      if (diffDays !== 7 || !isMonday || !isNextMonday) {
        throw new Error('Selected range must be Monday to next Monday (7 days).')
      }
      // Build form data and POST with _method=put
      const formData = new FormData()
      formData.append("title", editForm.title)
      formData.append("start_date", editForm.start_date)
      formData.append("end_date", editForm.end_date)
      formData.append("status", editForm.status)
      formData.append("price_per_serving_cents", String(Number(editForm.price_per_serving_cents) * 100))
      formData.append("cutoff_date", editForm.cutoff_date)

      const response = await apiService.postMultipart(`/subscription_intervals/${editForm.id}?_method=put`, formData)
      console.log("PUT override response:", response)

      toast({
        title: "Success",
        description: "Interval updated successfully.",
      })
      setIsEditOpen(false)
      resetEditForm()
      fetchIntervals()
    } catch (err: any) {
      console.error("Interval update error:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to update interval.",
        variant: "destructive",
      })
    } finally {
      setEditLoading(false)
    }
  }

  const filteredIntervals = intervals.filter(interval =>
    interval.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteInterval = async (id: number) => {
    if (!window.confirm('Delete this interval? This cannot be undone.')) return;
    setDeletingId(id)
    try {
      await apiService.delete(`/subscription_intervals/${id}`)
      toast({ title: 'Deleted', description: 'Interval removed.' })
      // Optimistic removal or refetch
      setIntervals(prev => prev.filter(i => i.id !== id))
      // If edit modal was open for this interval close it
      if (editForm.id && Number(editForm.id) === id) {
        setIsEditOpen(false)
        resetEditForm()
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to delete interval.', variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Subscription Intervals</h2>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Interval
          </Button>
        </div>

        {/* Add Product Modal */}
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetAddForm() }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Interval</DialogTitle>
              <DialogDescription>Fill in the interval details below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={addForm.title}
                  onChange={handleAddChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="week_select">Week (Mon - Sun)</Label>
                <Select value={selectedWeekKey} onValueChange={handleSelectWeek}>
                  <SelectTrigger id="week_select" className="mt-1">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map(w => (
                      <SelectItem key={w.isoKey} value={w.isoKey}>{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                  <CalendarIcon className="h-3 w-3" />
                  {addForm.start_date && addForm.end_date ? (
                    (() => {
                      const s = new Date(addForm.start_date)
                      const e = new Date(addForm.end_date)
                      e.setDate(e.getDate() - 1) // display Sunday
                      return (
                        <span className="text-emerald-600">Selected: <strong>{s.toLocaleDateString()}</strong> → <strong>{e.toLocaleDateString()}</strong></span>
                      )
                    })()
                  ) : 'Choose a week to set start/end automatically'}
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={addForm.status} onValueChange={(val: "active" | "expired") => setAddForm(prev => ({ ...prev, status: val }))}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cutoff_date">Cutoff Date</Label>
                <Input
                  id="cutoff_date"
                  name="cutoff_date"
                  type="date"
                  value={addForm.cutoff_date}
                  onChange={handleAddChange}
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">Last day users can make changes before interval week starts.</p>
              </div>
              {/* Meals selection */}
              <div>
                <Label>Meals to assign on this Interval</Label>
                <div className="mt-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-between">
                        {selectedMealIds.length > 0 ? `${selectedMealIds.length} selected` : "Select meals"}
                        <ChevronDown className="h-4 w-4 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] max-h-64 overflow-auto">
                      {mealsLoading ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                      ) : mealsOptions.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No meals found</div>
                      ) : (
                        mealsOptions.map((m) => {
                          const checked = selectedMealIds.includes(m.id)
                          return (
                            <DropdownMenuCheckboxItem
                              key={m.id}
                              checked={checked}
                              onCheckedChange={(isChecked) => {
                                setSelectedMealIds((prev) => {
                                  if (isChecked) return prev.includes(m.id) ? prev : [...prev, m.id]
                                  return prev.filter((id) => id !== m.id)
                                })
                              }}
                            >
                              {m.name}
                            </DropdownMenuCheckboxItem>
                          )
                        })
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {selectedMealIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedMealIds.map((id) => {
                        const meal = mealsOptions.find((m) => m.id === id)
                        return (
                          <Badge key={id} variant="secondary" className="flex items-center gap-1">
                            {meal?.name || `#${id}`}
                            <button
                              type="button"
                              className="ml-1 rounded px-1 text-[10px] leading-none hover:bg-muted"
                              onClick={() => setSelectedMealIds((prev) => prev.filter((x) => x !== id))}
                              aria-label={`Remove ${meal?.name || id}`}
                            >
                              ×
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="price_per_serving_cents">Price per Serving ($)</Label>
                <Input
                  id="price_per_serving_cents"
                  name="price_per_serving_cents"
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.price_per_serving_cents}
                  onChange={handleAddChange}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addLoading || !addForm.start_date || !addForm.end_date}>
                  {addLoading ? "Adding..." : "Add Interval"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Product Modal */}
        <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetEditForm() }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Interval</DialogTitle>
              <DialogDescription>Update the interval details below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditProduct} className="space-y-4">
              <div>
                <Label htmlFor="edit_title">Title</Label>
                <Input
                  id="edit_title"
                  name="title"
                  value={editForm.title}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_week_select">Week (Mon - Sun)</Label>
                <Select value={editSelectedWeekKey} onValueChange={(key) => {
                  setEditSelectedWeekKey(key)
                  const wk = weekOptions.find(w => w.isoKey === key)
                  if (wk) {
                    setEditForm(prev => ({ ...prev, start_date: wk.start, end_date: wk.end }))
                  }
                }}>
                  <SelectTrigger id="edit_week_select" className="mt-1">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map(w => (
                      <SelectItem key={w.isoKey} value={w.isoKey}>{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 text-xs text-muted-foreground">
                  {editForm.start_date && editForm.end_date ? (
                    (() => {
                      const s = new Date(editForm.start_date)
                      const e = new Date(editForm.end_date)
                      e.setDate(e.getDate() - 1)
                      return (
                        <span className="text-emerald-600">Selected: <strong>{s.toLocaleDateString()}</strong> → <strong>{e.toLocaleDateString()}</strong></span>
                      )
                    })()
                  ) : 'Choose a week to set start/end automatically'}
                </div>
              </div>
              <div>
                <Label htmlFor="edit_status">Status</Label>
                <Select value={editForm.status} onValueChange={(val: "active" | "expired") => setEditForm(prev => ({ ...prev, status: val }))}>
                  <SelectTrigger id="edit_status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_cutoff_date">Cutoff Date</Label>
                <Input
                  id="edit_cutoff_date"
                  name="cutoff_date"
                  type="date"
                  value={editForm.cutoff_date}
                  onChange={handleEditChange}
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">Last day users can make changes before interval week starts.</p>
              </div>
              <div>
                <Label htmlFor="edit_price_per_serving_cents">Price per Serving ($)</Label>
                <Input
                  id="edit_price_per_serving_cents"
                  name="price_per_serving_cents"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.price_per_serving_cents}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>All Intervals</CardTitle>
            <CardDescription>Manage your subscription intervals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search intervals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price per Serving</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filteredIntervals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No intervals found</TableCell>
                  </TableRow>
                ) : (
                  filteredIntervals.map(interval => (
                    <TableRow key={interval.id}>
                      <TableCell>{interval.title}</TableCell>
                      <TableCell>{new Date(interval.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{(() => { const d = new Date(interval.end_date); d.setDate(d.getDate()-1); return d.toLocaleDateString() })()}</TableCell>
                      <TableCell>
                        <Badge variant={interval.status === "active" ? "default" : "secondary"}>
                          {interval.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{`$${(interval.price_per_serving_cents/100).toFixed(2)}`}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(interval)} disabled={deletingId === interval.id}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteInterval(interval.id)} disabled={deletingId === interval.id}>
                          {deletingId === interval.id ? 'Deleting...' : <><Trash2 className="mr-2 h-4 w-4" /> Delete</>}
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
    </div>
  )
}

