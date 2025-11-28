import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api-service";

interface Coupon {
  id: number;
  name?: string;
  code?: string;
  discountType?: string;
  discountValue?: number;
  maxDiscountValue?: number;
  scope?: string;
  isAutoApply?: number;
  maxRedemptions?: number;
  perUserLimit?: number;
  startsAt?: string;
  endsAt?: string;
}

interface Redemption {
  id: number;
  user_id: number;
  wallet_id: number;
  wallet_shop_item_id: number;
  coupon?: Coupon | null;
  points_spent: number;
  redeemed_at?: string | null;
}

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100];

const mockItems: Redemption[] = Array.from({ length: 8 }).map((_, i) => ({
  id: i + 1,
  user_id: 100 + i,
  wallet_id: 1,
  wallet_shop_item_id: 1,
  coupon: {
    id: 11 + i,
    name: `mock_coupon_${i + 1}`,
    code: `CODE-${i + 1}`,
    discountType: i % 2 === 0 ? "percent" : "fixed",
    discountValue: i % 2 === 0 ? 5 : 10,
    maxDiscountValue: i % 2 === 0 ? 2 : 5,
    scope: "on_demand",
    isAutoApply: 0,
    maxRedemptions: 1,
    perUserLimit: 1,
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 86400000).toISOString(),
  },
  points_spent: (i + 1) * 100,
  redeemed_at: new Date().toISOString(),
}));

