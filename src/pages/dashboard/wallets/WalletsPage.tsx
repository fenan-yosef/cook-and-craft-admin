import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api-service";

interface Wallet {
	id: number;
	userId: number;
	userName: string;
	balance: number;
	currency: string;
	status: "active" | "suspended" | "closed";
	updated_at: string;
	created_at: string;
	pending_withdrawals: number;
	total_deposits: number;
}

// Temporary mock data until endpoint is fixed
const mockWallets: Wallet[] = Array.from({ length: 42 }).map((_, i) => ({
	id: i + 1,
	userId: 1000 + i,
	userName: `User ${i + 1}`,
	balance: Math.round(Math.random() * 50000) / 100,
	currency: "USD",
	status: i % 13 === 0 ? "suspended" : i % 17 === 0 ? "closed" : "active",
	updated_at: new Date(Date.now() - i * 86400000).toISOString(),
	created_at: new Date(Date.now() - (i + 5) * 86400000).toISOString(),
	pending_withdrawals: Math.round(Math.random() * 10000) / 100,
	total_deposits: Math.round(Math.random() * 150000) / 100,
}));

const formatMoney = (amount: number, currency = "USD") => {
	try {
		return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
	} catch {
		return `${currency} ${amount.toFixed(2)}`;
	}
};

const statusVariant: Record<Wallet["status"], "default" | "secondary" | "destructive" | "outline"> = {
	active: "default",
	suspended: "destructive",
	closed: "secondary",
};

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100];

const WalletsPage: React.FC = () => {
	const { toast } = useToast();
	const [wallets, setWallets] = useState<Wallet[]>(mockWallets);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(15);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [useMock, setUseMock] = useState(true); // switch over once endpoint fixed

	// Placeholder for future real fetch
	useEffect(() => {
		if (useMock) return; // skip until backend fixed
		const controller = new AbortController();
		(async () => {
			try {
				setLoading(true);
				setError("");
				const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
				if (token) apiService.setAuthToken(token);
				const res = await apiService.get(`/wallets?page=${page}&per_page=${perPage}`);
				const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
				// Normalize if needed in future
				setWallets(list as Wallet[]);
			} catch (e: any) {
				setError(e?.message || "Failed to load wallets; using mock data.");
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
			w.userName.toLowerCase().includes(q) || String(w.userId).includes(q) || String(w.id).includes(q)
		);
	}, [wallets, search]);

	const total = filtered.length;
	const lastPage = Math.max(1, Math.ceil(total / perPage));
	const currentPage = Math.min(page, lastPage);
	const start = (currentPage - 1) * perPage;
	const pageItems = filtered.slice(start, start + perPage);

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
						<CardTitle>All Wallets {useMock && <span className="text-xs text-muted-foreground">(mock)</span>}</CardTitle>
						<CardDescription>Manage user wallet balances and statuses</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap items-center gap-3 mb-4">
							<div className="relative w-full max-w-xs">
								<Input
									placeholder="Search wallets..."
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
										<TableHead className="text-right">Balance</TableHead>
										<TableHead className="text-right">Pending Withdrawals</TableHead>
										<TableHead className="text-right">Total Deposits</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Updated</TableHead>
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
											<TableCell colSpan={7} className="text-center text-sm py-10">No wallets found.</TableCell>
										</TableRow>
									)}
									{pageItems.map(w => (
										<TableRow key={w.id}>
											<TableCell>{w.id}</TableCell>
											<TableCell>
												<div className="flex flex-col">
													<span className="font-medium">{w.userName}</span>
													<span className="text-xs text-muted-foreground">UID: {w.userId}</span>
												</div>
											</TableCell>
											<TableCell className="text-right font-mono">{formatMoney(w.balance, w.currency)}</TableCell>
											<TableCell className="text-right font-mono">{formatMoney(w.pending_withdrawals, w.currency)}</TableCell>
											<TableCell className="text-right font-mono">{formatMoney(w.total_deposits, w.currency)}</TableCell>
											<TableCell>
												<Badge variant={statusVariant[w.status]} className="capitalize">{w.status}</Badge>
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">{new Date(w.updated_at).toLocaleDateString()}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>

						<div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div className="text-xs text-muted-foreground">
								Showing {total === 0 ? 0 : start + 1} - {Math.min(start + perPage, total)} of {total}
							</div>
							<div className="flex gap-2">
								<Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(1)}>First</Button>
								<Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
								<span className="px-2 py-1 text-sm">Page {currentPage} / {lastPage}</span>
								<Button variant="outline" size="sm" disabled={currentPage >= lastPage} onClick={() => setPage(p => Math.min(lastPage, p + 1))}>Next</Button>
								<Button variant="outline" size="sm" disabled={currentPage >= lastPage} onClick={() => setPage(lastPage)}>Last</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default WalletsPage;
