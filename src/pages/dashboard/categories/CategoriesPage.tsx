import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { MoreHorizontal, Pencil, Plus, Trash2, ImageIcon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"

type Category = {
  id: number
  name: string
  thumbnail?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  _raw?: any
}

function resolveImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  // Build absolute from API base when a relative path is returned
  const base = apiService.getBaseUrl().replace(/\/$/, "")
  const rel = String(path).startsWith("/") ? path : "/" + path
  return base + rel
}

export default function CategoriesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState("")

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addName, setAddName] = useState("")
  const [addFile, setAddFile] = useState<File | null>(null)
  const [submittingAdd, setSubmittingAdd] = useState(false)

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [editName, setEditName] = useState("")
  const [editFile, setEditFile] = useState<File | null>(null)
  const [submittingEdit, setSubmittingEdit] = useState(false)

  // Delete confirm state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  useEffect(() => {
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchCategories() {
    try {
      setLoading(true)
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) apiService.setAuthToken(token)
      const res = await apiService.get(`/products/product-categories`)

      // Try to find array in several shapes
      let items: any[] = []
      const candidates = [res, res?.data, res?.result, res?.results, res?.items, res?.records]
      for (const c of candidates) {
        if (Array.isArray(c)) { items = c; break }
        if (c && Array.isArray(c.data)) { items = c.data; break }
      }
      if (!Array.isArray(items)) items = []

      const mapped: Category[] = items.map((it: any) => {
        const id = Number(it.id ?? it.categoryId ?? it.category_id ?? it.categoryID)
        const name = String(it.name ?? it.categoryName ?? it.title ?? "").trim()
        // Handle various thumbnail shapes: string URL, object with url, or array of { url, isThumbnail }
        const thumbRaw = it.thumbnail_url ?? it.thumbnailUrl ?? it.thumbnail ?? it.image ?? it.photo ?? null
        let thumb: string | null = null
        if (Array.isArray(thumbRaw)) {
          const chosen = thumbRaw.find((x: any) => x?.isThumbnail === true || x?.is_thumbnail === true || x?.is_thumbnail === 1) ?? thumbRaw[0]
          thumb = chosen?.url ?? chosen?.image ?? null
        } else if (thumbRaw && typeof thumbRaw === 'object') {
          thumb = thumbRaw.url ?? thumbRaw.image ?? null
        } else if (typeof thumbRaw === 'string') {
          thumb = thumbRaw
        } else {
          thumb = null
        }
        const createdAt = it.created_at ?? it.createdAt ?? null
        const updatedAt = it.updated_at ?? it.updatedAt ?? null
        return { id, name, thumbnail: thumb, createdAt, updatedAt, _raw: it }
      }).filter(c => !isNaN(c.id))

      setCategories(mapped)
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to load categories.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search) return categories
    const q = search.toLowerCase()
    return categories.filter(c => c.name.toLowerCase().includes(q))
  }, [categories, search])

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!addName.trim()) {
      toast({ title: "Validation", description: "Name is required.", variant: "destructive" })
      return
    }
    if (!addFile) {
      toast({ title: "Validation", description: "Thumbnail is required.", variant: "destructive" })
      return
    }
    try {
      setSubmittingAdd(true)
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) apiService.setAuthToken(token)
      const fd = new FormData()
      fd.append("name", addName.trim())
      fd.append("thumbnail", addFile)
      await apiService.postMultipart(`/admins/products/product-categories`, fd)
      toast({ title: "Created", description: "Category added successfully." })
      setIsAddOpen(false)
      setAddName("")
      setAddFile(null)
      fetchCategories()
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to add category.", variant: "destructive" })
    } finally {
      setSubmittingAdd(false)
    }
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setEditName(cat.name)
    setEditFile(null)
    setIsEditOpen(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    if (!editName.trim()) {
      toast({ title: "Validation", description: "Name is required.", variant: "destructive" })
      return
    }
    try {
      setSubmittingEdit(true)
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) apiService.setAuthToken(token)
      const fd = new FormData()
      fd.append("name", editName.trim())
      if (editFile) fd.append("thumbnail", editFile)
      // Most backends accept either query param or body _method override; include both for safety
      fd.append("_method", "patch")
      await apiService.postMultipart(`/admins/products/product-categories/${editing.id}?_method=patch`, fd)
      toast({ title: "Updated", description: "Category updated successfully." })
      setIsEditOpen(false)
      setEditing(null)
      fetchCategories()
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update category.", variant: "destructive" })
    } finally {
      setSubmittingEdit(false)
    }
  }

  async function handleDelete() {
    if (pendingDeleteId == null) return
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (token) apiService.setAuthToken(token)
      await apiService.delete(`/admins/products/product-categories/${pendingDeleteId}`)
      toast({ title: "Deleted", description: "Category deleted." })
      setIsDeleteOpen(false)
      setPendingDeleteId(null)
      fetchCategories()
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to delete category.", variant: "destructive" })
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Product Categories</h2>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Categories</CardTitle>
            <CardDescription>Manage product categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex-1 max-w-sm">
                <Input placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thumbnail</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center">No categories found</TableCell></TableRow>
                ) : (
                  filtered.map(cat => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        {cat.thumbnail ? (
                          <img src={resolveImageUrl(cat.thumbnail)} alt={cat.name} className="h-10 w-10 rounded object-cover border" />
                        ) : (
                          <div className="h-10 w-10 grid place-items-center border rounded text-muted-foreground"><ImageIcon className="h-4 w-4" /></div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>{cat.createdAt ? new Date(cat.createdAt).toLocaleDateString() : "-"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(cat)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => { setPendingDeleteId(cat.id); setIsDeleteOpen(true) }}>
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

        {/* Add Modal */}
        <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) { setAddName(""); setAddFile(null) } }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
              <DialogDescription>Provide name and thumbnail.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="text-sm" htmlFor="add-name">Name</label>
                <Input id="add-name" value={addName} onChange={(e) => setAddName(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm" htmlFor="add-thumbnail">Thumbnail</label>
                <Input id="add-thumbnail" type="file" accept="image/*" onChange={(e) => setAddFile(e.target.files?.[0] ?? null)} required />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submittingAdd}>{submittingAdd ? "Creating..." : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={(o) => { setIsEditOpen(o); if (!o) { setEditing(null); setEditName(""); setEditFile(null) } }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>Update details. Thumbnail is optional.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="text-sm" htmlFor="edit-name">Name</label>
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm" htmlFor="edit-thumbnail">Thumbnail (optional)</label>
                <Input id="edit-thumbnail" type="file" accept="image/*" onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submittingEdit}>{submittingEdit ? "Saving..." : "Save Changes"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently remove the category. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingDeleteId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
