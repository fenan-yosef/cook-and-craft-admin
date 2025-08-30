import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MoreHorizontal, Eye, XCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api-service";

interface Order {
  id: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string;
  deliveryCoordination?: { latitude: number; longitude: number };
  itemsCount: number;
}

const statusColors: Record<Order["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  // Fixed page for now; pagination controls can be added later
  const page = 1;
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Ensure auth token on apiService (prefer auth_loken, fallback to auth_token)
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("auth_loken") ?? localStorage.getItem("auth_token"))
        : null;
      if (token) apiService.setAuthToken(token);

      // Fetch orders with pagination
      const response = await apiService.get(`/orders?page=${page}`);
      const payload = response ?? {};
      // Normalize array from common wrappers
      const candidates = [payload, payload?.data, payload?.data?.data, payload?.result, payload?.results, payload?.orders, payload?.list];
      let apiOrders: any[] = [];
      for (const layer of candidates) {
        if (!layer) continue;
        if (Array.isArray(layer)) { apiOrders = layer; break; }
        if (Array.isArray((layer as any).data)) { apiOrders = (layer as any).data; break; }
      }
      const mapped: Order[] = apiOrders.map((o: any) => ({
        id: Number(o.id),
        status: o.status,
        paymentStatus: o.paymentStatus,
        subtotal: Number(o.subtotal ?? 0),
        deliveryFee: Number(o.deliveryFee ?? 0),
        total: Number(o.total ?? 0),
        deliveryAddress: String(o.deliveryAddress ?? ""),
        deliveryCoordination: o.deliveryCoordination,
        itemsCount: Array.isArray(o.orderItems) ? o.orderItems.length : 0,
      }));
      // If no API orders, fall back to mock orders so the UI has data
      setOrders(mapped.length > 0 ? mapped : getMockOrders());
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Local fallback orders when API returns none
  const getMockOrders = (): Order[] => [
    {
      id: 1011,
      status: "pending",
      paymentStatus: "unpaid",
      subtotal: 42.5,
      deliveryFee: 5,
      total: 47.5,
      deliveryAddress: "221B Baker Street, London",
      deliveryCoordination: { latitude: 51.5237, longitude: -0.1585 },
      itemsCount: 3,
    },
    {
      id: 1012,
      status: "processing",
      paymentStatus: "paid",
      subtotal: 89.99,
      deliveryFee: 0,
      total: 89.99,
      deliveryAddress: "742 Evergreen Terrace, Springfield",
      deliveryCoordination: { latitude: 39.7817, longitude: -89.6501 },
      itemsCount: 5,
    },
    {
      id: 1013,
      status: "shipped",
      paymentStatus: "paid",
      subtotal: 120,
      deliveryFee: 10,
      total: 130,
      deliveryAddress: "1600 Amphitheatre Parkway, Mountain View, CA",
      deliveryCoordination: { latitude: 37.422, longitude: -122.084 },
      itemsCount: 2,
    },
    {
      id: 1014,
      status: "delivered",
      paymentStatus: "paid",
      subtotal: 12,
      deliveryFee: 2,
      total: 14,
      deliveryAddress: "1 Hacker Way, Menlo Park, CA",
      deliveryCoordination: { latitude: 37.4847, longitude: -122.1484 },
      itemsCount: 1,
    },
  ];

  // Approve an order: move from pending -> processing (local UI update)
  const handleApprove = (orderId: number) => {
    setOrders((prev) => {
      const updated = prev.map((o) =>
  o.id === orderId && o.status === "pending" ? { ...o, status: "processing" as Order["status"] } : o
      );
      return updated;
    });
    toast({ title: "Order approved", description: `Order #${orderId} is now processing.` });
  };

  const filteredOrders = orders
    .filter((order) => (statusFilter === "all" ? true : order.status === statusFilter))
    .filter((order) => {
      const q = searchTerm.toLowerCase();
      return (
        String(order.id).includes(q) ||
        (order.deliveryAddress ?? "").toLowerCase().includes(q) ||
        (order.paymentStatus ?? "").toLowerCase().includes(q)
      );
    });

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
            <CardDescription>Manage customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium">Order #{order.id}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[240px]">
                          {order.deliveryAddress || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${statusColors[order.status]} hover:bg-opacity-80`}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{order.paymentStatus}</Badge>
                      </TableCell>
                      <TableCell>${order.total.toFixed(2)}</TableCell>
                      <TableCell>{order.itemsCount}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={order.status !== "pending"}
                              onClick={() => handleApprove(order.id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <XCircle className="mr-2 h-4 w-4" /> Cancel
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
