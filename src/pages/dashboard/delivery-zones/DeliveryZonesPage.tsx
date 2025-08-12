import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, MapPin, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeliveryZone {
  id: number;
  name: string;
  city: string;
  postal_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function DeliveryZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockZones: DeliveryZone[] = [
        {
          id: 1,
          name: "Downtown",
          city: "New York",
          postal_code: "10001",
          is_active: true,
          created_at: "2025-08-01T10:00:00Z",
          updated_at: "2025-08-01T10:00:00Z",
        },
        {
          id: 2,
          name: "Uptown",
          city: "New York",
          postal_code: "10002",
          is_active: false,
          created_at: "2025-08-02T11:00:00Z",
          updated_at: "2025-08-02T11:00:00Z",
        },
      ];
      setZones(mockZones);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch delivery zones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredZones = zones.filter(
    (zone) =>
      zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.postal_code.includes(searchTerm)
  );

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Delivery Zones</h2>
          <Button>
            <MapPin className="mr-2 h-4 w-4" /> Add Zone
          </Button>
        </div>

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
                  <TableHead>City</TableHead>
                  <TableHead>Postal Code</TableHead>
                  <TableHead>Status</TableHead>
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
                ) : filteredZones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No zones found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredZones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell>{zone.name}</TableCell>
                      <TableCell>{zone.city}</TableCell>
                      <TableCell>{zone.postal_code}</TableCell>
                      <TableCell>
                        <Badge className={zone.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
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
