import React, { useEffect, useState } from "react";
import { apiService } from "@/lib/api-service";

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
        return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
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
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(15);
    const [pagination, setPagination] = useState<Pagination>({
        current_page: 1,
        nextPage: null,
        last_page: 1,
        per_page: 15,
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
            const json: any = await apiService.get(`/addons?page=${page}&per_page=${perPage}`)

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
        } catch (err: any) {
            setFatalError(err?.message || "Failed to load addons.");
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

    const goFirst = () => setPage(1);
    const goPrev = () => setPage((p) => Math.max(1, p - 1));
    const goNext = () => setPage((p) => Math.min(Number(pagination.last_page || 1), p + 1));
    const goLast = () => setPage(Number(pagination.last_page || 1));

    return (
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <h2 style={{ margin: 0 }}>Addons</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>Per page</span>
                        <select
                            value={perPage}
                            onChange={(e) => {
                                setPage(1);
                                setPerPage(Number(e.target.value));
                            }}
                        >
                            {[10, 15, 25, 50, 100].map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button onClick={onRefresh} disabled={loading} title="Refresh">
                        {loading ? "Loading..." : "Refresh"}
                    </button>
                </div>
            </div>

            {fatalError ? (
                <div style={{ padding: "12px", border: "1px solid #f0a", background: "#ffeef3", color: "#a00" }}>{fatalError}</div>
            ) : null}

            <div style={{ border: "1px solid #ddd", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead style={{ background: "#f7f7f7" }}>
                            <tr>
                                <th style={th}>ID</th>
                                <th style={th}>Name</th>
                                <th style={th}>Description</th>
                                <th style={th}>Price</th>
                                <th style={th}>Active</th>
                                <th style={th}>Images</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && addons.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={tdCenter}>
                                        Loading...
                                    </td>
                                </tr>
                            ) : addons.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={tdCenter}>
                                        No addons found.
                                    </td>
                                </tr>
                            ) : (
                                addons.map((a, idx) => (
                                    <tr key={a.addonId ?? a.id ?? a.addonName ?? a.name ?? idx}>
                                        <td style={td}>{a.addonId ?? a.id ?? idx}</td>
                                        <td style={tdStrong}>{a.addonName ?? a.name ?? ""}</td>
                                        <td style={td}>{a.addonDescription ?? ""}</td>
                                        <td style={tdMono}>{formatCurrency(a.addonPrice)}</td>
                                        <td style={td}>{Number(a.isAddonActive) === 1 || a.isAddonActive === true ? "Yes" : "No"}</td>
                                        <td style={td}>
                                            {Array.isArray(a.addonImages) && a.addonImages.length > 0 ? (
                                                <div style={{ display: "flex", gap: 4 }}>
                                                    {a.addonImages.slice(0, 3).map((img, i) => (
                                                        <img
                                                            key={img + i}
                                                            src={img}
                                                            alt="addon"
                                                            style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, border: "1px solid #eee" }}
                                                        />
                                                    ))}
                                                    {a.addonImages.length > 3 && (
                                                        <span style={{ fontSize: 12, color: "#888" }}>+{a.addonImages.length - 3} more</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: "#aaa" }}>0</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px" }}>
                    <div style={{ color: "#666" }}>
                        Page {pagination.current_page} of {pagination.last_page} • Total {pagination.total}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={goFirst} disabled={!canPaginate || page <= 1}>
                            First
                        </button>
                        <button onClick={goPrev} disabled={!canPaginate || page <= 1}>
                            Prev
                        </button>
                        <button onClick={goNext} disabled={!canPaginate || page >= Number(pagination.last_page || 1)}>
                            Next
                        </button>
                        <button onClick={goLast} disabled={!canPaginate || page >= Number(pagination.last_page || 1)}>
                            Last
                        </button>
                    </div>
                </div>
            </div> 
        </div>
    );
};

const th: React.CSSProperties = {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #eaeaea",
    fontWeight: 600,
    fontSize: 14,
    color: "#333",
    whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
    padding: "10px 12px",
    borderBottom: "1px solid #f1f1f1",
    fontSize: 14,
    color: "#222",
    verticalAlign: "top",
};

const tdStrong: React.CSSProperties = { ...td, fontWeight: 600 };
const tdMono: React.CSSProperties = { ...td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" };
const tdCenter: React.CSSProperties = { ...td, textAlign: "center", color: "#666" };

export default AddonsPage;