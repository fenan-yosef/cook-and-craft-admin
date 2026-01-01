import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// dialog removed: actions are now inline
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Check, Loader2, RefreshCw, Search, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { apiService } from "@/lib/api-service"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

const UPDATED_FLASH_MS = 1500

type RecipeSuggestionImage = {
  id?: number
  url?: string
  isThumbnail?: boolean
}

type RecipeSuggestionMacros = {
  fats?: string | number
  carbs?: string | number
  proteins?: string | number
}

type RecipeSuggestionIngredient = {
  name?: string
  quantity?: string | number
}

type RecipeSuggestionStep = {
  description?: string
  time_minutes?: string | number
}

type RecipeSuggestion = {
  id?: number
  description?: string
  servings?: number
  calories?: number
  macros?: RecipeSuggestionMacros
  ingredients?: RecipeSuggestionIngredient[]
  steps?: RecipeSuggestionStep[]
  status?: string
  reviewed_by?: any
  reviewed_at?: string | null
  created_at?: string
  image?: RecipeSuggestionImage[]
  [key: string]: any
}

type SuggestionsResponse = {
  data?: any
  message?: string
  error?: any
  current_page?: number
  nextPage?: number | null
  last_page?: number
  per_page?: number
  total?: number
}

type SuggestionStatus = "pending" | "approved" | "rejected" | "unknown"

function normalizeStatus(v: any): SuggestionStatus {
  const s = typeof v === "string" ? v.trim().toLowerCase() : ""
  if (s === "pending" || s === "approved" || s === "rejected") return s
  return "unknown"
}

function statusBadgeVariant(s: SuggestionStatus): "secondary" | "default" | "destructive" | "outline" {
  if (s === "approved") return "default"
  if (s === "rejected") return "destructive"
  if (s === "pending") return "secondary"
  return "outline"
}

function normalizeListPayload(res: any): {
  items: RecipeSuggestion[]
  currentPage: number
  lastPage: number
  perPage: number
  total: number
} {
  const top: SuggestionsResponse = res ?? {}

  // primary shape from your example: { data: [], current_page, last_page, per_page, total }
  let items: any[] = []
  if (Array.isArray(top.data)) items = top.data
  else if (Array.isArray((top as any)?.data?.data)) items = (top as any).data.data
  else if (Array.isArray(res)) items = res

  const currentPage = Number(top.current_page ?? (top as any)?.data?.current_page ?? 1) || 1
  const lastPage = Number(top.last_page ?? (top as any)?.data?.last_page ?? 1) || 1
  const perPage = Number(top.per_page ?? (top as any)?.data?.per_page ?? items.length ?? 15) || 15
  const total = Number(top.total ?? (top as any)?.data?.total ?? items.length ?? 0) || 0

  return {
    items: (items || []).filter(Boolean),
    currentPage,
    lastPage,
    perPage,
    total,
  }
}

function getSuggestionId(s: RecipeSuggestion): string | null {
  const candidates = [
    s?.id,
    s?.suggestion_id,
    s?.Suggestion_ID,
    s?.recipe_suggestion_id,
  ]
  const found = candidates.find((v) => v !== null && typeof v !== "undefined" && String(v).trim() !== "")
  return found == null ? null : String(found)
}

function getSuggestionThumbnailUrl(s: RecipeSuggestion): string | null {
  const images = Array.isArray(s?.image) ? s.image : []
  const thumb = images.find((img) => Boolean(img?.isThumbnail) && typeof img?.url === "string" && img.url)
  if (thumb?.url) return thumb.url
  const first = images.find((img) => typeof img?.url === "string" && img.url)
  return first?.url || null
}

function formatMacros(m: RecipeSuggestionMacros | undefined): string {
  if (!m) return "—"
  const proteins = m?.proteins ?? "—"
  const carbs = m?.carbs ?? "—"
  const fats = m?.fats ?? "—"
  return `${proteins}P / ${carbs}C / ${fats}F`
}

function formatDate(v: any): string {
  if (!v) return ""
  const s = String(v)
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toLocaleString()
  return s
}

function suggestionSummary(s: RecipeSuggestion): string {
  const candidates = [
    s?.title,
    s?.name,
    s?.recipe_name,
    s?.recipeName,
    s?.suggestion,
    s?.text,
    s?.message,
    s?.description,
  ]
  const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0)
  if (found) return found.trim()

  // As a fallback, try to stringify a small subset
  try {
    return JSON.stringify(s)
  } catch {
    return ""
  }
}

