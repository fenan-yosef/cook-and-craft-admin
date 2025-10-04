import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, MoreHorizontal, Eye, Plus, Check, X, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"
import { useAuth } from "@/contexts/auth-context"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

type ApiRecipe = {
  Recipe_ID: number
  Name: string
  Description: string
  Calories: number
  Prep_minutes: number
  Is_active: number 
  Images: any[] 
  Ingredients?: Array<{ name?: string; amount?: string } | string>
  Nutrition_facts?: Array<{ label?: string; value?: string } | string>
  Utensils?: Array<string | { name?: string }>
}

// Pending recipe requests (waiting for admin approval)
type PendingRecipe = ApiRecipe & {
  Requested_By?: string
  Requested_At?: string
}

const PENDING_STORAGE_KEY = "mock_recipe_requests"

// Best-effort image URL extraction from various backend formats
function getImageSrc(img: any): string | null {
  if (!img) return null
  if (typeof img === "string") return img
  if (typeof img === "object") {
    const candidates = [
      img.url,
      img.imageUrl,
      img.src,
      img.path,
      img.file_path,
      img.filePath,
      img.fullUrl,
      img.link,
      img.image,
    ]
    const val = candidates.find((v) => typeof v === "string" && v.length > 0)
    return val || null
  }
  return null
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<ApiRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  // Mock: pending recipe requests
  const [pending, setPending] = useState<PendingRecipe[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<ApiRecipe | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editRecipe, setEditRecipe] = useState({
    id: 0,
    Name: "",
    Description: "",
    Calories: "" as string | number,
    Prep_minutes: "" as string | number,
    Is_active: true,
    Images: [] as File[],
    Ingredients: [{ name: "", amount: "" }] as { name: string; amount: string }[],
    Nutrition_facts: [{ label: "", value: "" }] as { label: string; value: string }[],
    Utensils: [""] as string[],
    StepsText: "",
  })
  const [editExistingImages, setEditExistingImages] = useState<any[]>([])
  const [newRecipe, setNewRecipe] = useState({
    Name: "",
    Description: "",
    Calories: "" as string | number,
    Prep_minutes: "" as string | number,
  Ingredients: [{ name: "", amount: "" }] as { name: string; amount: string }[],
  Nutrition_facts: [{ label: "", value: "" }] as { label: string; value: string }[],
  Utensils: [""] as string[],
  StepsText: "",
    Is_active: true,
  })
  const [newImages, setNewImages] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { toast } = useToast()
  const { token, isLoading: authLoading } = useAuth()

  // Ensure apiService has the latest token (fallback to localStorage for deep links)
  useEffect(() => {
    const t = token || (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null)
    apiService.setAuthToken(t || null)
  }, [token])

  useEffect(() => {
    if (token) {
      fetchRecipes()
      loadPending()
    } else if (!authLoading) {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authLoading])

  // Mock loaders for pending requests
  const loadPending = () => {
    setPendingLoading(true)
    try {
      const raw = localStorage.getItem(PENDING_STORAGE_KEY)
      if (raw) {
        const list = JSON.parse(raw)
        if (Array.isArray(list)) {
          setPending(list)
          return
        }
      }
      // Seed with mock items if none
      const seed: PendingRecipe[] = [
        {
          Recipe_ID: 9001,
          Name: "Grilled Veggie Wrap",
          Description: "Whole-wheat wrap with grilled vegetables and hummus",
          Calories: 520,
          Prep_minutes: 15,
          Is_active: 0,
          Images: [],
          Ingredients: [
            { name: "Whole-wheat wrap", amount: "1" },
            { name: "Grilled zucchini", amount: "100g" },
          ],
          Nutrition_facts: [
            { label: "Protein", value: "14g" },
            { label: "Carbs", value: "65g" },
          ],
          Utensils: ["Pan", "Tongs"],
          Requested_By: "user_123",
          Requested_At: new Date().toISOString(),
        },
        {
          Recipe_ID: 9002,
          Name: "Berry Yogurt Parfait",
          Description: "Layers of yogurt, granola, and fresh berries",
          Calories: 380,
          Prep_minutes: 10,
          Is_active: 0,
          Images: [],
          Ingredients: [
            { name: "Greek yogurt", amount: "200g" },
            { name: "Granola", amount: "50g" },
          ],
          Nutrition_facts: [
            { label: "Protein", value: "18g" },
          ],
          Utensils: ["Glass", "Spoon"],
          Requested_By: "user_456",
          Requested_At: new Date(Date.now() - 86400000).toISOString(),
        },
      ]
      setPending(seed)
      localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(seed))
    } catch {
      // ignore
    } finally {
      setPendingLoading(false)
    }
  }

  const persistPending = (list: PendingRecipe[]) => {
    setPending(list)
    try { localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(list)) } catch {}
  }

  const approveRequest = (req: PendingRecipe) => {
    // Move to recipes list (mock) and remove from pending
    const newRecipe: ApiRecipe = {
      Recipe_ID: req.Recipe_ID,
      Name: req.Name,
      Description: req.Description,
      Calories: req.Calories,
      Prep_minutes: req.Prep_minutes,
      Is_active: 1,
      Images: req.Images || [],
      Ingredients: req.Ingredients,
      Nutrition_facts: req.Nutrition_facts,
      Utensils: req.Utensils,
    }
    setRecipes((prev) => [newRecipe, ...prev])
    persistPending(pending.filter((p) => p.Recipe_ID !== req.Recipe_ID))
    toast({ title: "Approved", description: `${req.Name} moved to recipes.` })
  }

  const rejectRequest = (req: PendingRecipe) => {
    persistPending(pending.filter((p) => p.Recipe_ID !== req.Recipe_ID))
    toast({ title: "Rejected", description: `${req.Name} request removed.` })
  }

  // Generate object URLs for new image previews
  useEffect(() => {
    // Revoke previous URLs
    newImagePreviews.forEach((url) => URL.revokeObjectURL(url))
    const urls = newImages.map((f) => URL.createObjectURL(f))
    setNewImagePreviews(urls)
    // Cleanup when component unmounts or images change next time
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newImages])

  const fetchRecipes = async () => {
    try {
      setLoading(true)
  const res = await apiService.get("/recipes")
      const items: ApiRecipe[] = Array.isArray(res?.data) ? res.data : []
      setRecipes(items)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch recipes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Create/Edit/Delete not implemented for API yet; only viewing list

  const resetNewRecipe = () =>
  {
    setNewRecipe({
      Name: "",
      Description: "",
      Calories: "",
      Prep_minutes: "",
      Ingredients: [{ name: "", amount: "" }],
      Nutrition_facts: [{ label: "", value: "" }],
      Utensils: [""],
      StepsText: "",
      Is_active: true,
    })
    setNewImages([])
    setNewImagePreviews([])
  }

  const createRecipe = async () => {
    try {
      const errors: string[] = []
      const nameVal = newRecipe.Name.trim()
      const descVal = newRecipe.Description.trim()
      const calNum = typeof newRecipe.Calories === "string" ? parseInt(newRecipe.Calories) : newRecipe.Calories
      const prepNum = typeof newRecipe.Prep_minutes === "string" ? parseInt(newRecipe.Prep_minutes) : newRecipe.Prep_minutes
      if (!nameVal) errors.push("Name is required")
      if (!descVal) errors.push("Description is required")
      if (Number.isNaN(calNum) || calNum === undefined || calNum === null || calNum === ("" as any)) errors.push("Calories is required")
      if (Number.isNaN(prepNum) || prepNum === undefined || prepNum === null || prepNum === ("" as any)) errors.push("Prep minutes is required")
      if (errors.length) {
        toast({ title: "Validation", description: errors.join("; ") })
        return
      }
      setCreating(true)
  let res: any
  const ingredientsClean = (newRecipe.Ingredients || []).filter((x) => (x.name?.trim() || x.amount?.trim()))
  const nutritionClean = (newRecipe.Nutrition_facts || []).filter((x) => (x.label?.trim() || x.value?.trim()))
  const utensilsClean = (newRecipe.Utensils || []).map((u) => (u ?? "").trim()).filter(Boolean)
  const stepsArray = newRecipe.StepsText
        ? newRecipe.StepsText.split("\n").map((s) => s.trim()).filter(Boolean)
        : []
      const stepsToSend: any = stepsArray.length > 0 ? stepsArray : null
      if (newImages.length > 0) {
        const fd = new FormData()
        fd.append("name", nameVal)
        fd.append("description", descVal)
        fd.append("calories_kcal", String(calNum))
        fd.append("prep_minutes", String(prepNum))
        fd.append("is_active", newRecipe.Is_active ? "1" : "0")
        // Complex fields as JSON strings in multipart (backend should json_decode)
        fd.append("ingredients", JSON.stringify(ingredientsClean))
        fd.append("nutrition_facts", JSON.stringify(nutritionClean))
        fd.append("utensils", JSON.stringify(utensilsClean))
        if (stepsToSend !== null) {
          fd.append("steps", JSON.stringify(stepsToSend))
        }
        for (const file of newImages) fd.append("images[]", file)
        res = await apiService.postMultipart("/recipes", fd)
      } else {
        const payload: any = {
          name: nameVal,
          description: descVal,
          calories_kcal: String(calNum),
          prep_minutes: String(prepNum),
          ingredients: ingredientsClean,
          nutrition_facts: nutritionClean,
          utensils: utensilsClean,
          steps: stepsToSend,
          is_active: newRecipe.Is_active ? 1 : 0,
          images: [],
        }
        res = await apiService.post("/recipes", payload)
      }
      const created = Array.isArray(res?.data) && res.data.length > 0 ? (res.data[0] as ApiRecipe) : null
      if (created) {
        setRecipes((prev) => [created, ...prev])
      } else {
        await fetchRecipes()
      }
      setIsCreateDialogOpen(false)
      resetNewRecipe()
      toast({ title: "Success", description: "Recipe created" })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to create recipe",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const viewRecipe = (recipe: ApiRecipe) => {
    setSelectedRecipe(recipe)
    setIsViewDialogOpen(true)
  }

  const deleteRecipe = async (recipe: ApiRecipe) => {
    if (deletingId !== null) return
    if (!window.confirm(`Delete recipe "${recipe.Name}"? This cannot be undone.`)) return
    setDeletingId(recipe.Recipe_ID)
    try {
      await apiService.delete(`/recipes/${recipe.Recipe_ID}`)
      setRecipes(prev => prev.filter(r => r.Recipe_ID !== recipe.Recipe_ID))
      if (selectedRecipe?.Recipe_ID === recipe.Recipe_ID) setIsViewDialogOpen(false)
      toast({ title: 'Deleted', description: 'Recipe removed.' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to delete recipe', variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  const openEdit = (recipe: ApiRecipe) => {
    setEditRecipe({
      id: recipe.Recipe_ID,
      Name: recipe.Name || "",
      Description: recipe.Description || "",
      Calories: recipe.Calories ?? "",
      Prep_minutes: recipe.Prep_minutes ?? "",
      Is_active: recipe.Is_active === 1,
      Images: [],
      Ingredients: (() => {
        const ings: any[] = (recipe as any).Ingredients ?? (recipe as any).ingredients ?? []
        const normalized = Array.isArray(ings)
          ? ings.map((it: any) => {
              if (typeof it === "string") return { name: it, amount: "" }
              return { name: it?.name ?? it?.ingredient ?? "", amount: it?.amount ?? it?.qty ?? "" }
            })
          : []
        return normalized.length > 0 ? normalized : [{ name: "", amount: "" }]
      })(),
      Nutrition_facts: (() => {
        const nfs: any[] = (recipe as any).Nutrition_facts ?? (recipe as any).nutrition_facts ?? []
        const normalized = Array.isArray(nfs)
          ? nfs.map((it: any) => (typeof it === "string" ? { label: it, value: "" } : { label: it?.label ?? "", value: it?.value ?? "" }))
          : []
        return normalized.length > 0 ? normalized : [{ label: "", value: "" }]
      })(),
      Utensils: (() => {
        const uts: any[] = (recipe as any).Utensils ?? (recipe as any).utensils ?? []
        const normalized = Array.isArray(uts) ? uts.map((u: any) => (typeof u === "string" ? u : u?.name ?? "")) : []
        return normalized.length > 0 ? normalized : [""]
      })(),
      StepsText: (() => {
        const steps: any = (recipe as any).Steps ?? (recipe as any).steps
        if (Array.isArray(steps)) return steps.map((s) => String(s ?? "")).join("\n")
        if (typeof steps === "string") return steps
        return ""
      })(),
    })
  setEditExistingImages(Array.isArray(recipe.Images) ? recipe.Images : [])
    setIsEditDialogOpen(true)
  }

  const submitEdit = async () => {
    try {
      const errors: string[] = []
      const nameVal = editRecipe.Name.trim()
      const descVal = editRecipe.Description.trim()
      const calNum = typeof editRecipe.Calories === "string" ? parseInt(editRecipe.Calories) : editRecipe.Calories
      const prepNum = typeof editRecipe.Prep_minutes === "string" ? parseInt(editRecipe.Prep_minutes) : editRecipe.Prep_minutes
      if (!nameVal) errors.push("Name is required")
      if (!descVal) errors.push("Description is required")
      if (Number.isNaN(calNum) || calNum === undefined || calNum === null || calNum === ("" as any)) errors.push("Calories is required")
      if (Number.isNaN(prepNum) || prepNum === undefined || prepNum === null || prepNum === ("" as any)) errors.push("Prep minutes is required")
      if (errors.length) {
        toast({ title: "Validation", description: errors.join("; ") })
        return
      }
      setEditing(true)
      const fd = new FormData()
      fd.append("_method", "put")
      fd.append("name", nameVal)
      fd.append("description", descVal)
      fd.append("calories_kcal", String(calNum))
      fd.append("prep_minutes", String(prepNum))
      fd.append("is_active", editRecipe.Is_active ? "1" : "0")
      // Additional structured fields
      const ingredientsClean = (editRecipe.Ingredients || []).filter((x) => (x.name?.trim() || x.amount?.trim()))
      const nutritionClean = (editRecipe.Nutrition_facts || []).filter((x) => (x.label?.trim() || x.value?.trim()))
      const utensilsClean = (editRecipe.Utensils || []).map((u) => (u ?? "").trim()).filter(Boolean)
      const stepsArray = editRecipe.StepsText
        ? editRecipe.StepsText.split("\n").map((s) => s.trim()).filter(Boolean)
        : []
      if (ingredientsClean.length > 0) fd.append("ingredients", JSON.stringify(ingredientsClean))
      if (nutritionClean.length > 0) fd.append("nutrition_facts", JSON.stringify(nutritionClean))
      if (utensilsClean.length > 0) fd.append("utensils", JSON.stringify(utensilsClean))
      if (stepsArray.length > 0) fd.append("steps", JSON.stringify(stepsArray))
      if (Array.isArray(editRecipe.Images)) {
        for (const file of editRecipe.Images) {
          fd.append("images[]", file)
        }
      }
      const res = await apiService.postMultipart(`/recipes/${editRecipe.id}?_method=put`, fd)
      const updated = Array.isArray(res?.data) && res.data.length > 0 ? (res.data[0] as ApiRecipe) : null
      if (updated) {
        setRecipes((prev) => prev.map((r) => (r.Recipe_ID === updated.Recipe_ID ? updated : r)))
        setIsEditDialogOpen(false)
        toast({ title: "Updated", description: "Recipe updated" })
      } else {
        await fetchRecipes()
        setIsEditDialogOpen(false)
      }
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to update recipe", variant: "destructive" })
    } finally {
      setEditing(false)
    }
  }

  const filteredRecipes = recipes.filter((recipe) => {
    const term = searchTerm.toLowerCase()
    return (
      recipe.Name?.toLowerCase().includes(term) ||
      recipe.Description?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Recipes</h2>
          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!token || authLoading}>
            <Plus className="mr-2 h-4 w-4" /> Add Recipe
          </Button>
        </div>

        {/* Create Recipe Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) resetNewRecipe() }}>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Recipe</DialogTitle>
              <DialogDescription>Provide basic details and save.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={newRecipe.Name} onChange={(e) => setNewRecipe((s) => ({ ...s, Name: e.target.value }))} placeholder="Recipe name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Input id="desc" value={newRecipe.Description} onChange={(e) => setNewRecipe((s) => ({ ...s, Description: e.target.value }))} placeholder="Short description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cal">Calories (kcal)</Label>
                  <Input id="cal" type="number" value={newRecipe.Calories} onChange={(e) => setNewRecipe((s) => ({ ...s, Calories: e.target.value }))} placeholder="e.g. 450" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prep">Prep minutes</Label>
                  <Input id="prep" type="number" value={newRecipe.Prep_minutes} onChange={(e) => setNewRecipe((s) => ({ ...s, Prep_minutes: e.target.value }))} placeholder="e.g. 20" />
                </div>
              </div>
              {/* Ingredients */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Ingredients</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewRecipe((s) => ({ ...s, Ingredients: [...(s.Ingredients || []), { name: "", amount: "" }] }))}
                  >
                    Add
                  </Button>
                </div>
                <div className="grid gap-2">
                  {(newRecipe.Ingredients || []).map((ing, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2">
                      <Input
                        placeholder="Name"
                        value={ing.name}
                        onChange={(e) => {
                          const arr = [...(newRecipe.Ingredients || [])]
                          arr[idx] = { ...arr[idx], name: e.target.value }
                          setNewRecipe((s) => ({ ...s, Ingredients: arr }))
                        }}
                        className="col-span-3"
                      />
                      <Input
                        placeholder="Amount (e.g. 200 g)"
                        value={ing.amount}
                        onChange={(e) => {
                          const arr = [...(newRecipe.Ingredients || [])]
                          arr[idx] = { ...arr[idx], amount: e.target.value }
                          setNewRecipe((s) => ({ ...s, Ingredients: arr }))
                        }}
                        className="col-span-2"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Tip: Use common units like g (grams), kg, ml, tbsp, tsp.</p>
              </div>

              {/* Nutrition facts */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Nutrition facts</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewRecipe((s) => ({ ...s, Nutrition_facts: [...(s.Nutrition_facts || []), { label: "", value: "" }] }))}
                  >
                    Add
                  </Button>
                </div>
                <div className="grid gap-2">
                  {(newRecipe.Nutrition_facts || []).map((nf, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2">
                      <Input
                        placeholder="Label"
                        value={nf.label}
                        onChange={(e) => {
                          const arr = [...(newRecipe.Nutrition_facts || [])]
                          arr[idx] = { ...arr[idx], label: e.target.value }
                          setNewRecipe((s) => ({ ...s, Nutrition_facts: arr }))
                        }}
                        className="col-span-3"
                      />
                      <Input
                        placeholder="Value (e.g. 12 g protein)"
                        value={nf.value}
                        onChange={(e) => {
                          const arr = [...(newRecipe.Nutrition_facts || [])]
                          arr[idx] = { ...arr[idx], value: e.target.value }
                          setNewRecipe((s) => ({ ...s, Nutrition_facts: arr }))
                        }}
                        className="col-span-2"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Utensils */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Utensils</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewRecipe((s) => ({ ...s, Utensils: [...(s.Utensils || []), ""] }))}
                  >
                    Add
                  </Button>
                </div>
                <div className="grid gap-2">
                  {(newRecipe.Utensils || []).map((ut, idx) => (
                    <Input
                      key={idx}
                      placeholder="e.g. Pan"
                      value={ut}
                      onChange={(e) => {
                        const arr = [...(newRecipe.Utensils || [])]
                        arr[idx] = e.target.value
                        setNewRecipe((s) => ({ ...s, Utensils: arr }))
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Steps (multiline, one per line) */}
              <div className="grid gap-2">
                <Label htmlFor="steps">Steps (one per line)</Label>
                <textarea
                  id="steps"
                  className="min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Write each step on a new line"
                  value={newRecipe.StepsText}
                  onChange={(e) => setNewRecipe((s) => ({ ...s, StepsText: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Mark recipe as active</p>
                </div>
                <Switch checked={newRecipe.Is_active} onCheckedChange={(v) => setNewRecipe((s) => ({ ...s, Is_active: v }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cimages">Images</Label>
                <Input id="cimages" type="file" multiple accept="image/*" onChange={(e) => {
                  const files = Array.from(e.target.files || []) as File[]
                  setNewImages(files)
                }} />
                {newImagePreviews.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {newImagePreviews.map((src, i) => (
                      <div key={i} className="aspect-square rounded border overflow-hidden bg-muted">
                        <img src={src} alt={`New image ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">Optional. Upload one or more images.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={creating}>Cancel</Button>
              <Button onClick={createRecipe} disabled={creating}>{creating ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>All Recipes</CardTitle>
            <CardDescription>Manage your recipe collection for meal planning</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Calories (kcal)</TableHead>
                  <TableHead>Prep (min)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Images</TableHead>
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
                ) : filteredRecipes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No recipes found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecipes.map((recipe) => (
                    <TableRow key={recipe.Recipe_ID}>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium flex items-center">{recipe.Name}</div>
                          <div className="text-sm text-muted-foreground truncate">{recipe.Description}</div>
                        </div>
                      </TableCell>
                      <TableCell>{recipe.Calories ?? "-"}</TableCell>
                      <TableCell>{recipe.Prep_minutes ?? "-"}</TableCell>
                      <TableCell>
                        {recipe.Is_active === 1 ? (
                          <Badge className="bg-green-100 text-green-800" variant="secondary">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800" variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {Array.isArray(recipe.Images) && recipe.Images.length > 0 ? (
                          <div className="flex items-center gap-2">
                            {recipe.Images.slice(0, 3).map((img: any, i: number) => {
                              const src = getImageSrc(img)
                              return (
                                <div key={i} className="w-10 h-10 rounded overflow-hidden border bg-muted">
                                  {src ? (
                                    <img src={src} alt={`Img ${i + 1}`} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-muted" />
                                  )}
                                </div>
                              )
                            })}
                            {recipe.Images.length > 3 ? (
                              <span className="text-xs text-muted-foreground">+{recipe.Images.length - 3}</span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewRecipe(recipe)} disabled={deletingId === recipe.Recipe_ID}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(recipe)} disabled={deletingId === recipe.Recipe_ID}>
                              <Eye className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-700" disabled={deletingId === recipe.Recipe_ID} onClick={() => deleteRecipe(recipe)}>
                              {deletingId === recipe.Recipe_ID ? (
                                <span className="flex items-center"><Trash2 className="mr-2 h-4 w-4" /> Deleting...</span>
                              ) : (
                                <span className="flex items-center"><Trash2 className="mr-2 h-4 w-4" /> Delete</span>
                              )}
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

        {/* Recipes Requests (pending approval) */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Recipes Requests</CardTitle>
            <CardDescription>Submissions waiting for admin approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pending recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" onClick={loadPending}>Refresh</Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Calories (kcal)</TableHead>
                  <TableHead>Prep (min)</TableHead>
                  <TableHead>Images</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : pending.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No pending requests</TableCell>
                  </TableRow>
                ) : (
                  pending
                    .filter((r) => {
                      const term = searchTerm.toLowerCase()
                      return (
                        r.Name?.toLowerCase().includes(term) ||
                        r.Description?.toLowerCase().includes(term) ||
                        (r.Requested_By || "").toLowerCase().includes(term)
                      )
                    })
                    .map((r) => (
                      <TableRow key={r.Recipe_ID}>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="font-medium flex items-center">{r.Name}</div>
                            <div className="text-sm text-muted-foreground truncate">{r.Description}</div>
                          </div>
                        </TableCell>
                        <TableCell>{r.Requested_By ?? "—"}</TableCell>
                        <TableCell>
                          {r.Requested_At ? new Date(r.Requested_At).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell>{r.Calories ?? "-"}</TableCell>
                        <TableCell>{r.Prep_minutes ?? "-"}</TableCell>
                        <TableCell>
                          {Array.isArray(r.Images) && r.Images.length > 0 ? (
                            <div className="flex items-center gap-2">
                              {r.Images.slice(0, 3).map((img: any, i: number) => {
                                const src = getImageSrc(img)
                                return (
                                  <div key={i} className="w-10 h-10 rounded overflow-hidden border bg-muted">
                                    {src ? (
                                      <img src={src} alt={`Img ${i + 1}`} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-muted" />
                                    )}
                                  </div>
                                )
                              })}
                              {r.Images.length > 3 ? (
                                <span className="text-xs text-muted-foreground">+{r.Images.length - 3}</span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => approveRequest(r)}>
                              <Check className="mr-1 h-4 w-4" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => rejectRequest(r)}>
                              <X className="mr-1 h-4 w-4" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card> */}

        {/* View Recipe Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRecipe?.Name}</DialogTitle>
              <DialogDescription>{selectedRecipe?.Description}</DialogDescription>
            </DialogHeader>
            {selectedRecipe && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center">
                    <span>Prep: {selectedRecipe.Prep_minutes ?? "-"} min</span>
                  </div>
                  <div className="flex items-center">
                    <span>Calories: {selectedRecipe.Calories ?? "-"}</span>
                  </div>
                  <div className="flex items-center">
                    {selectedRecipe.Is_active === 1 ? (
                      <Badge className="bg-green-100 text-green-800" variant="secondary">Active</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800" variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
                {/* Steps */}
                {(() => {
                  const steps: any = (selectedRecipe as any).Steps ?? (selectedRecipe as any).steps ?? []
                  const stepsArr: string[] = Array.isArray(steps)
                    ? steps.map((s: any) => String(s ?? "")).filter(Boolean)
                    : typeof steps === "string"
                      ? steps.split("\n").map((s) => s.trim()).filter(Boolean)
                      : []
                  if (stepsArr.length === 0) return null
                  return (
                    <div>
                      <h3 className="font-semibold mb-2">Steps</h3>
                      <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                        {stepsArr.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  )
                })()}
                {/* Ingredients */}
                {(() => {
                  const ings: any[] =
                    (selectedRecipe as any).Ingredients ?? (selectedRecipe as any).ingredients ?? []
                  if (!Array.isArray(ings) || ings.length === 0) return null
                  return (
                    <div>
                      <h3 className="font-semibold mb-2">Ingredients</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {ings.map((it: any, i: number) => {
                          if (typeof it === "string") return <li key={i}>{it}</li>
                          const name = it?.name ?? it?.ingredient ?? "—"
                          const amount = it?.amount ?? it?.qty ?? ""
                          return (
                            <li key={i}>
                              {name}
                              {amount ? ` — ${amount}` : ""}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })()}

                {/* Nutrition facts */}
                {(() => {
                  const nfs: any[] =
                    (selectedRecipe as any).Nutrition_facts ?? (selectedRecipe as any).nutrition_facts ?? []
                  if (!Array.isArray(nfs) || nfs.length === 0) return null
                  return (
                    <div>
                      <h3 className="font-semibold mb-2">Nutrition facts</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {nfs.map((nf: any, i: number) => {
                          if (typeof nf === "string") return <li key={i}>{nf}</li>
                          const label = nf?.label ?? "—"
                          const value = nf?.value ?? "—"
                          return (
                            <li key={i}>
                              {label} — {value}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })()}

                {/* Utensils */}
                {(() => {
                  const uts: any[] =
                    (selectedRecipe as any).Utensils ?? (selectedRecipe as any).utensils ?? []
                  if (!Array.isArray(uts) || uts.length === 0) return null
                  return (
                    <div>
                      <h3 className="font-semibold mb-2">Utensils</h3>
                      <div className="flex flex-wrap gap-2">
                        {uts.map((u: any, i: number) => {
                          const label = typeof u === "string" ? u : u?.name ?? JSON.stringify(u)
                          return (
                            <Badge key={i} variant="secondary">{label}</Badge>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
                {Array.isArray(selectedRecipe.Images) && selectedRecipe.Images.length > 0 ? (
                  <div>
                    <h3 className="font-semibold mb-2">Images</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedRecipe.Images.map((img: any, i: number) => {
                        const src = getImageSrc(img)
                        return (
                          <div key={i} className="aspect-square rounded border overflow-hidden bg-muted">
                            {src ? (
                              <img src={src} alt={`Recipe image ${i + 1}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-muted" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Recipe Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Edit Recipe</DialogTitle>
              <DialogDescription>Update recipe details.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              {Array.isArray(editExistingImages) && editExistingImages.length > 0 ? (
                <div>
                  <Label>Existing images</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    {editExistingImages.map((img: any, i: number) => {
                      const src = getImageSrc(img)
                      return (
                        <div key={i} className="aspect-square rounded border overflow-hidden bg-muted">
                          {src ? (
                            <img src={src} alt={`Existing image ${i + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="ename">Name</Label>
                <Input id="ename" value={editRecipe.Name} onChange={(e) => setEditRecipe((s) => ({ ...s, Name: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edesc">Description</Label>
                <Input id="edesc" value={editRecipe.Description} onChange={(e) => setEditRecipe((s) => ({ ...s, Description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ecal">Calories (kcal)</Label>
                  <Input id="ecal" type="number" value={editRecipe.Calories} onChange={(e) => setEditRecipe((s) => ({ ...s, Calories: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="eprep">Prep minutes</Label>
                  <Input id="eprep" type="number" value={editRecipe.Prep_minutes} onChange={(e) => setEditRecipe((s) => ({ ...s, Prep_minutes: e.target.value }))} />
                </div>
              </div>
              {/* Ingredients (edit) */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Ingredients</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditRecipe((s) => ({ ...s, Ingredients: [...(s.Ingredients || []), { name: "", amount: "" }] }))}
                  >
                    Add
                  </Button>
                </div>
                <div className="grid gap-2">
                  {(editRecipe.Ingredients || []).map((ing, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2">
                      <Input
                        placeholder="Name"
                        value={ing.name}
                        onChange={(e) => {
                          const arr = [...(editRecipe.Ingredients || [])]
                          arr[idx] = { ...arr[idx], name: e.target.value }
                          setEditRecipe((s) => ({ ...s, Ingredients: arr }))
                        }}
                        className="col-span-3"
                      />
                      <Input
                        placeholder="Amount (e.g. 200 g)"
                        value={ing.amount}
                        onChange={(e) => {
                          const arr = [...(editRecipe.Ingredients || [])]
                          arr[idx] = { ...arr[idx], amount: e.target.value }
                          setEditRecipe((s) => ({ ...s, Ingredients: arr }))
                        }}
                        className="col-span-2"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Tip: Use common units like g (grams), kg, ml, tbsp, tsp.</p>
              </div>

              {/* Nutrition facts (edit) */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Nutrition facts</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditRecipe((s) => ({ ...s, Nutrition_facts: [...(s.Nutrition_facts || []), { label: "", value: "" }] }))}
                  >
                    Add
                  </Button>
                </div>
                <div className="grid gap-2">
                  {(editRecipe.Nutrition_facts || []).map((nf, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2">
                      <Input
                        placeholder="Label"
                        value={nf.label}
                        onChange={(e) => {
                          const arr = [...(editRecipe.Nutrition_facts || [])]
                          arr[idx] = { ...arr[idx], label: e.target.value }
                          setEditRecipe((s) => ({ ...s, Nutrition_facts: arr }))
                        }}
                        className="col-span-3"
                      />
                      <Input
                        placeholder="Value (e.g. 12 g protein)"
                        value={nf.value}
                        onChange={(e) => {
                          const arr = [...(editRecipe.Nutrition_facts || [])]
                          arr[idx] = { ...arr[idx], value: e.target.value }
                          setEditRecipe((s) => ({ ...s, Nutrition_facts: arr }))
                        }}
                        className="col-span-2"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Utensils (edit) */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Utensils</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditRecipe((s) => ({ ...s, Utensils: [...(s.Utensils || []), ""] }))}
                  >
                    Add
                  </Button>
                </div>
                <div className="grid gap-2">
                  {(editRecipe.Utensils || []).map((ut, idx) => (
                    <Input
                      key={idx}
                      placeholder="e.g. Pan"
                      value={ut}
                      onChange={(e) => {
                        const arr = [...(editRecipe.Utensils || [])]
                        arr[idx] = e.target.value
                        setEditRecipe((s) => ({ ...s, Utensils: arr }))
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Steps (edit) */}
              <div className="grid gap-2">
                <Label htmlFor="esteps">Steps (one per line)</Label>
                <textarea
                  id="esteps"
                  className="min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Write each step on a new line"
                  value={editRecipe.StepsText}
                  onChange={(e) => setEditRecipe((s) => ({ ...s, StepsText: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Mark recipe as active</p>
                </div>
                <Switch checked={editRecipe.Is_active} onCheckedChange={(v) => setEditRecipe((s) => ({ ...s, Is_active: v }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eimages">Images</Label>
                <Input id="eimages" type="file" multiple accept="image/*" onChange={(e) => {
                  const files = Array.from(e.target.files || []) as File[]
                  setEditRecipe((s) => ({ ...s, Images: files }))
                }} />
                {newImagePreviews.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {newImagePreviews.map((src, i) => (
                      <div key={i} className="aspect-square rounded border overflow-hidden bg-muted">
                        <img src={src} alt={`New image ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">Optional. Upload one or more images.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={editing}>Cancel</Button>
              <Button onClick={submitEdit} disabled={editing}>{editing ? "Saving..." : "Save changes"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
