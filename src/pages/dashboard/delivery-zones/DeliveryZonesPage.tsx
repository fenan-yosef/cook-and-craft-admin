import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, MapPin, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface DeliveryZone {
  id: number;
  name: string;
  scope: string;
  locations: { latitude: number; longitude: number }[];
  fee: number;
  is_enabled: boolean;
  days: string[];
}

export default function DeliveryZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Add Zone modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", scope: "", locationsCsv: "", fee: "", is_enabled: false, daysCsv: "" });
  // Edit Zone modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", name: "", scope: "", locationsCsv: "", fee: "", is_enabled: false, daysCsv: "" });

  useEffect(() => {
    const token = localStorage.getItem("auth_token") || "";
    apiService.setAuthToken(token);
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await apiService.get("/admins/delivery-zones");
      if (Array.isArray(response.data)) {
        const mapped = response.data.map((item: any) => ({
          id: item.deliveryZoneId,
          name: item.deliveryZoneName,
          scope: item.deliveryZoneScope,
          locations: item.deliveryZoneGeographicalLocation || [],
          fee: item.deliveryZoneFee,
          is_enabled: Boolean(item.isDeliveryZoneEnabled),
          days: item.deliveryZoneDays || [],
        }));
        setZones(mapped);
      } else {
        throw new Error(response.message || "Failed to fetch zones");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to fetch delivery zones", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredZones = (() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return zones;
    const single = term.length === 1;
    return zones.filter(zone => {
      const name = (zone.name || '').toLowerCase();
      const scope = (zone.scope || '').toLowerCase();
     if (single) {
        // Single letter: only match if code OR name starts with that letter
        return scope.startsWith(term) || name.startsWith(term);
      }
      // Multi-char term: broader matching
      if (scope.includes(term)) return true;
      if (name === term) return true;
      if (name.startsWith(term)) return true;
      if (term.length > 2 && name.includes(term)) return true;
      return false;
    });
  })();

  // Open Edit Zone modal
  const openEditModal = (zone: DeliveryZone) => {
    setEditForm({
      id: String(zone.id),
      name: zone.name,
      scope: zone.scope,
      locationsCsv: zone.locations.map(l=>`${l.latitude},${l.longitude}`).join('; '),
      fee: String(zone.fee),
      is_enabled: zone.is_enabled,
      daysCsv: zone.days.join(', '),
    });
    setIsEditOpen(true);
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Delivery Zones</h2>
          <Button onClick={() => setIsAddOpen(true)}>
            <MapPin className="mr-2 h-4 w-4" /> Add Zone
          </Button>
        </div>
        {/* Add Zone Modal */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add Delivery Zone</DialogTitle>
              <DialogDescription>Enter new zone details</DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setAddLoading(true);
              try {
                const locations = addForm.locationsCsv.split(';').map(s => {
                  const [lat, lng] = s.split(',').map(v => v.trim());
                  return { latitude: parseFloat(lat), longitude: parseFloat(lng) };
                });
                if (locations.length < 4) {
                  toast({ title: 'Error', description: 'Please enter at least 4 locations.', variant: 'destructive' });
                  setAddLoading(false);
                  return;
                }
                const days = addForm.daysCsv.split(',').map(d => d.trim());
                const payload = {
                  name: addForm.name,
                  scope: addForm.scope,
                  geographical_location: locations,
                  fee: parseFloat(addForm.fee),
                  is_enabled: addForm.is_enabled ? true : false,
                  days: days,
                };
                await apiService.post('/admins/delivery-zones', payload);
                toast({ title: 'Success', description: 'Zone added.' });
                setIsAddOpen(false);
                fetchZones();
              } catch (err: any) {
                const res = err?.response?.data || err?.response;
                if (res?.message === 'Validation failed.' && res?.error) {
                  // Show only validation errors from backend (object of arrays)
                  const errorMessages = Object.values(res.error)
                    .flat()
                    .join(' ');
                  toast({ title: 'Validation Error', description: errorMessages, variant: 'destructive' });
                } else {
                  toast({ title: 'Error', description: err.message || 'Failed to add zone', variant: 'destructive' });
                }
              } finally { setAddLoading(false); }
            }} className="space-y-4">
              <div><Label htmlFor="name">Name</Label><Input id="name" name="name" value={addForm.name} onChange={e=>setAddForm(prev=>({...prev,name:e.target.value}))} required/></div>
              <div><Label htmlFor="scope">Scope</Label><Input id="scope" name="scope" value={addForm.scope} onChange={e=>setAddForm(prev=>({...prev,scope:e.target.value}))} required/></div>
              <div><Label htmlFor="locationsCsv">Locations (lat,lng;...)</Label><Input id="locationsCsv" name="locationsCsv" value={addForm.locationsCsv} onChange={e=>setAddForm(prev=>({...prev,locationsCsv:e.target.value}))} placeholder="31.2304,121.4737; 30.0444,31.2357; 29.9765,31.1313; 29.9820,31.1325" required/></div>
              <div><Label htmlFor="fee">Fee</Label><Input id="fee" name="fee" type="number" value={addForm.fee} onChange={e=>setAddForm(prev=>({...prev,fee:e.target.value}))} required/></div>
              <div className="flex items-center gap-2"><input id="is_enabled" name="is_enabled" type="checkbox" checked={addForm.is_enabled} onChange={e=>setAddForm(prev=>({...prev,is_enabled:e.target.checked}))}/><Label htmlFor="is_enabled">Active</Label></div>
              <DialogFooter><Button variant="outline" onClick={()=>setIsAddOpen(false)}>Cancel</Button><Button type="submit" disabled={addLoading}>{addLoading?'Adding...':'Add'}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Zone Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Delivery Zone</DialogTitle>
              <DialogDescription>Update zone details</DialogDescription>
            </DialogHeader>
            <form onSubmit={async e => {
              e.preventDefault();
              setEditLoading(true);
              try {
                const locations = editForm.locationsCsv.split(';').map(s => {
                  const [lat, lng] = s.split(',').map(v => v.trim());
                  return { latitude: parseFloat(lat), longitude: parseFloat(lng) };
                });
                if (locations.length < 4) {
                  toast({ title: 'Error', description: 'Please enter at least 4 locations.', variant: 'destructive' });
                  setEditLoading(false);
                  return;
                }
                const days = editForm.daysCsv.split(',').map(d => d.trim());
                const payload = {
                  name: editForm.name,
                  scope: editForm.scope,
                  geographical_location: locations,
                  fee: parseFloat(editForm.fee),
                  is_enabled: editForm.is_enabled ? true : false,
                  days: days,
                };
                await apiService.patch(`/admins/delivery-zones/${editForm.id}`, payload);
                toast({ title: 'Success', description: 'Zone updated.' });
                setIsEditOpen(false);
                fetchZones();
              } catch (err: any) {
                const res = err?.response?.data || err?.response;
                if (res?.message === 'Validation failed.' && res?.error) {
                  // Show only validation errors from backend (object of arrays)
                  const errorMessages = Object.values(res.error)
                    .flat()
                    .join(' ');
                  toast({ title: 'Validation Error', description: errorMessages, variant: 'destructive' });
                } else {
                  toast({ title: 'Error', description: err.message || 'Failed to update zone', variant: 'destructive' });
                }
              } finally { setEditLoading(false); }
            }} className="space-y-4">
              <div><Label htmlFor="edit_name">Name</Label><Input id="edit_name" name="name" value={editForm.name} onChange={e=>setEditForm(prev=>({...prev,name:e.target.value}))} required/></div>
              <div><Label htmlFor="edit_scope">Scope</Label><Input id="edit_scope" name="scope" value={editForm.scope} onChange={e=>setEditForm(prev=>({...prev,scope:e.target.value}))} required/></div>
              <div><Label htmlFor="edit_locationsCsv">Locations (lat,lng;...)</Label><Input id="edit_locationsCsv" name="locationsCsv" value={editForm.locationsCsv} onChange={e=>setEditForm(prev=>({...prev,locationsCsv:e.target.value}))} required/></div>
              <div><Label htmlFor="edit_fee">Fee</Label><Input id="edit_fee" name="fee" type="number" value={editForm.fee} onChange={e=>setEditForm(prev=>({...prev,fee:e.target.value}))} required/></div>
              <div className="flex items-center gap-2"><input id="edit_is_enabled" name="is_enabled" type="checkbox" checked={editForm.is_enabled} onChange={e=>setEditForm(prev=>({...prev,is_enabled:e.target.checked}))}/><Label htmlFor="edit_is_enabled">Active</Label></div>
              <DialogFooter><Button variant="outline" onClick={()=>setIsEditOpen(false)}>Cancel</Button><Button type="submit" disabled={editLoading}>{editLoading?'Saving...':'Save'}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>All Zones</CardTitle>
            <CardDescription>Manage delivery zones</CardDescription>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  {/* <TableHead>Days</TableHead> */}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredZones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No zones found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredZones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell>{zone.name}</TableCell>
                      <TableCell>{zone.scope}</TableCell>
                      <TableCell>
                        {zone.locations.map((loc, idx) => (
                          <div key={idx} className="text-sm">
                            {loc.latitude}, {loc.longitude}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>${zone.fee.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={zone.is_enabled ? "default" : "destructive"}>
                          {zone.is_enabled ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      {/* <TableCell>{zone.days.join(", ") || "-"}</TableCell> */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(zone)}>
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
      </div>
    </div>
  );
}