const ShopRedemptionPage: React.FC = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Redemption[]>(mockItems);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useMock, setUseMock] = useState(false);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number }>(
    { current_page: 1, last_page: 1, per_page: 15, total: 0 }
  );

  useEffect(() => {
    if (useMock) return;
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError("");
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        if (token) apiService.setAuthToken(token);
        const res = await apiService.get(`/admins/wallets/redemptions?page=${page}&per_Page=${perPage}`);
        const top: any = res ?? {};
        const itemsRaw: any[] = Array.isArray(top?.data) ? top.data : Array.isArray(top) ? top : [];
        const mapped: Redemption[] = itemsRaw.map((it: any) => ({
          id: Number(it.id),
          user_id: Number(it.user_id ?? it.userId ?? 0),
          wallet_id: Number(it.wallet_id ?? it.walletId ?? 0),
          wallet_shop_item_id: Number(it.wallet_shop_item_id ?? it.walletShopItemId ?? 0),
          coupon: it.coupon ? {
            id: Number(it.coupon.id ?? 0),
            name: String(it.coupon.name ?? it.coupon?.title ?? ""),
            code: String(it.coupon.code ?? ""),
            discountType: String(it.coupon.discountType ?? it.coupon.discount_type ?? ""),
            discountValue: Number(it.coupon.discountValue ?? it.coupon.discount_value ?? 0),
            maxDiscountValue: Number(it.coupon.maxDiscountValue ?? it.coupon.max_discount_value ?? 0),
            scope: String(it.coupon.scope ?? ""),
            isAutoApply: Number(it.coupon.isAutoApply ?? it.coupon.is_auto_apply ?? 0),
            maxRedemptions: Number(it.coupon.maxRedemptions ?? it.coupon.max_redemptions ?? 0),
            perUserLimit: Number(it.coupon.perUserLimit ?? it.coupon.per_user_limit ?? 0),
            startsAt: it.coupon.startsAt ?? it.coupon.starts_at ?? null,
            endsAt: it.coupon.endsAt ?? it.coupon.ends_at ?? null,
          } : null,
          points_spent: Number(it.points_spent ?? it.pointsSpent ?? 0),
          redeemed_at: it.redeemed_at ?? it.redeemedAt ?? null,
        }));

        setItems(mapped);
        const nextMeta = {
          current_page: Number(top.current_page ?? top.currentPage ?? page) || 1,
          last_page: Number(top.last_page ?? top.lastPage ?? 1) || 1,
          per_page: Number(top.per_page ?? top.perPage ?? perPage) || perPage,
          total: Number(top.total ?? mapped.length) || mapped.length,
        };
        setMeta(nextMeta);
      } catch (e: any) {
        setError(e?.message || "Failed to load shop redemptions; using mock.");
        setUseMock(true);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [page, perPage, useMock]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      String(i.id).includes(q) ||
      String(i.user_id).includes(q) ||
      String(i.wallet_id).includes(q) ||
      String(i.wallet_shop_item_id).includes(q) ||
      String(i.coupon?.name ?? "").toLowerCase().includes(q) ||
      String(i.coupon?.code ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const lastPageDisplay = useMock ? Math.max(1, Math.ceil(filtered.length / perPage)) : (meta.last_page || 1);
  const currentPageDisplay = useMock ? Math.min(page, lastPageDisplay) : page;
  const start = (currentPageDisplay - 1) * perPage;
  const pageItems = useMock ? filtered.slice(start, start + perPage) : filtered; // server paginates
  const totalDisplay = useMock ? filtered.length : (search ? filtered.length : meta.total);

  const refresh = () => {
    if (useMock) {
      toast({ title: "Refreshed", description: "Mock redemptions reloaded." });
    } else {
      setPage(p => p);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Shop Redemptions</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Shop Redemptions {useMock && <span className="text-xs text-muted-foreground">(mock)</span>}</CardTitle>
            <CardDescription>List of shop redemptions made by users using wallet points</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative w-full max-w-xs">
                <Input
                  placeholder="Search by id, user, wallet, or coupon..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>Per page:</span>
                <select
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={perPage}
                  onChange={(e) => { setPage(1); setPerPage(Number(e.target.value)); }}
                >
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Wallet Item</TableHead>
                    <TableHead>Coupon</TableHead>
                    <TableHead className="text-right">Points Spent</TableHead>
                    <TableHead>Redeemed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && pageItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm py-10">Loading...</TableCell>
                    </TableRow>
                  )}
                  {!loading && pageItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm py-10">No redemptions found.</TableCell>
                    </TableRow>
                  )}
                  {pageItems.map(it => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.id}</TableCell>
                      <TableCell>{it.user_id}</TableCell>
                      <TableCell>{it.wallet_id}</TableCell>
                      <TableCell>{it.wallet_shop_item_id}</TableCell>
                      <TableCell className="max-w-[280px] truncate">
                        {it.coupon ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{it.coupon.name || it.coupon.code}</span>
                            <span className="text-xs text-muted-foreground">{it.coupon.code}</span>
                            <div className="text-xs text-muted-foreground">
                              {it.coupon.discountType ? `${it.coupon.discountType} ${it.coupon.discountValue ?? ""}` : ""}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">{Number.isFinite(it.points_spent) ? it.points_spent.toLocaleString() : 0}</TableCell>
                      <TableCell>
                        {it.redeemed_at ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{new Date(it.redeemed_at).toLocaleString()}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                {useMock ? (
                  <>Showing {totalDisplay === 0 ? 0 : start + 1} - {Math.min(start + perPage, totalDisplay)} of {totalDisplay}</>
                ) : search ? (
                  <>Filtered {pageItems.length} item(s) on this page (server total: {meta.total})</>
                ) : (
                  <>Showing {(page - 1) * perPage + 1} - {Math.min(page * perPage, meta.total)} of {meta.total}</>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPageDisplay <= 1} onClick={() => setPage(1)}>First</Button>
                <Button variant="outline" size="sm" disabled={currentPageDisplay <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
                <span className="px-2 py-1 text-sm">Page {currentPageDisplay} / {lastPageDisplay}</span>
                <Button variant="outline" size="sm" disabled={currentPageDisplay >= lastPageDisplay} onClick={() => setPage(p => Math.min(lastPageDisplay, p + 1))}>Next</Button>
                <Button variant="outline" size="sm" disabled={currentPageDisplay >= lastPageDisplay} onClick={() => setPage(lastPageDisplay)}>Last</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShopRedemptionPage;
