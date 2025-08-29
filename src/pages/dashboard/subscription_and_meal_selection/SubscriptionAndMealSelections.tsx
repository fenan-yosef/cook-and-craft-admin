import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, MoreHorizontal, Plus, Edit, Trash2 } from "lucide-react"
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

interface Interval {
  id: number
  title: string
  start_date: string
  end_date: string
  status: "active" | "inactive"
  price_per_serving_cents: number
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
    is_active: false,
    price_per_serving_cents: "",
  })

  // Edit Product Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    id: "",
    title: "",
    start_date: "",
    end_date: "",
    is_active: false,
    price_per_serving_cents: "",
  })

  useEffect(() => {
    fetchIntervals()
  }, [])

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
    const { name, value, type } = target
    setAddForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? target.checked : value,
    }))
  }

  // Reset Add Product Form
  const resetAddForm = () => {
    setAddForm({
      title: "",
      start_date: "",
      end_date: "",
      is_active: false,
      price_per_serving_cents: "",
    })
  }

  // Submit Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    try {
      const payload = {
        title: addForm.title,
        start_date: addForm.start_date,
        end_date: addForm.end_date,
        status: addForm.is_active ? "active" : "inactive",
        price_per_serving_cents: Number(addForm.price_per_serving_cents) * 100,
      }

      // Send POST request via apiService
      await apiService.post("/subscription_intervals", payload)

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
      is_active: interval.status === "active",
      price_per_serving_cents: (interval.price_per_serving_cents / 100).toString(),
    })
    setIsEditOpen(true)
  }

  // Handle Edit Product Form Changes
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement
    const { name, value, type } = target
    setEditForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? target.checked : value,
    }))
  }

  // Reset Edit Product Form
  const resetEditForm = () => {
    setEditForm({
      id: "",
      title: "",
      start_date: "",
      end_date: "",
      is_active: false,
      price_per_serving_cents: "",
    })
  }

  // Submit Edit Product
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      // Build form data and POST with _method=put
      const formData = new FormData()
      formData.append("title", editForm.title)
      formData.append("start_date", editForm.start_date)
      formData.append("end_date", editForm.end_date)
      formData.append("status", editForm.is_active ? "active" : "inactive")
      formData.append("price_per_serving_cents", String(Number(editForm.price_per_serving_cents) * 100))

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
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={addForm.start_date}
                    onChange={handleAddChange}
                    required
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    value={addForm.end_date}
                    onChange={handleAddChange}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    id="is_active"
                    name="is_active"
                    type="checkbox"
                    checked={addForm.is_active}
                    onChange={handleAddChange}
                  />
                  <Label htmlFor="is_active">Active</Label>
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
                <Button type="submit" disabled={addLoading}>
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
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="edit_start_date">Start Date</Label>
                  <Input
                    id="edit_start_date"
                    name="start_date"
                    type="date"
                    value={editForm.start_date}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="edit_end_date">End Date</Label>
                  <Input
                    id="edit_end_date"
                    name="end_date"
                    type="date"
                    value={editForm.end_date}
                    onChange={handleEditChange}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    id="edit_is_active"
                    name="is_active"
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={handleEditChange}
                  />
                  <Label htmlFor="edit_is_active">Active</Label>
                </div>
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
                      <TableCell>{new Date(interval.end_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={interval.status === "active" ? "default" : "secondary"}>
                          {interval.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{`$${(interval.price_per_serving_cents/100).toFixed(2)}`}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openEditModal(interval)}>
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
    </div>
  )
}

