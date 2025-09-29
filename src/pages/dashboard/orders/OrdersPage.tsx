"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MoreHorizontal, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from "@/components/ui/pagination";

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  product: {
    id: number;
    name: string;
    sku: string;
    description: string;
    price: number;
    quantity: number;
    images: string[];
  };
  addons: any[];
}

interface Order {
  id: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string;
  deliveryCoordination?: { latitude: number; longitude: number };
  orderItems: OrderItem[];
  userId: number;
}

const statusColors: Record<Order["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};


export default function OrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderedByName, setOrderedByName] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("auth_token") || "";
    apiService.setAuthToken(token);
    fetchOrders(currentPage);
  }, [currentPage]);

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.get(`/admins/orders?page=${page}`);
      setOrders(result.data);

      const { current_page, last_page, per_page, total } = result.meta || {};
      setCurrentPage(current_page || page);
      setLastPage(last_page || 1);
      setPerPage(per_page || 15);
      setTotal(total || result.data.length);

    } catch (error: any) {
      const friendly = "We couldn't load orders right now. Please try again.";
      const message = error?.message || "Unknown error";
      setError(message);
      toast({
        title: "Orders Load Failed",
        description: friendly,
        variant: "destructive",
        details: typeof error === 'object' ? (error?.stack || message) : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (orderId: number) => {
    try {
      setOrderedByName(null);
      const result = await apiService.get(`/admins/orders/${orderId}`);
      setSelectedOrder(result.data);
      setIsViewModalOpen(true);
      // Try to fetch user name if not present in order
      const userId = result.data.userId;
      if (userId && (!result.data.user || !result.data.user.name)) {
        try {
          const userResp = await apiService.get(`/admins/users/${userId}`);
          const userName = userResp?.data?.name || userResp?.data?.userFirstName || userResp?.data?.userLastName
            ? `${userResp?.data?.userFirstName || ''} ${userResp?.data?.userLastName || ''}`.trim()
            : null;
          setOrderedByName(userResp?.data?.name || userName || null);
        } catch (e) {
          setOrderedByName(null);
        }
      } else if (result.data.user && result.data.user.name) {
        setOrderedByName(result.data.user.name);
      }
    } catch (error: any) {
      const message = error?.message || 'Unknown error';
      toast({
        title: "Order Details Error",
        description: "Couldn't fetch order details.",
        variant: "destructive",
        details: error?.stack || message,
      });
    }
  };

  const changeOrderStatus = async (orderId: number, status: 'shipped' | 'delivered' | 'cancelled') => {
    try {
      const base = apiService.getBaseUrl();
      const token = apiService.getAuthToken() || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
      const resp = await fetch(`${base}/admins/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      });
      if (!resp.ok) {
        // Try to parse JSON error body first
        const bodyText = await resp.text();
        try {
          const json = bodyText ? JSON.parse(bodyText) : null;
          if (json && typeof json === 'object') {
            // If server provides a friendly `.error` field, show it directly to the user
            const userMsg = json.error || json.message || `HTTP ${resp.status}`;
            toast({
              title: 'Status Update Failed',
              description: userMsg,
              variant: 'destructive',
              details: JSON.stringify(json, null, 2),
            });
            return;
          }
        } catch (e) {
          // parsing failed, fall through to throw raw text below
        }

        // fallback: show raw text or status
        const txt = bodyText || `HTTP ${resp.status}`;
        throw new Error(txt);
      }
      // update local state
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      toast({ title: 'Success', description: `Order ${orderId} set to ${status}.` });
    } catch (err: any) {
      // If we threw a structured object with userMsg and json, handle that
      if (err && typeof err === 'object' && ('userMsg' in err || 'json' in err)) {
        const userMsg = err.userMsg || 'Could not update order status.';
        const json = err.json || err;
        toast({
          title: 'Status Update Failed',
          description: userMsg,
          variant: 'destructive',
          details: JSON.stringify(json, null, 2),
        });
        return;
      }

      const msg = err?.message || 'Failed to change order status';
      toast({
        title: 'Status Update Failed',
        description: 'Could not update order status.',
        variant: 'destructive',
        details: err?.stack || msg,
      });
    }
  };

  const filteredOrders = orders.filter((order) => {
    const statusMatch = statusFilter === "all" || order.status === statusFilter;
    const searchMatch =
      order.id.toString().includes(searchTerm) ||
      order.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  });

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <Button onClick={() => fetchOrders(currentPage)} variant="outline">
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
            <CardDescription>Manage and view all customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order ID or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                  <TableHead>Order ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Delivery Fee</TableHead>
                  <TableHead>Total</TableHead>
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
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-red-500">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.id}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status]}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.paymentStatus}</TableCell>
                      <TableCell>{order.orderItems?.length || 0}</TableCell>
                      <TableCell>${order.subtotal.toFixed(2)}</TableCell>
                      <TableCell>${order.deliveryFee.toFixed(2)}</TableCell>
                      <TableCell>${order.total.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => changeOrderStatus(order.id, 'shipped')}>Shipped</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => changeOrderStatus(order.id, 'delivered')}>Delivered</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => changeOrderStatus(order.id, 'cancelled')}>Cancelled</DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuItem
                              onClick={() => handleViewOrder(order.id)}
                            >
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>

                  {Array.from({ length: lastPage }, (_, i) => i + 1).map((pageNum) => (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        isActive={pageNum === currentPage}
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(pageNum);
                        }}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < lastPage) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage >= lastPage ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <div className="mt-2 text-xs text-muted-foreground text-center">
                {total > 0 ? (
                  <>Showing {(currentPage - 1) * perPage + 1} - {Math.min(currentPage * perPage, total)} of {total}</>
                ) : (
                  <>No results</>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Order Dialog */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Details for order #{selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>Status:</Label>
                <Badge className={statusColors[selectedOrder.status]}>
                  {selectedOrder.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>Payment Status:</Label>
                <span>{selectedOrder.paymentStatus}</span>
              </div>
              
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>Ordered By:</Label>
                <span>{orderedByName || selectedOrder.userId}</span>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>Subtotal:</Label>
                <span>${selectedOrder.subtotal.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>Delivery Fee:</Label>
                <span>${selectedOrder.deliveryFee.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>Total:</Label>
                <span>${selectedOrder.total.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Label>Delivery Address:</Label>
                <p className="text-sm text-gray-500">{selectedOrder.deliveryAddress}</p>
              </div>
              <div className="grid gap-2">
                <Label>Items:</Label>
                <div className="space-y-2">
                  {selectedOrder.orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{item.product.name}</span>
                      <span className="text-sm text-gray-500">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}