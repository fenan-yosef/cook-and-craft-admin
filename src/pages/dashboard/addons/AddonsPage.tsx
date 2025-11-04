import React, { useEffect, useState } from "react";
import { apiService } from "@/lib/api-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search } from "lucide-react";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

/**
 * Addons page
 * - Fetches addons from `/addons` using apiService base URL
 * - Uses Authorization: Bearer <auth_token> header (auth_token from localStorage) via apiService
 * - Renders table with basic pagination controls
 *
 * Notes:
 * - Tries both VITE_ and REACT_APP_ env styles for base URL.
 * - API response is expected to match the structure provided in the prompt.
 */

// Base URL comes from apiService; no local env lookup needed

const formatCurrency = (value: number | string | null | undefined): string => {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value ?? "");
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency: "SAR" }).format(n);
    } catch {
        return n.toFixed(2);
    }
};

interface Addon {
    addonId?: number;
    id?: number;
    addonName?: string;
    addonDescription?: string;
    addonPrice?: number | string;
    isAddonActive?: number | boolean;
    addonImages?: string[];
    name?: string;
}

interface Pagination {
    current_page: number;
    nextPage: number | null;
    last_page: number;
    per_page: number;
    total: number;
}

const AddonsPage: React.FC = () => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("auth_token") : null;

    const [addons, setAddons] = useState<Addon[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [fatalError, setFatalError] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);
    const [pagination, setPagination] = useState<Pagination>({
        current_page: 1,
        nextPage: null,
        last_page: 1,
        per_page: 10,
        total: 0,
    });

    const canPaginate = Number(pagination?.last_page || 1) > 1;

    const fetchAddons = async (_signal: AbortSignal) => {
        if (!token) {
            setFatalError("Missing auth token. Please sign in.");
            return;
        }

        setLoading(true);
        setFatalError("");

        try {
            apiService.setAuthToken(token)
            // Send common paging aliases to be compatible across variants
            let json: any = await apiService.get(`/addons?page=${page}&per_page=${perPage}&perPage=${perPage}&limit=${perPage}&page_size=${perPage}&pageSize=${perPage}`)

            // Find array of items across common API shapes
            let items: any[] = [];
            const candidates = [
                json,
                json?.data,
                json?.result,
                json?.results,
                json?.items,
                json?.records,
                json?.addons,
            ];
            for (const c of candidates) {
                if (Array.isArray(c)) { items = c; break; }
                if (c && Array.isArray(c.data)) { items = c.data; break; }
            }

            // Normalize to our Addon shape
            const mapped: Addon[] = items.map((it: any): Addon => ({
                addonId: it.addonId ?? it.id,
                id: it.id,
                addonName: it.addonName ?? it.name ?? it.title,
                addonDescription: it.addonDescription ?? it.description ?? it.desc,
                addonPrice: it.addonPrice ?? it.price,
                isAddonActive: (it.isAddonActive ?? it.active ?? it.is_active) as any,
                addonImages: it.addonImages ?? it.images ?? it.imageUrls ?? it.image_urls ?? [],
                name: it.name,
            }));
            setAddons(mapped);

            // Extract pagination meta from multiple possible locations
            const metaSources = [json, json?.data, json?.error, json?.meta, json?.pagination];
            const meta: any = {};
            for (const src of metaSources) {
                if (!src) continue;
                if (meta.current_page == null)
                    meta.current_page = src.current_page ?? src.currentPage ?? src.page;
                if (meta.nextPage == null)
                    meta.nextPage = src.nextPage ?? src.next_page ?? null;
                if (meta.last_page == null)
                    meta.last_page = src.last_page ?? src.lastPage ?? src.total_pages ?? src.totalPages;
                if (meta.per_page == null)
                    meta.per_page = src.per_page ?? src.perPage ?? src.limit ?? src.page_size ?? src.pageSize;
                if (meta.total == null)
                    meta.total = src.total ?? src.totalItems ?? src.total_results ?? src.totalResults;
            }

            // Derive missing values if necessary
            if (meta.per_page == null) meta.per_page = perPage;
            if (meta.current_page == null) meta.current_page = page;
            if ((meta.last_page == null || isNaN(Number(meta.last_page))) && meta.total != null && meta.per_page != null) {
                const per = Number(meta.per_page) || perPage;
                const tot = Number(meta.total) || mapped.length;
                meta.last_page = Math.max(1, Math.ceil(tot / per));
            }
            if (meta.total == null) meta.total = mapped.length;

            const derived: Pagination = {
                current_page: Number(meta.current_page || 1),
                nextPage: meta.nextPage ?? null,
                last_page: Number(meta.last_page || 1),
                per_page: Number(meta.per_page || perPage),
                total: Number(meta.total || mapped.length),
            };
            setPagination(derived);
            // Sync UI perPage with server-confirmed per_page to reflect coercion or defaults
            if (Number(derived.per_page) !== Number(perPage)) {
                setPerPage(Number(derived.per_page));
            }
        } catch (err: any) {
            // Fallback: try minimal query using only page & limit
            try {
                const json: any = await apiService.get(`/addons?page=${page}&limit=${perPage}`)
                // Find array of items across common API shapes
                let items: any[] = [];
                const candidates = [
                    json,
                    json?.data,
                    json?.result,
                    json?.results,
                    json?.items,
                    json?.records,
                    json?.addons,
                ];
                for (const c of candidates) {
                    if (Array.isArray(c)) { items = c; break; }
                    if (c && Array.isArray(c.data)) { items = c.data; break; }
                }
                const mapped: Addon[] = items.map((it: any): Addon => ({
                    addonId: it.addonId ?? it.id,
                    id: it.id,
                    addonName: it.addonName ?? it.name ?? it.title,
                    addonDescription: it.addonDescription ?? it.description ?? it.desc,
                    addonPrice: it.addonPrice ?? it.price,
                    isAddonActive: (it.isAddonActive ?? it.active ?? it.is_active) as any,
                    addonImages: it.addonImages ?? it.images ?? it.imageUrls ?? it.image_urls ?? [],
                    name: it.name,
                }));
                setAddons(mapped);
                const metaSources = [json, json?.data, json?.error, json?.meta, json?.pagination];
                const meta: any = {};
                for (const src of metaSources) {
                    if (!src) continue;
                    if (meta.current_page == null)
                        meta.current_page = src.current_page ?? src.currentPage ?? src.page;
                    if (meta.nextPage == null)
                        meta.nextPage = src.nextPage ?? src.next_page ?? null;
                    if (meta.last_page == null)
                        meta.last_page = src.last_page ?? src.lastPage ?? src.total_pages ?? src.totalPages;
                    if (meta.per_page == null)
                        meta.per_page = src.per_page ?? src.perPage ?? src.limit ?? src.page_size ?? src.pageSize;
                    if (meta.total == null)
                        meta.total = src.total ?? src.totalItems ?? src.total_results ?? src.totalResults;
                }
                if (meta.per_page == null) meta.per_page = perPage;
                if (meta.current_page == null) meta.current_page = page;
                if ((meta.last_page == null || isNaN(Number(meta.last_page))) && meta.total != null && meta.per_page != null) {
                    const per = Number(meta.per_page) || perPage;
                    const tot = Number(meta.total) || mapped.length;
                    meta.last_page = Math.max(1, Math.ceil(tot / per));
                }
                if (meta.total == null) meta.total = mapped.length;
                const derived: Pagination = {
                    current_page: Number(meta.current_page || 1),
                    nextPage: meta.nextPage ?? null,
                    last_page: Number(meta.last_page || 1),
                    per_page: Number(meta.per_page || perPage),
                    total: Number(meta.total || mapped.length),
                };
                setPagination(derived);
                if (Number(derived.per_page) !== Number(perPage)) {
                    setPerPage(Number(derived.per_page));
                }
            } catch (e2: any) {
                setFatalError(err?.message || e2?.message || "Failed to load addons.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchAddons(controller.signal);
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, perPage]);

    const onRefresh = () => {
        const controller = new AbortController();
        fetchAddons(controller.signal);
    };

    const goPrev = () => setPage((p) => Math.max(1, p - 1));
    const goNext = () => setPage((p) => Math.min(Number(pagination.last_page || 1), p + 1));

    const filteredAddons = addons.filter((a) => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;
        const name = String(a.addonName ?? a.name ?? "").toLowerCase();
        const desc = String(a.addonDescription ?? "").toLowerCase();
        return name.includes(q) || desc.includes(q);
    });

    return (
        <div className="flex flex-col">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight">Addons</h2>
                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Per page</span>
                            <Select value={String(perPage)} onValueChange={(val) => { setPage(1); setPerPage(Number(val)); }}>
                                <SelectTrigger className="w-[90px]">
                                    <SelectValue placeholder={String(perPage)} />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 15, 25, 50, 100].map((n) => (
                                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={onRefresh} disabled={loading} variant="outline">
                            {loading ? "Loading..." : "Refresh"}
                        </Button>
                    </div>
                </div>

                {fatalError ? (
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{fatalError}</AlertDescription>
                    </Alert>
                ) : null}

                <Card>
                    <CardHeader>
                        <CardTitle>All Addons</CardTitle>
                        <CardDescription>Manage your add-on items</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search addons..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <div className="flex items-center gap-2 sm:hidden">
                                <span className="text-sm text-muted-foreground">Per page</span>
                                <Select value={String(perPage)} onValueChange={(val) => { setPage(1); setPerPage(Number(val)); }}>
                                    <SelectTrigger className="w-[90px]">
                                        <SelectValue placeholder={String(perPage)} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[10, 15, 25, 50, 100].map((n) => (
                                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Active</TableHead>
                                    <TableHead>Images</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && addons.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                                    </TableRow>
                                ) : filteredAddons.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center">No addons found</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAddons.map((a, idx) => (
                                        <TableRow key={a.addonId ?? a.id ?? a.addonName ?? a.name ?? idx}>
                                            <TableCell className="font-semibold">{a.addonName ?? a.name ?? ""}</TableCell>
                                            <TableCell className="max-w-[420px] truncate" title={String(a.addonDescription ?? "")}>
                                                {a.addonDescription ?? ""}
                                            </TableCell>
                                            <TableCell className="font-mono">{formatCurrency(a.addonPrice)}</TableCell>
                                            <TableCell>
                                                <Badge variant={(Number(a.isAddonActive) === 1 || a.isAddonActive === true) ? "default" : "secondary"}>
                                                    {(Number(a.isAddonActive) === 1 || a.isAddonActive === true) ? "Yes" : "No"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {Array.isArray(a.addonImages) && a.addonImages.length > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        {a.addonImages.slice(0, 3).map((img, i) => (
                                                            <img
                                                                key={String(img) + i}
                                                                src={img}
                                                                alt="addon"
                                                                className="w-8 h-8 object-cover rounded border"
                                                            />
                                                        ))}
                                                        {a.addonImages.length > 3 && (
                                                            <span className="text-xs text-muted-foreground">+{a.addonImages.length - 3} more</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">No Image</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        <div className="mt-4">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); if (page > 1 && canPaginate) goPrev(); }}
                                        />
                                    </PaginationItem>
                                    {(() => {
                                        const pages: number[] = []
                                        const current = Number(pagination.current_page || page)
                                        const last = Number(pagination.last_page || 1)
                                        const maxToShow = 5
                                        let start = Math.max(1, current - Math.floor(maxToShow / 2))
                                        let end = Math.min(last, start + maxToShow - 1)
                                        start = Math.max(1, Math.min(start, Math.max(1, end - maxToShow + 1)))
                                        for (let p = start; p <= end; p++) pages.push(p)
                                        return (
                                            <>
                                                {start > 1 && (
                                                    <>
                                                        <PaginationItem>
                                                            <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(1); }}>
                                                                1
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                        {start > 2 && (
                                                            <PaginationItem>
                                                                <PaginationEllipsis />
                                                            </PaginationItem>
                                                        )}
                                                    </>
                                                )}
                                                {pages.map((p) => (
                                                    <PaginationItem key={p}>
                                                        <PaginationLink
                                                            href="#"
                                                            isActive={p === current}
                                                            onClick={(e) => { e.preventDefault(); if (p !== current) setPage(p); }}
                                                        >
                                                            {p}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ))}
                                                {end < last && (
                                                    <>
                                                        {end < last - 1 && (
                                                            <PaginationItem>
                                                                <PaginationEllipsis />
                                                            </PaginationItem>
                                                        )}
                                                        <PaginationItem>
                                                            <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(last); }}>
                                                                {last}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    </>
                                                )}
                                            </>
                                        )
                                    })()}
                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); if (page < Number(pagination.last_page || 1) && canPaginate) goNext(); }}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                            <div className="mt-2 text-xs text-muted-foreground text-center">
                                Page {pagination.current_page} of {pagination.last_page} • Showing {addons.length} of {pagination.total} items
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AddonsPage;