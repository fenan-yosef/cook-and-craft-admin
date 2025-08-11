"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MoreHorizontal, Plus, Edit, Trash2, Percent, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Coupon {
  id: number
  code: string
  type: "percentage" | "fixed"
  value: number
  min_amount?: number
  max_uses?: number
  used_count: number
  expires_at?: string
  is_active: boolean
  created_at: string
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    type: "percentage" as "percentage" | "fixed",
    value: 0,
    min_amount: "",
    max_uses: "",
    expires_at: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      // Mock data for demonstration
      const mockCoupons: Coupon[] = [
        {
          id: 1,
          code: "WELCOME10",
          type: "percentage",
          value: 10,
          min_amount: 50,
          max_uses: 100,
          used_count: 23,
          expires_at: "2024-12-31T23:59:59Z",
          is_active: true,
          created_at: "2024-01-15T10:30:00Z",
        },
        {
          id: 2,
          code: "SAVE20",
          type: "fixed",
          value: 20,
          min_amount: 100,
          max_uses: 50,
          used_count: 45,
          expires_at: "2024-06-30T23:59:59Z",
          is_active: true,
          created_at: "2024-01-10T09:15:00Z",
        },
        {
          id: 3,
          code: "EXPIRED5",
          type: "percentage",
          value: 5,
          max_uses: 200,
          used_count: 156,
          expires_at: "2024-01-01T23:59:59Z",
          is_active: false,
          created_at: "2023-12-01T12:00:00Z",
        },
      ]
      setCoupons(mockCoupons)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch coupons",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createCoupon = async () => {
    try {
      const couponData = {
        ...newCoupon,
        min_amount: newCoupon.min_amount ? Number.parseFloat(newCoupon.min_amount) : undefined,
        max_uses: newCoupon.max_uses ? Number.parseInt(newCoupon.max_uses) : undefined,
        expires_at: newCoupon.expires_at || undefined,
      }

      // In real app: await apiService.post("/coupons", couponData)
      const mockNewCoupon: Coupon = {
        id: Date.now(),
        ...couponData,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      }

      setCoupons([mockNewCoupon, ...coupons])
      setIsCreateDialogOpen(false)
      setNewCoupon({
        code: "",
        type: "percentage",
        value: 0,
        min_amount: "",
        max_uses: "",
        expires_at: "",
      })

      toast({
        title: "Success",
        description: "Coupon created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create coupon",
        variant: "destructive",
      })
    }
  }

  const deleteCoupon = async (couponId: number) => {
    try {
      // In real app: await apiService.delete(`/coupons/${couponId}`)
      setCoupons(coupons.filter((coupon) => coupon.id !== couponId))
      toast({
        title: "Success",
        description: "Coupon deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete coupon",
        variant: "destructive",
      })
    }
  }

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const filteredCoupons = coupons.filter((coupon) => coupon.code.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Coupons</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Coupon</DialogTitle>
                <DialogDescription>Create a new discount coupon for your customers.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="code" className="text-right">
                    Code
                  </Label>
                  <Input
                    id="code"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    className="col-span-3"
                    placeholder="SAVE10"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    Type
                  </Label>
                  <Select
                    value={newCoupon.type}
                    onValueChange={(value: "percentage" | "fixed") => setNewCoupon({ ...newCoupon, type: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="value" className="text-right">
                    Value
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    value={newCoupon.value}
                    onChange={(e) => setNewCoupon({ ...newCoupon, value: Number.parseFloat(e.target.value) || 0 })}
                    className="col-span-3"
                    placeholder={newCoupon.type === "percentage" ? "10" : "20.00"}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="min_amount" className="text-right">
                    Min Amount
                  </Label>
                  <Input
                    id="min_amount"
                    type="number"
                    value={newCoupon.min_amount}
                    onChange={(e) => setNewCoupon({ ...newCoupon, min_amount: e.target.value })}
                    className="col-span-3"
                    placeholder="50.00"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="max_uses" className="text-right">
                    Max Uses
                  </Label>
                  <Input
                    id="max_uses"
                    type="number"
                    value={newCoupon.max_uses}
                    onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })}
                    className="col-span-3"
                    placeholder="100"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expires_at" className="text-right">
                    Expires At
                  </Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={newCoupon.expires_at}
                    onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={createCoupon}>
                  Create Coupon
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Coupons</CardTitle>
            <CardDescription>Manage discount coupons and promotional codes</CardDescription>
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
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Min Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredCoupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No coupons found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCoupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-medium font-mono">{coupon.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {coupon.type === "percentage" ? (
                            <Percent className="mr-1 h-4 w-4" />
                          ) : (
                            <DollarSign className="mr-1 h-4 w-4" />
                          )}
                          {coupon.type}
                        </div>
                      </TableCell>
                      <TableCell>
                        {coupon.type === "percentage" ? `${coupon.value}%` : `$${coupon.value.toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        {coupon.used_count}
                        {coupon.max_uses && ` / ${coupon.max_uses}`}
                      </TableCell>
                      <TableCell>{coupon.min_amount ? `$${coupon.min_amount.toFixed(2)}` : "No minimum"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            !coupon.is_active || isExpired(coupon.expires_at)
                              ? "destructive"
                              : coupon.max_uses && coupon.used_count >= coupon.max_uses
                                ? "secondary"
                                : "default"
                          }
                        >
                          {!coupon.is_active
                            ? "Inactive"
                            : isExpired(coupon.expires_at)
                              ? "Expired"
                              : coupon.max_uses && coupon.used_count >= coupon.max_uses
                                ? "Used Up"
                                : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : "No expiry"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => deleteCoupon(coupon.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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
      </div>
    </div>
  )
}
