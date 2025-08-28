"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, Percent, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { id } from "date-fns/locale"

interface Coupon {
  id: number;
  name: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxDiscountValue: number;
  scope: string;
  maxRedemptions: number;
  perUserLimit: number;
  startsAt: string;
  endsAt: string;
  isAutoApply: boolean; // Added property
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()
  // Set auth token and fetch coupons together to ensure token is set before request
  useEffect(() => {
    const token = localStorage.getItem("auth_token") || "";
    apiService.setAuthToken(token);
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const result = await apiService.get("/admins/coupons");
      if (Array.isArray(result.data)) {
        setCoupons(result.data);
      } else {
        throw new Error(result.message || "Failed to fetch coupons");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch coupons",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCoupons = coupons.filter(
    (coupon) =>
      coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (coupon.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add Coupon modal state and form
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addForm, setAddForm] = useState({
    name: "",
    discountType: "percent",
    discountValue: "",
    maxDiscountValue: "",
    scope: "both",
    isAutoApply: false,
    maxRedemptions: "",
    perUserLimit: "",
    startsAt: "",
    endsAt: "",
  })
  // Edit Coupon modal state and form
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    discountType: "percent",
    discountValue: "",
    maxDiscountValue: "",
    scope: "both",
    isAutoApply: false,
    maxRedemptions: "",
    perUserLimit: "",
    startsAt: "",
    endsAt: "",
  })

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setAddForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
  }
  // Handle Edit form changes
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setEditForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
  }

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    try {
      // Build payload with top-level fields matching API
      const payload = {
        name: addForm.name,
        //code: addForm.code,
        discount_type: addForm.discountType,
        discount_value: parseFloat(addForm.discountValue),
        max_discount_value: parseFloat(addForm.maxDiscountValue),
        scope: addForm.scope,
        is_auto_apply: addForm.isAutoApply ? "1" : "0",
        max_redemptions: addForm.maxRedemptions,
        per_user_limit: addForm.perUserLimit,
        starts_at: addForm.startsAt,
        ends_at: addForm.endsAt,
      }
      const response = await apiService.post("/admins/coupons", payload)
      toast({ title: "Success", description: response.message || "Coupon created successfully." })
      setIsAddOpen(false)
      setAddForm({ name:"", discountType:"percent", discountValue:"", maxDiscountValue:"", scope:"both", isAutoApply:false, maxRedemptions:"", perUserLimit:"", startsAt:"", endsAt:"" })
      fetchCoupons()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create coupon.", variant: "destructive" })
    } finally {
      setAddLoading(false)
    }
  }
  // Open Edit modal with selected coupon data
  const openEditModal = (coupon: Coupon) => {
    setEditForm({
      id: coupon.id.toString(),
      name: coupon.name,
      // code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      maxDiscountValue: String(coupon.maxDiscountValue),
      scope: coupon.scope,
      isAutoApply: Boolean(coupon.isAutoApply),
      maxRedemptions: String(coupon.maxRedemptions),
      perUserLimit: String(coupon.perUserLimit),
      startsAt: coupon.startsAt,
      endsAt: coupon.endsAt,
    })
    setIsEditOpen(true)
  }
  // Submit Edit coupon
  const handleEditCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      const payload = {
        name: editForm.name,
        discount_type: editForm.discountType,
        discount_value: parseFloat(editForm.discountValue),
        max_discount_value: parseFloat(editForm.maxDiscountValue),
        scope: editForm.scope,
        is_auto_apply: editForm.isAutoApply ? "1" : "0",
        max_redemptions: editForm.maxRedemptions,
        per_user_limit: editForm.perUserLimit,
        starts_at: editForm.startsAt,
        ends_at: editForm.endsAt,
      }
  await apiService.patch(`/admins/coupons/${editForm.id}`, payload)
      toast({ title: "Success", description: "Coupon updated successfully." })
      setIsEditOpen(false)
      fetchCoupons()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update coupon.", variant: "destructive" })
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Coupons</h2>
          <Button onClick={() => setIsAddOpen(true)}>
            <Percent className="mr-2 h-4 w-4" /> Add Coupon
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Coupons</CardTitle>
            <CardDescription>Manage discount coupons</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search coupons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount (%)</TableHead>
                  <TableHead>Max Discount</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Max Redemptions</TableHead>
                  <TableHead>Per User Limit</TableHead>
                  <TableHead>Starts At</TableHead>
                  <TableHead>Ends At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredCoupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No coupons found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCoupons.map((coupon, idx) => (
                    <TableRow key={coupon.code + idx}>
                      <TableCell>{coupon.name}</TableCell>
                      <TableCell>{coupon.discountValue}</TableCell>
                      <TableCell>{coupon.maxDiscountValue}</TableCell>
                      <TableCell>{coupon.scope}</TableCell>
                      <TableCell>{coupon.isAutoApply}</TableCell>
                      <TableCell>{coupon.maxRedemptions}</TableCell>
                      <TableCell>{coupon.perUserLimit}</TableCell>
                      <TableCell>{coupon.startsAt}</TableCell>
                      <TableCell>{coupon.endsAt}</TableCell>
                      {/* <TableCell>
                        <Badge className={coupon.isAutoApply ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {coupon.isAutoApply ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell> */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(coupon)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Coupon Modal */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Coupon</DialogTitle>
              <DialogDescription>Fill in the coupon details below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddCoupon} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" value={addForm.name} onChange={handleAddChange} required />
              </div>
              {/* <div>
                <Label htmlFor="code">Code</Label>
                <Input id="code" name="code" value={addForm.code} onChange={handleAddChange} required />
              </div> */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="discountValue">Discount Value (%)</Label>
                  <Input id="discountValue" name="discountValue" type="number" step="0.01" value={addForm.discountValue} onChange={handleAddChange} required />
                </div>
                <div className="flex-1">
                  <Label htmlFor="maxDiscountValue">Max Discount</Label>
                  <Input id="maxDiscountValue" name="maxDiscountValue" type="number" value={addForm.maxDiscountValue} onChange={handleAddChange} required />
                </div>
              </div>
              {/* Scope field */}
              <div>
                <Label htmlFor="scope">Scope</Label>
                <Input id="scope" name="scope" value={addForm.scope} onChange={handleAddChange} required />
              </div>
              {/* Redemptions and per-user limit */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="maxRedemptions">Max Redemptions</Label>
                  <Input id="maxRedemptions" name="maxRedemptions" type="number" value={addForm.maxRedemptions} onChange={handleAddChange} required />
                </div>
                <div className="flex-1">
                  <Label htmlFor="perUserLimit">Per User Limit</Label>
                  <Input id="perUserLimit" name="perUserLimit" type="number" value={addForm.perUserLimit} onChange={handleAddChange} required />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input id="isAutoApply" name="isAutoApply" type="checkbox" checked={addForm.isAutoApply} onChange={handleAddChange} />
                <Label htmlFor="isAutoApply">Auto Apply</Label>
              </div>
              <div>
                <Label htmlFor="startsAt">Starts At</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" value={addForm.startsAt} onChange={handleAddChange} required />
              </div>
              <div>
                <Label htmlFor="endsAt">Ends At</Label>
                <Input id="endsAt" name="endsAt" type="datetime-local" value={addForm.endsAt} onChange={handleAddChange} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addLoading}>{addLoading ? "Adding..." : "Add Coupon"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Coupon Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Coupon</DialogTitle>
              <DialogDescription>Update the coupon details below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditCoupon} className="space-y-4">
              <div>
                <Label htmlFor="edit_name">Name</Label>
                <Input id="edit_name" name="name" value={editForm.name} onChange={handleEditChange} required />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="edit_discountValue">Discount Value (%)</Label>
                  <Input id="edit_discountValue" name="discountValue" type="number" step="0.01" value={editForm.discountValue} onChange={handleEditChange} required />
                </div>
                <div className="flex-1">
                  <Label htmlFor="edit_maxDiscountValue">Max Discount</Label>
                  <Input id="edit_maxDiscountValue" name="maxDiscountValue" type="number" value={editForm.maxDiscountValue} onChange={handleEditChange} required />
                </div>
              </div>
              <div>
                <Label htmlFor="edit_scope">Scope</Label>
                <Input id="edit_scope" name="scope" value={editForm.scope} onChange={handleEditChange} required />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="edit_maxRedemptions">Max Redemptions</Label>
                  <Input id="edit_maxRedemptions" name="maxRedemptions" type="number" value={editForm.maxRedemptions} onChange={handleEditChange} required />
                </div>
                <div className="flex-1">
                  <Label htmlFor="edit_perUserLimit">Per User Limit</Label>
                  <Input id="edit_perUserLimit" name="perUserLimit" type="number" value={editForm.perUserLimit} onChange={handleEditChange} required />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input id="edit_isAutoApply" name="isAutoApply" type="checkbox" checked={editForm.isAutoApply} onChange={handleEditChange} />
                <Label htmlFor="edit_isAutoApply">Auto Apply</Label>
              </div>
              <div>
                <Label htmlFor="edit_startsAt">Starts At</Label>
                <Input id="edit_startsAt" name="startsAt" type="datetime-local" value={editForm.startsAt} onChange={handleEditChange} required />
              </div>
              <div>
                <Label htmlFor="edit_endsAt">Ends At</Label>
                <Input id="edit_endsAt" name="endsAt" type="datetime-local" value={editForm.endsAt} onChange={handleEditChange} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={editLoading}>{editLoading ? "Saving..." : "Save Changes"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
