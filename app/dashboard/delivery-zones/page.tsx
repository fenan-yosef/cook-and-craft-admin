"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
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
import { Textarea } from "@/components/ui/textarea"
import { Search, MoreHorizontal, Plus, Edit, Trash2, MapPin, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DeliveryZone {
  id: number
  name: string
  description: string
  delivery_fee: number
  min_order_amount: number
  estimated_delivery_time: string
  is_active: boolean
  coverage_areas: string[]
  created_at: string
}

export default function DeliveryZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newZone, setNewZone] = useState({
    name: "",
    description: "",
    delivery_fee: 0,
    min_order_amount: 0,
    estimated_delivery_time: "",
    coverage_areas: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchDeliveryZones()
  }, [])

  const fetchDeliveryZones = async () => {
    try {
      setLoading(true)
      // Mock data for demonstration
      const mockZones: DeliveryZone[] = [
        {
          id: 1,
          name: "Downtown",
          description: "Central business district and surrounding areas",
          delivery_fee: 5.99,
          min_order_amount: 25.0,
          estimated_delivery_time: "30-45 minutes",
          is_active: true,
          coverage_areas: ["Downtown", "Financial District", "City Center"],
          created_at: "2024-01-15T10:30:00Z",
        },
        {
          id: 2,
          name: "Suburbs North",
          description: "Northern suburban areas",
          delivery_fee: 8.99,
          min_order_amount: 35.0,
          estimated_delivery_time: "45-60 minutes",
          is_active: true,
          coverage_areas: ["North Hills", "Riverside", "Oak Park"],
          created_at: "2024-01-10T09:15:00Z",
        },
        {
          id: 3,
          name: "Express Zone",
          description: "Premium fast delivery zone",
          delivery_fee: 12.99,
          min_order_amount: 50.0,
          estimated_delivery_time: "15-30 minutes",
          is_active: true,
          coverage_areas: ["Premium District", "Business Park"],
          created_at: "2024-01-08T14:22:00Z",
        },
        {
          id: 4,
          name: "Remote Areas",
          description: "Outer city limits and remote locations",
          delivery_fee: 15.99,
          min_order_amount: 75.0,
          estimated_delivery_time: "60-90 minutes",
          is_active: false,
          coverage_areas: ["Outer City", "Rural Areas"],
          created_at: "2024-01-05T11:45:00Z",
        },
      ]
      setZones(mockZones)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch delivery zones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createDeliveryZone = async () => {
    try {
      const zoneData = {
        ...newZone,
        coverage_areas: newZone.coverage_areas
          .split(",")
          .map((area) => area.trim())
          .filter((area) => area),
      }

      // In real app: await apiService.post("/delivery-zones", zoneData)
      const mockNewZone: DeliveryZone = {
        id: Date.now(),
        ...zoneData,
        is_active: true,
        created_at: new Date().toISOString(),
      }

      setZones([mockNewZone, ...zones])
      setIsCreateDialogOpen(false)
      setNewZone({
        name: "",
        description: "",
        delivery_fee: 0,
        min_order_amount: 0,
        estimated_delivery_time: "",
        coverage_areas: "",
      })

      toast({
        title: "Success",
        description: "Delivery zone created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create delivery zone",
        variant: "destructive",
      })
    }
  }

  const toggleZoneStatus = async (zoneId: number) => {
    try {
      // In real app: await apiService.patch(`/delivery-zones/${zoneId}`, { is_active: !zone.is_active })
      setZones(zones.map((zone) => (zone.id === zoneId ? { ...zone, is_active: !zone.is_active } : zone)))
      toast({
        title: "Success",
        description: "Delivery zone status updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update delivery zone status",
        variant: "destructive",
      })
    }
  }

  const deleteZone = async (zoneId: number) => {
    try {
      // In real app: await apiService.delete(`/delivery-zones/${zoneId}`)
      setZones(zones.filter((zone) => zone.id !== zoneId))
      toast({
        title: "Success",
        description: "Delivery zone deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete delivery zone",
        variant: "destructive",
      })
    }
  }

  const filteredZones = zones.filter(
    (zone) =>
      zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.coverage_areas.some((area) => area.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Delivery Zones Management</h1>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Delivery Zones</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Zone
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Delivery Zone</DialogTitle>
                <DialogDescription>Define a new delivery zone with coverage areas and pricing.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newZone.name}
                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                    className="col-span-3"
                    placeholder="Downtown"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={newZone.description}
                    onChange={(e) => setNewZone({ ...newZone, description: e.target.value })}
                    className="col-span-3"
                    placeholder="Central business district..."
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="delivery_fee" className="text-right">
                    Delivery Fee
                  </Label>
                  <Input
                    id="delivery_fee"
                    type="number"
                    step="0.01"
                    value={newZone.delivery_fee}
                    onChange={(e) => setNewZone({ ...newZone, delivery_fee: Number.parseFloat(e.target.value) || 0 })}
                    className="col-span-3"
                    placeholder="5.99"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="min_order_amount" className="text-right">
                    Min Order
                  </Label>
                  <Input
                    id="min_order_amount"
                    type="number"
                    step="0.01"
                    value={newZone.min_order_amount}
                    onChange={(e) =>
                      setNewZone({ ...newZone, min_order_amount: Number.parseFloat(e.target.value) || 0 })
                    }
                    className="col-span-3"
                    placeholder="25.00"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="estimated_delivery_time" className="text-right">
                    Delivery Time
                  </Label>
                  <Input
                    id="estimated_delivery_time"
                    value={newZone.estimated_delivery_time}
                    onChange={(e) => setNewZone({ ...newZone, estimated_delivery_time: e.target.value })}
                    className="col-span-3"
                    placeholder="30-45 minutes"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="coverage_areas" className="text-right">
                    Coverage Areas
                  </Label>
                  <Textarea
                    id="coverage_areas"
                    value={newZone.coverage_areas}
                    onChange={(e) => setNewZone({ ...newZone, coverage_areas: e.target.value })}
                    className="col-span-3"
                    placeholder="Downtown, Financial District, City Center"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={createDeliveryZone}>
                  Create Zone
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Delivery Zones</CardTitle>
            <CardDescription>Manage delivery zones, coverage areas, and pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search zones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Delivery Fee</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Delivery Time</TableHead>
                  <TableHead>Coverage Areas</TableHead>
                  <TableHead>Status</TableHead>
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
                ) : filteredZones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No delivery zones found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredZones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4" />
                          {zone.name}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{zone.description}</TableCell>
                      <TableCell>${zone.delivery_fee.toFixed(2)}</TableCell>
                      <TableCell>${zone.min_order_amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          {zone.estimated_delivery_time}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {zone.coverage_areas.slice(0, 2).map((area, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                          {zone.coverage_areas.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{zone.coverage_areas.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={zone.is_active ? "default" : "secondary"}>
                          {zone.is_active ? "Active" : "Inactive"}
                        </Badge>
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
                            <DropdownMenuItem onClick={() => toggleZoneStatus(zone.id)}>
                              {zone.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => deleteZone(zone.id)}>
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
