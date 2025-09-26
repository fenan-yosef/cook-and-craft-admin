import { useState, useEffect } from "react";
// Leaflet imports for map rendering
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
// configure default marker icon URLs so markers appear
const markerIcon2x = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString();
const markerIcon = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString();
const markerShadow = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString();
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, MapPin, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import DeliveryZonesKmlMap from '@/components/geo/DeliveryZonesKmlMap';
import AddZoneMap from '@/components/geo/AddZoneMap';

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
  const [addMapPoints, setAddMapPoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [addMapResetCounter, setAddMapResetCounter] = useState(0);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  // Edit Zone modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", name: "", scope: "", locationsCsv: "", fee: "", is_enabled: false, daysCsv: "" });

  // View Zone modal state
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewData, setViewData] = useState<any | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewZoneId, setViewZoneId] = useState<number | null>(null);
  const [viewMapMessage, setViewMapMessage] = useState<string | null>(null);
  const [selectedZoneFeature, setSelectedZoneFeature] = useState<any | null>(null);
  const [showSelectedPanel, setShowSelectedPanel] = useState(false);

  // Add Delivery Day modal state
  const [isAddDayOpen, setIsAddDayOpen] = useState(false);
  const [addDayLoading, setAddDayLoading] = useState(false);
  const [addDayForm, setAddDayForm] = useState<{ dayOfWeek: string }>({ dayOfWeek: "" });

  // Add Time Slot modal state
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [addSlotLoading, setAddSlotLoading] = useState(false);
  const [addSlotForm, setAddSlotForm] = useState<{ startAt: string; endsAt: string; capacity: string }>({ startAt: "", endsAt: "", capacity: "" });
  const [currentDeliveryDay, setCurrentDeliveryDay] = useState<{ id: number; dayOfWeek?: number } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token") || "";
    apiService.setAuthToken(token);
    fetchZones();
  }, []);

  // Add modal map is now provided by AddZoneMap component (react-leaflet)

  // Initialize Leaflet map for View Zone when modal opens and data is available
  // NOTE: view map is now rendered via DeliveryZonesKmlMap component below (GeoJSON from KML)

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

  // Open View Zone modal and fetch full details from GET endpoint
  const openViewById = async (id: number) => {
    try {
      setIsViewOpen(true);
      setViewLoading(true);
      setViewError(null);
      setViewData(null);
      setViewZoneId(id);
      const resp = await apiService.get(`/admins/delivery-zones/${id}`);
      const data = (resp && typeof resp === 'object' && 'data' in resp) ? (resp as any).data : resp;
      setViewData(data);
    } catch (err: any) {
      const msg = err?.message || 'Failed to fetch delivery zone details';
      setViewError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setViewLoading(false);
    }
  };

  const refreshView = async () => {
    if (viewZoneId != null) {
      await openViewById(viewZoneId);
    }
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
                const locations = addMapPoints;
                if (!Array.isArray(locations) || locations.length < 4) {
                  toast({ title: 'Error', description: 'Please add at least 4 pins on the map.', variant: 'destructive' });
                  return;
                }
                const payload: any = {
                  name: addForm.name,
                  scope: addForm.scope,
                  geographical_location: locations,
                  fee: parseFloat(addForm.fee),
                  is_enabled: !!addForm.is_enabled,
                };
                await apiService.post('/admins/delivery-zones', payload);
                toast({ title: 'Success', description: 'Zone added.' });
                setIsAddOpen(false);
                fetchZones();
              } catch (err: any) {
                const res = err?.response?.data || err?.response;
                if (res?.message === 'Validation failed.' && res?.error) {
                  // Show only validation errors from backend (object of arrays)
                  const errorMessages = Object.values(res.error as any)
                    .flat()
                    .join(' ');
                  toast({ title: 'Validation Error', description: errorMessages, variant: 'destructive' });
                } else {
                  toast({ title: 'Error', description: err.message || 'Failed to add zone', variant: 'destructive' });
                }
              } finally { setAddLoading(false); }
            }} className="space-y-4">
              <div><Label htmlFor="name">Name</Label><Input id="name" name="name" value={addForm.name} onChange={e=>setAddForm(prev=>({...prev,name:e.target.value}))} required/></div>
              <div>
                <Label htmlFor="scope">Status</Label>
                <select id="scope" className="mt-2 w-full border rounded px-3 py-2" value={addForm.scope} onChange={e=>setAddForm(prev=>({...prev,scope:e.target.value}))} required>
                  <option value="" disabled>Select status</option>
                  <option value="on_demand">Market</option>
                  <option value="subscriptions">Subscriptions</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <Label>Locations</Label>
                <div className="mt-2 space-y-2">
                  <div className="h-64 rounded border overflow-hidden">
                    <AddZoneMap
                      resetCounter={addMapResetCounter}
                      isVisible={isAddOpen}
                      onPointsChange={(pts)=>setAddMapPoints(pts)}
                    />
                  </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">Click the map to add pins (min 4).</div>
                      <div className="flex items-center space-x-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsClearConfirmOpen(true)}>Clear pins</Button>
                      </div>
                    </div>
                    <Dialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
                      <DialogContent className="sm:max-w-[420px]">
                        <DialogHeader>
                          <DialogTitle>Clear all pins?</DialogTitle>
                          <DialogDescription>This will remove all pins you added on the map. This action cannot be undone.</DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-2 mt-4">
                          <Button variant="outline" onClick={() => setIsClearConfirmOpen(false)}>Cancel</Button>
                          <Button onClick={() => {
                            setAddMapResetCounter(c => c + 1);
                            setAddMapPoints([]);
                            setIsClearConfirmOpen(false);
                          }}>Clear</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  {addMapPoints.length > 0 && (
                    <div className="max-h-24 overflow-auto border rounded p-2 text-xs">
                      {addMapPoints.map((p, i) => (
                        <div key={i}>{p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div><Label htmlFor="fee">Fee</Label><Input id="fee" name="fee" type="number" value={addForm.fee} onChange={e=>setAddForm(prev=>({...prev,fee:e.target.value}))} required/></div>
              <div className="flex items-center gap-2"><input id="is_enabled" name="is_enabled" type="checkbox" checked={addForm.is_enabled} onChange={e=>setAddForm(prev=>({...prev,is_enabled:e.target.checked}))}/><Label htmlFor="is_enabled">Active</Label></div>
              <DialogFooter><Button variant="outline" onClick={()=>setIsAddOpen(false)}>Cancel</Button><Button type="submit" disabled={addLoading}>{addLoading?'Adding...':'Add'}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                      <TableCell className="cursor-pointer" onClick={() => openViewById(zone.id)}>{zone.name}</TableCell>
                      <TableCell className="cursor-pointer" onClick={() => openViewById(zone.id)}>{zone.scope}</TableCell>
                      <TableCell className="cursor-pointer" onClick={() => openViewById(zone.id)}>
                        {zone.locations.map((loc, idx) => (
                          <div key={idx} className="text-sm">
                            {loc.latitude}, {loc.longitude}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => openViewById(zone.id)}>SAR {zone.fee.toFixed(2)}</TableCell>
                      <TableCell className="cursor-pointer" onClick={() => openViewById(zone.id)}>
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
                            <DropdownMenuItem onClick={() => openViewById(zone.id)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
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

        {/* View Zone Modal */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>View Delivery Zone</DialogTitle>
              <DialogDescription>Full details</DialogDescription>
            </DialogHeader>
            {viewLoading ? (
              <div className="py-6">Loading details...</div>
            ) : viewError ? (
              <div className="text-red-600 py-4">{viewError}</div>
            ) : viewData ? (
              <div className="space-y-4">
                {/* Quick summary when common fields exist */}
                {(() => {
                  const name = (viewData as any).deliveryZoneName ?? (viewData as any).name;
                  const scope = (viewData as any).deliveryZoneScope ?? (viewData as any).scope;
                  const fee = (viewData as any).deliveryZoneFee ?? (viewData as any).fee;
                  const enabled = (viewData as any).isDeliveryZoneEnabled ?? (viewData as any).is_enabled;
                  const deliveryDays = (viewData as any).deliveryDays ?? (viewData as any).delivery_zone_days;
                  const locs = (viewData as any).deliveryZoneGeographicalLocation ?? (viewData as any).locations;
                  const dayNameFromNumber = (n: any) => {
                    const d = Number(n);
                    const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                    // Prefer ISO 1-7 (Mon-Sun). If 1..7 provided, map 1->Monday ... 7->Sunday
                    if (d >= 1 && d <= 7) {
                      const isoNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
                      return isoNames[d - 1];
                    }
                    // Fallback for 0..6 (Sun..Sat)
                    if (d >= 0 && d <= 6) return names[d];
                    return String(n);
                  };
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {name !== undefined && <div><span className="text-muted-foreground">Name:</span> {String(name)}</div>}
                      {scope !== undefined && <div><span className="text-muted-foreground">Scope:</span> {String(scope)}</div>}
                      {fee !== undefined && <div><span className="text-muted-foreground">Fee:</span> ${Number(fee).toFixed(2)}</div>}
                      {enabled !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Status:</span> {enabled ? 'Active' : 'Inactive'}
                        </div>
                      )}
                      {Array.isArray(locs) && (
                        <div className="sm:col-span-2 space-y-2">
                          <span className="text-muted-foreground">Locations:</span>
                          <div className="max-h-40 overflow-auto border rounded p-2">
                            {locs.map((l:any, i:number) => (
                              <div key={i} className="text-xs">{l.latitude}, {l.longitude}</div>
                            ))}
                          </div>
                          <div className="h-64 rounded border overflow-hidden relative">
                            <DeliveryZonesKmlMap kmlUrl={'/Sawani Zones.kml'} locations={(viewData as any)?.deliveryZoneGeographicalLocation || (viewData as any)?.locations || []} onSelect={(feat, msg) => {
                              setViewMapMessage(msg || null);
                              setSelectedZoneFeature(feat);
                              if (feat) {
                                setShowSelectedPanel(true);
                                // auto-hide after 6s
                                window.setTimeout(() => setShowSelectedPanel(false), 6000);
                              } else {
                                setShowSelectedPanel(false);
                              }
                            }} />
                            {showSelectedPanel && selectedZoneFeature && (
                              <div className="absolute right-2 top-2 w-64 bg-white shadow-lg border rounded p-3 z-50">
                                <div className="flex items-start justify-between">
                                  <div className="text-sm font-medium">Selected Zone</div>
                                  <Button size="sm" variant="ghost" onClick={() => setShowSelectedPanel(false)}>Close</Button>
                                </div>
                                <div className="mt-2 text-xs space-y-1">
                                  <div><span className="text-muted-foreground">Name:</span> {selectedZoneFeature.properties?.name || selectedZoneFeature.properties?.Name || '—'}</div>
                                  <div><span className="text-muted-foreground">Type:</span> {selectedZoneFeature.geometry?.type || '—'}</div>
                                  <div><span className="text-muted-foreground">Properties:</span></div>
                                  <div className="max-h-28 overflow-auto mt-1 text-xs border rounded p-1">
                                    {Object.entries(selectedZoneFeature.properties || {}).map(([k,v]) => (
                                      <div key={k} className="truncate"><strong>{k}:</strong> {String(v)}</div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          {viewMapMessage && (
                            <div className="text-sm mt-2">{viewMapMessage}</div>
                          )}
                        </div>
                      )}
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Delivery Days</span>
                          {viewZoneId != null && (
                            <Button size="sm" variant="secondary" onClick={() => setIsAddDayOpen(true)}>Add Delivery Day</Button>
                          )}
                        </div>
                        <div className="mt-1 space-y-2">
                          {Array.isArray(deliveryDays) && deliveryDays.length > 0 ? (
                            deliveryDays.map((d:any, i:number) => {
                              const dow = d?.dayOfWeek ?? d?.day_of_week ?? d?.day;
                              const slots = d?.deliveryTimeSlots ?? d?.delivery_time_slots ?? [];
                              return (
                                <div key={i} className="text-xs border rounded p-2">
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium">{dayNameFromNumber(dow)}</div>
                                    <Button size="sm" variant="outline" onClick={() => { setCurrentDeliveryDay({ id: d?.id, dayOfWeek: dow }); setIsAddSlotOpen(true); }}>Add Time Slot</Button>
                                  </div>
                                  {Array.isArray(slots) && slots.length > 0 ? (
                                    <ul className="ml-3 list-disc">
                                      {slots.map((t:any, j:number) => {
                                        const start = t?.startTime ?? t?.start_time ?? t?.startAt ?? t?.start_at ?? null;
                                        const end = t?.endTime ?? t?.end_time ?? t?.endsAt ?? t?.ends_at ?? null;
                                        const capacity = t?.capacity;
                                        return (
                                          <li key={j}>
                                            {start && end ? `${start} - ${end}` : 'All day'}
                                            {typeof capacity !== 'undefined' ? ` • Capacity: ${capacity}` : ''}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  ) : (
                                    <div className="ml-3 text-muted-foreground">No time slots</div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-xs text-muted-foreground">No delivery days yet.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="py-6">No details available.</div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Delivery Day Modal */}
        <Dialog open={isAddDayOpen} onOpenChange={(o)=>{ setIsAddDayOpen(o); if (!o) setAddDayForm({ dayOfWeek: "" }); }}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Add Delivery Day</DialogTitle>
              <DialogDescription>Select a day of week for this zone</DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e)=>{
              e.preventDefault();
              if (viewZoneId == null) return;
              try {
                setAddDayLoading(true);
                const dayNum = Number(addDayForm.dayOfWeek);
                const payload = { day_of_week: dayNum };
                await apiService.post(`/admins/delivery-zones/${viewZoneId}/delivery-days`, payload);
                toast({ title: 'Success', description: 'Delivery day added.' });
                setIsAddDayOpen(false);
                setAddDayForm({ dayOfWeek: "" });
                await refreshView();
              } catch (err:any) {
                const res = err?.response?.data || err?.response;
                if (res?.message === 'Validation failed.' && res?.error) {
                  const errorMessages = Object.values(res.error).flat().join(' ');
                  toast({ title: 'Validation Error', description: errorMessages, variant: 'destructive' });
                } else {
                  toast({ title: 'Error', description: err?.message || 'Failed to add delivery day', variant: 'destructive' });
                }
              } finally { setAddDayLoading(false); }
            }} className="space-y-4">
              <div>
                <Label htmlFor="dayOfWeek">Day of Week</Label>
                <select id="dayOfWeek" className="mt-2 w-full border rounded px-3 py-2" required value={addDayForm.dayOfWeek} onChange={(e)=>setAddDayForm({ dayOfWeek: e.target.value })}>
                  <option value="" disabled>Select day</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                  <option value="7">Sunday</option>
                </select>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={()=>setIsAddDayOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addDayLoading}>{addDayLoading ? 'Adding...' : 'Add Day'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Time Slot Modal */}
        <Dialog open={isAddSlotOpen} onOpenChange={(o)=>{ setIsAddSlotOpen(o); if (!o) { setAddSlotForm({ startAt: "", endsAt: "", capacity: "" }); setCurrentDeliveryDay(null);} }}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Add Time Slot</DialogTitle>
              <DialogDescription>Define time window and capacity</DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e)=>{
              e.preventDefault();
              if (!currentDeliveryDay?.id) return;
              try {
                setAddSlotLoading(true);
                const payload: any = {
                  start_time: addSlotForm.startAt,
                  end_time: addSlotForm.endsAt,
                  capacity: addSlotForm.capacity ? Number(addSlotForm.capacity) : undefined,
                };
                await apiService.post(`/admins/delivery-zones/delivery-days/${currentDeliveryDay.id}/delivery-time-slots`, payload);
                toast({ title: 'Success', description: 'Time slot added.' });
                setIsAddSlotOpen(false);
                setAddSlotForm({ startAt: "", endsAt: "", capacity: "" });
                setCurrentDeliveryDay(null);
                await refreshView();
              } catch (err:any) {
                const res = err?.response?.data || err?.response;
                if (res?.message === 'Validation failed.' && res?.error) {
                  const errorMessages = Object.values(res.error).flat().join(' ');
                  toast({ title: 'Validation Error', description: errorMessages, variant: 'destructive' });
                } else {
                  toast({ title: 'Error', description: err?.message || 'Failed to add time slot', variant: 'destructive' });
                }
              } finally { setAddSlotLoading(false); }
            }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startAt">Start Time</Label>
                  <Input id="startAt" type="time" required value={addSlotForm.startAt} onChange={(e)=>setAddSlotForm(prev=>({ ...prev, startAt: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="endsAt">End Time</Label>
                  <Input id="endsAt" type="time" required value={addSlotForm.endsAt} onChange={(e)=>setAddSlotForm(prev=>({ ...prev, endsAt: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input id="capacity" type="number" min="0" value={addSlotForm.capacity} onChange={(e)=>setAddSlotForm(prev=>({ ...prev, capacity: e.target.value }))} required />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={()=>setIsAddSlotOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addSlotLoading}>{addSlotLoading ? 'Adding...' : 'Add Slot'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