export default function RecipeSuggestionsPage() {
  const { toast } = useToast()
  const { token } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<RecipeSuggestion[]>([])

  const [searchTerm, setSearchTerm] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [total, setTotal] = useState(0)

  // Update modal
  // selected removed; actions are inline
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingAction, setSavingAction] = useState<"approved" | "rejected" | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [selectedSuggestion, setSelectedSuggestion] = useState<RecipeSuggestion | null>(null)

  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkTotal, setBulkTotal] = useState(0)
  const [bulkDone, setBulkDone] = useState(0)
  const [bulkFailed, setBulkFailed] = useState(0)

  useEffect(() => {
    const t = token || (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null)
    apiService.setAuthToken(t || null)
  }, [token])

  const fetchSuggestions = async (page = currentPage, size = perPage) => {
    try {
      setLoading(true)
      setError(null)

      // Best-effort: backend validation rejects arbitrary per_page values.
      // Follow existing app pattern: only send `per_page` when size !== 15.
      const allowed = [15, 25, 50, 100]
      const sizeInt = Number(size) || 15
      const pageInt = Number(page) || 1
      const effectiveSize = allowed.includes(sizeInt) ? sizeInt : 15
      let endpoint = "/recipes/suggestions"
      if (effectiveSize === 15) {
        if (pageInt > 1) endpoint += `?page=${pageInt}`
      } else {
        endpoint += `?page=${pageInt}&per_page=${effectiveSize}`
      }
      const res = await apiService.get(endpoint)
      const normalized = normalizeListPayload(res)

      setItems(normalized.items)
      setCurrentPage(normalized.currentPage || page)
      setLastPage(normalized.lastPage || 1)
      setPerPage(normalized.perPage || size)
      setTotal(normalized.total)
    } catch (err: any) {
      const message = err?.message || "Failed to load recipe suggestions."
      setError(message)
      toast({
        title: "Load Failed",
        description: "We couldn't load recipe suggestions right now. Please try again.",
        variant: "destructive",
        details: typeof err === "object" ? (err?.stack || message) : String(err),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuggestions(currentPage, perPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, perPage])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const list = (!q)
      ? items
      : items.filter((s) => {
      const id = getSuggestionId(s) || ""
      const summary = suggestionSummary(s)
      const created = String(s?.created_at ?? s?.createdAt ?? s?.submitted_at ?? "")
      return (
        id.toLowerCase().includes(q) ||
        summary.toLowerCase().includes(q) ||
        created.toLowerCase().includes(q)
      )
    })

    // Keep pending items on top for faster review
    return [...list].sort((a, b) => {
      const as = normalizeStatus(a?.status)
      const bs = normalizeStatus(b?.status)
      const ap = as === "pending" ? 0 : 1
      const bp = bs === "pending" ? 0 : 1
      if (ap !== bp) return ap - bp
      const aid = Number(getSuggestionId(a) ?? 0)
      const bid = Number(getSuggestionId(b) ?? 0)
      if (Number.isFinite(aid) && Number.isFinite(bid)) return bid - aid
      return 0
    })
  }, [items, searchTerm])

  const visibleIds = useMemo(() => {
    return filtered
      .map((s) => getSuggestionId(s))
      .filter((id): id is string => Boolean(id))
  }, [filtered])

  const allVisibleSelected = useMemo(() => {
    if (visibleIds.length === 0) return false
    return visibleIds.every((id) => selectedIds.has(id))
  }, [selectedIds, visibleIds])

  const someVisibleSelected = useMemo(() => {
    return visibleIds.some((id) => selectedIds.has(id))
  }, [selectedIds, visibleIds])

  const patchSuggestionStatus = async (suggestionId: string, nextStatus: "approved" | "rejected") => {
    await apiService.patchJson(`/recipes/suggestions/${suggestionId}`, { status: nextStatus })
  }

  const setSuggestionStatus = async (s: RecipeSuggestion, nextStatus: string) => {
    const suggestionId = getSuggestionId(s)
    if (!suggestionId) {
      toast({ title: "Missing ID", description: "This suggestion has no id field.", variant: "destructive" })
      return
    }

    if (!["approved", "rejected"].includes(nextStatus)) {
      toast({ title: "Invalid status", description: "Status must be approved or rejected.", variant: "destructive" })
      return
    }

    try {
      setSavingId(suggestionId)
      setSavingAction(nextStatus as any)

      // Optimistic UI: update row immediately
      setItems((prev) =>
        prev.map((it) => (getSuggestionId(it) === suggestionId ? { ...it, status: nextStatus } : it))
      )

      await patchSuggestionStatus(suggestionId, nextStatus as any)
      toast({ title: "Updated", description: `Suggestion ${suggestionId} marked ${nextStatus}.` })
    } catch (err: any) {
      // Revert optimistic update (no refetch needed)
      setItems((prev) =>
        prev.map((it) => (getSuggestionId(it) === suggestionId ? { ...it, status: s?.status } : it))
      )
      toast({ title: "Update Failed", description: err?.message || "Failed to update suggestion.", variant: "destructive" })
    } finally {
      setSavingId(null)
      setSavingAction(null)
    }
  }

  const runBulkUpdate = async (nextStatus: "approved" | "rejected") => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setBulkRunning(true)
    setBulkTotal(ids.length)
    setBulkDone(0)
    setBulkFailed(0)

    // Optimistically set all selected rows
    setItems((prev) => prev.map((it) => {
      const id = getSuggestionId(it)
      return id && selectedIds.has(id) ? { ...it, status: nextStatus } : it
    }))

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]
        try {
        setSavingId(id)
        setSavingAction(nextStatus)
        await patchSuggestionStatus(id, nextStatus)
        toast({ title: "Updated", description: `Suggestion ${id} marked ${nextStatus}.` })
      } catch {
        setBulkFailed((f) => f + 1)
        // revert this one (set to unknown/pending by refetching item state from current list is not possible)
        // best-effort: mark as unknown to highlight
        setItems((prev) => prev.map((it) => (getSuggestionId(it) === id ? { ...it, status: "unknown" } : it)))
      } finally {
        setBulkDone((d) => d + 1)
      }
    }

    setSavingId(null)
    setSavingAction(null)
    setBulkRunning(false)
    // clear selection after bulk
    setSelectedIds(new Set())
  }

  

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Recipe Suggestions</h2>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Per page</span>
              <Select
                value={String(perPage)}
                onValueChange={(val) => {
                  setCurrentPage(1)
                  setPerPage(Number(val))
                }}
              >
                <SelectTrigger className="w-[90px]">
                  <SelectValue placeholder={String(perPage)} />
                </SelectTrigger>
                <SelectContent>
                  {[15, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => fetchSuggestions(currentPage, perPage)}
              disabled={loading}
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Suggestions</CardTitle>
            <CardDescription>Review and update user recipe suggestions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by id, text, date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {total ? `${total} total` : `${items.length} items`}
              </div>
            </div>

            {error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : null}

            <div
              aria-hidden={selectedIds.size === 0}
              className={`mb-3 rounded-md border overflow-hidden transition-all duration-300 ease-in-out ${
                selectedIds.size > 0 ? "p-3 max-h-96 opacity-100" : "p-0 max-h-0 opacity-0 pointer-events-none"
              }`}
            >
              <div className={`flex items-center justify-between gap-3 transform transition-all duration-250 ${selectedIds.size > 0 ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"}`}>
                <div className="text-sm">
                  <span className="font-medium">{selectedIds.size}</span> selected
                  {bulkRunning ? (
                    <span className="text-muted-foreground"> • Updating… {bulkDone}/{bulkTotal}</span>
                  ) : null}
                  {bulkFailed > 0 ? (
                    <span className="text-destructive"> • {bulkFailed} failed</span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={bulkRunning}
                    onClick={() => runBulkUpdate("approved")}
                    className="transform transition-all duration-150"
                  >
                    <Check className="h-4 w-4" />
                    Approve Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={bulkRunning}
                    onClick={() => runBulkUpdate("rejected")}
                    className="transform transition-all duration-150"
                  >
                    <X className="h-4 w-4" />
                    Reject Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkRunning}
                    onClick={() => setSelectedIds(new Set())}
                    className="transform transition-all duration-150"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {bulkRunning ? (
                <div className="mt-3 transition-all duration-200">
                  <Progress value={bulkTotal ? Math.round((bulkDone / bulkTotal) * 100) : 0} />
                </div>
              ) : null}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(checked) => {
                          const shouldSelect = Boolean(checked)
                          setSelectedIds((prev) => {
                            const next = new Set(prev)
                            if (shouldSelect) visibleIds.forEach((id) => next.add(id))
                            else visibleIds.forEach((id) => next.delete(id))
                            return next
                          })
                        }}
                        // show indeterminate state via data attribute
                        data-state={allVisibleSelected ? "checked" : someVisibleSelected ? "indeterminate" : "unchecked"}
                        aria-label="Select all visible"
                      />
                    </TableHead>
                    <TableHead className="w-[90px]">Image</TableHead>
                    <TableHead className="w-[110px]">ID</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[100px]">Servings</TableHead>
                    <TableHead className="w-[110px]">Calories</TableHead>
                    <TableHead className="w-[190px]">Macros</TableHead>
                    <TableHead className="w-[220px]">Created</TableHead>
                    <TableHead className="w-[140px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center">
                        No suggestions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((s) => {
                      const id = getSuggestionId(s)
                      const createdAt = s?.created_at ?? s?.createdAt ?? s?.submitted_at ?? s?.submittedAt
                      const thumb = getSuggestionThumbnailUrl(s)
                      const statusNorm = normalizeStatus(s?.status)
                      const statusLabel = statusNorm === "unknown"
                        ? (typeof s?.status === "string" && s.status.trim() ? s.status.trim() : "—")
                        : statusNorm
                      const servings = typeof s?.servings === "number" ? s.servings : s?.servings ?? "—"
                      const calories = typeof s?.calories === "number" ? s.calories : s?.calories ?? "—"
                      const isPending = statusNorm === "pending"
                      const isRowSaving = Boolean(id) && savingId === id
                      return (
                        <TableRow
                          key={id ?? JSON.stringify(s)}
                          className={`${isPending ? "bg-muted/40" : ""} transition-colors duration-200 ease-in-out ${selectedSuggestion ? "opacity-60" : ""}`}
                          onClick={(e) => {
                            const el = e.target as HTMLElement
                            if (el.closest("button") || el.closest("input") || el.closest("a")) return
                            setSelectedSuggestion(s)
                          }}
                        >
                          <TableCell>
                            <Checkbox
                              checked={id ? selectedIds.has(id) : false}
                              onCheckedChange={(checked) => {
                                if (!id) return
                                const shouldSelect = Boolean(checked)
                                setSelectedIds((prev) => {
                                  const next = new Set(prev)
                                  if (shouldSelect) next.add(id)
                                  else next.delete(id)
                                  return next
                                })
                              }}
                              aria-label={id ? `Select suggestion ${id}` : "Select suggestion"}
                            />
                          </TableCell>
                          <TableCell>
                            {thumb ? (
                              <img
                                src={thumb}
                                alt="Suggestion"
                                className="h-10 w-10 rounded object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{id ?? "—"}</TableCell>
                          <TableCell className="whitespace-normal break-words">
                            <div className="font-medium">{suggestionSummary(s)}</div>
                            <div className="text-xs text-muted-foreground">
                              Ingredients: {Array.isArray(s?.ingredients) ? s.ingredients.length : 0} • Steps: {Array.isArray(s?.steps) ? s.steps.length : 0}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="transition-colors duration-200" variant={statusBadgeVariant(statusNorm)}>
                              {statusLabel}
                            </Badge>
                          </TableCell>
                          <TableCell>{String(servings)}</TableCell>
                          <TableCell>{String(calories)}</TableCell>
                          <TableCell className="font-mono text-xs">{formatMacros(s?.macros)}</TableCell>
                          <TableCell>{formatDate(createdAt)}</TableCell>
                          <TableCell className="space-x-2">
                            {statusNorm === "pending" || statusNorm === "unknown" ? (
                              <>
                                <Button
                                  className="transition-transform duration-150 ease-in-out"
                                  variant="default"
                                  size="sm"
                                  onClick={() => setSuggestionStatus(s, "approved")}
                                  disabled={!id || isRowSaving}
                                  aria-label="Approve suggestion"
                                  title="Approve"
                                >
                                  {isRowSaving && savingAction === "approved" ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="mr-1 h-4 w-4" />
                                  )}
                                  Approve
                                </Button>

                                <Button
                                  className="transition-transform duration-150 ease-in-out"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setSuggestionStatus(s, "rejected")}
                                  disabled={!id || isRowSaving}
                                  aria-label="Reject suggestion"
                                  title="Reject"
                                >
                                  {isRowSaving && savingAction === "rejected" ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                  ) : (
                                    <X className="mr-1 h-4 w-4" />
                                  )}
                                  Reject
                                </Button>
                              </>
                            ) : statusNorm === "approved" ? (
                              <Button
                                className="transition-transform duration-150 ease-in-out"
                                variant="destructive"
                                size="sm"
                                onClick={() => setSuggestionStatus(s, "rejected")}
                                disabled={!id || isRowSaving}
                                aria-label="Mark suggestion rejected"
                                title="Mark as rejected"
                              >
                                {isRowSaving && savingAction === "rejected" ? (
                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="mr-1 h-4 w-4" />
                                )}
                                Mark Rejected
                              </Button>
                            ) : (
                              <Button
                                className="transition-transform duration-150 ease-in-out"
                                variant="default"
                                size="sm"
                                onClick={() => setSuggestionStatus(s, "approved")}
                                disabled={!id || isRowSaving}
                                aria-label="Mark suggestion approved"
                                title="Mark as approved"
                              >
                                {isRowSaving && savingAction === "approved" ? (
                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="mr-1 h-4 w-4" />
                                )}
                                Mark Approved
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {lastPage}
              </div>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      aria-disabled={currentPage <= 1}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  <PaginationItem>
                    <PaginationLink isActive>{String(currentPage)}</PaginationLink>
                  </PaginationItem>

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                      aria-disabled={currentPage >= lastPage}
                      className={currentPage >= lastPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>

        <Dialog open={Boolean(selectedSuggestion)} onOpenChange={(open) => { if (!open) setSelectedSuggestion(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedSuggestion ? `Suggestion ${getSuggestionId(selectedSuggestion)}` : "Suggestion"}</DialogTitle>
              <DialogDescription>
                Details for the selected suggestion.
              </DialogDescription>
            </DialogHeader>

            {selectedSuggestion ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-28 h-28 flex-shrink-0">
                    {getSuggestionThumbnailUrl(selectedSuggestion) ? (
                      <img src={getSuggestionThumbnailUrl(selectedSuggestion) || undefined} alt="thumb" className="w-28 h-28 object-cover rounded" />
                    ) : (
                      <div className="w-28 h-28 rounded bg-muted" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">Status: <Badge variant={statusBadgeVariant(normalizeStatus(selectedSuggestion.status))}>{normalizeStatus(selectedSuggestion.status)}</Badge></div>
                    <div className="mt-2 font-medium text-lg">{suggestionSummary(selectedSuggestion)}</div>
                    <div className="text-sm text-muted-foreground mt-2">Created: {formatDate(selectedSuggestion.created_at)}</div>
                  </div>
                </div>

                <div>
                  <div className="font-medium">Ingredients</div>
                  <ul className="list-disc pl-5 text-sm mt-1">
                    {Array.isArray(selectedSuggestion.ingredients) && selectedSuggestion.ingredients.length > 0 ? (
                      selectedSuggestion.ingredients.map((ing, idx) => (
                        <li key={idx}>{ing?.name ?? "—"}{ing?.quantity ? ` — ${ing.quantity}` : ""}</li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">No ingredients provided</li>
                    )}
                  </ul>
                </div>

                <div>
                  <div className="font-medium">Steps</div>
                  <ol className="list-decimal pl-5 text-sm mt-1">
                    {Array.isArray(selectedSuggestion.steps) && selectedSuggestion.steps.length > 0 ? (
                      selectedSuggestion.steps.map((st, idx) => (
                        <li key={idx}>{st?.description ?? "—"} {st?.time_minutes ? ` • ${st.time_minutes} min` : ""}</li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">No steps provided</li>
                    )}
                  </ol>
                </div>

                <DialogFooter>
                  <div className="flex items-center justify-end w-full gap-2">
                    {selectedIds.size > 0 ? (
                      <Button variant="outline" onClick={() => setSelectedIds(new Set())}>Clear Selection</Button>
                    ) : null}
                    <Button onClick={() => setSelectedSuggestion(null)}>Close</Button>
                  </div>
                </DialogFooter>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
