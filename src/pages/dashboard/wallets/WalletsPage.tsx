import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api-service";

// API shape for /admins/wallet-shop-items
interface WalletType {
	id: number;
	code: string;
	name: string;
	description?: string | null;
	logo: any[];
}

interface WalletShopItem {
	id: number;
	balance: number;
	expires_at: string | null;
	wallet_type: WalletType;
}

// Temporary mock data (fallback) matching new shape
const mockWallets: WalletShopItem[] = Array.from({ length: 15 }).map((_, i) => ({
  id: i + 1,
  balance: Math.round(Math.random() * 5000),
  expires_at: i % 5 === 0 ? new Date(Date.now() - i * 86400000).toISOString() : null,
  wallet_type: {
	id: 100 + i,
	code: `CODE${i + 1}`,
	name: i % 3 === 0 ? "Points" : i % 3 === 1 ? "Credits" : "Vouchers",
	description: i % 2 === 0 ? "Sample wallet type for testing." : null,
	logo: [],
  },
}));

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100];

const WalletsPage: React.FC = () => {
	const { toast } = useToast();
		const [wallets, setWallets] = useState<WalletShopItem[]>(mockWallets);
	const [search, setSearch] = useState("");
		const [page, setPage] = useState(1);
		const [perPage, setPerPage] = useState(15);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
		const [useMock, setUseMock] = useState(false); // default to real endpoint, fallback to mock on error
		const [meta, setMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number }>(
			{ current_page: 1, last_page: 1, per_page: 15, total: 0 }
		);

		// Fetch wallet shop items
		useEffect(() => {
			if (useMock) return; // skip fetch when using mock
			const controller = new AbortController();
			(async () => {
				try {
					setLoading(true);
					setError("");
					const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
					if (token) apiService.setAuthToken(token);
					const res = await apiService.get(`/admins/wallet-shop-items?page=${page}&per_Page=${perPage}`);

					// Normalize common shapes
					const top: any = res ?? {};
					const items: any[] = Array.isArray(top?.data) ? top.data : Array.isArray(top) ? top : [];
					const mapped: WalletShopItem[] = items.map((it: any) => ({
						id: Number(it.id),
						balance: Number(it.balance ?? 0),
						expires_at: it.expires_at ?? null,
						wallet_type: {
							id: Number(it.wallet_type?.id ?? it.walletType?.id ?? 0),
							code: String(it.wallet_type?.code ?? it.walletType?.code ?? ""),
							name: String(it.wallet_type?.name ?? it.walletType?.name ?? ""),
							description: it.wallet_type?.description ?? it.walletType?.description ?? null,
							logo: Array.isArray(it.wallet_type?.logo ?? it.walletType?.logo) ? (it.wallet_type?.logo ?? it.walletType?.logo) : [],
						},
					}));
					setWallets(mapped);

					const nextMeta = {
						current_page: Number(top.current_page ?? top.currentPage ?? page) || 1,
						last_page: Number(top.last_page ?? top.lastPage ?? 1) || 1,
						per_page: Number(top.per_page ?? top.perPage ?? perPage) || perPage,
						total: Number(top.total ?? mapped.length) || 0,
					};
					setMeta(nextMeta);
				} catch (e: any) {
					setError(e?.message || "Failed to load wallet shop items; using mock data.");
					setUseMock(true);
				} finally {
					setLoading(false);
				}
			})();
			return () => controller.abort();
		}, [page, perPage, useMock]);

		const filtered = useMemo(() => {
			const q = search.trim().toLowerCase();
			if (!q) return wallets;
			return wallets.filter(w =>
				w.wallet_type?.name?.toLowerCase().includes(q) ||
				w.wallet_type?.code?.toLowerCase().includes(q) ||
				String(w.id).includes(q)
			);
		}, [wallets, search]);

		const lastPageDisplay = useMock ? Math.max(1, Math.ceil(filtered.length / perPage)) : (meta.last_page || 1);
		const currentPageDisplay = useMock ? Math.min(page, lastPageDisplay) : page;
		const start = (currentPageDisplay - 1) * perPage;
		const pageItems = useMock ? filtered.slice(start, start + perPage) : filtered; // server already paginates
		const totalDisplay = useMock ? filtered.length : (search ? filtered.length : meta.total);

		const refresh = () => {
			if (useMock) {
				toast({ title: "Refreshed", description: "Mock wallets reloaded." });
			} else {
				// trigger effect by toggling page state to same value
				setPage(p => p);
			}
		};

	return (
		<div className="flex flex-col">
			<div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
				<div className="flex items-center justify-between">
					<h2 className="text-3xl font-bold tracking-tight">Wallets</h2>
					<div className="flex gap-2">
						<Button variant="outline" onClick={refresh} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Wallet Shop Items {useMock && <span className="text-xs text-muted-foreground">(mock)</span>}</CardTitle>
						<CardDescription>Manage wallet item balances and types</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap items-center gap-3 mb-4">
							<div className="relative w-full max-w-xs">
								<Input
									placeholder="Search by type, code, or User..."
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
										{/* <TableHead>Type</TableHead> */}
										<TableHead>Code</TableHead>
										<TableHead >User</TableHead>
										<TableHead className="text-right">Points Balance</TableHead>
										<TableHead className="text-left">Cash Balance</TableHead>
										<TableHead>Description</TableHead>
										<TableHead className="text-right">Logos</TableHead>
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
											<TableCell colSpan={7} className="text-center text-sm py-10">No items found.</TableCell>
										</TableRow>
									)}
									{pageItems.map(w => (
										<TableRow key={w.id}>
											<TableCell className="font-medium">{w.wallet_type?.name || "-"}</TableCell>
											<TableCell>{w.wallet_type?.code || "-"}</TableCell>
											<TableCell className="text-right font-mono">{Number.isFinite(w.balance) ? w.balance.toLocaleString() : "0"}</TableCell>
											<TableCell>
											  {w.expires_at ? (
												<div className="flex items-center gap-2">
												  <span className="text-xs text-muted-foreground">{new Date(w.expires_at).toLocaleDateString()}</span>
												  {new Date(w.expires_at).getTime() < Date.now() ? (
													<Badge variant="destructive">Expired</Badge>
												  ) : (
													<Badge variant="outline">Active</Badge>
												  )}
												</div>
											  ) : (
												<span className="text-xs text-muted-foreground">—</span>
											  )}
											</TableCell>
											<TableCell className="max-w-[280px] truncate" title={w.wallet_type?.description || undefined}>
											  {w.wallet_type?.description ? String(w.wallet_type.description) : "—"}
											</TableCell>
											<TableCell className="text-right">{Array.isArray(w.wallet_type?.logo) ? w.wallet_type.logo.length : 0}</TableCell>
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

export default WalletsPage;
