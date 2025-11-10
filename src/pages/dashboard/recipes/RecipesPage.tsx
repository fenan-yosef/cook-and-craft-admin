import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, MoreHorizontal, Eye, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"
import { useAuth } from "@/contexts/auth-context"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

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
  const [perPage, setPerPage] = useState(15)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  // Filters
  const TAG_OPTIONS = [
    { id: 1, label: "New" },
    { id: 2, label: "Popular" },
    { id: 3, label: "Loved" },
  ]
  const [tagSelections, setTagSelections] = useState<number[]>([])
  const [minCalories, setMinCalories] = useState<string>("")
  const [maxCalories, setMaxCalories] = useState<string>("")
  const [minPrep, setMinPrep] = useState<string>("")
  const [maxPrep, setMaxPrep] = useState<string>("")
  // Recipe tag catalog for selection in Edit modal
  const [tagOptions, setTagOptions] = useState<Array<{ id: number; name: string; slug?: string }>>([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [selectedEditTagIds, setSelectedEditTagIds] = useState<number[]>([])
  // Mock: pending recipe requests
  // Pending requests kept in localStorage (UI section is currently commented out)
  // const [pending, setPending] = useState<PendingRecipe[]>([])
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
    Ingredients: [{ name: "", amount: "", image: null as File | null }] as { name: string; amount: string; image?: File | null }[],
    Nutrition_facts: [{ label: "", value: "" }] as { label: string; value: string }[],
    Utensils: [""] as string[],
    StepsText: "",
    Tags: [] as string[],
    isBestChoice: false,
  })
  const [editExistingImages, setEditExistingImages] = useState<any[]>([])
  const [newRecipe, setNewRecipe] = useState({
    Name: "",
    Description: "",
    Calories: "" as string | number,
    Prep_minutes: "" as string | number,
  Ingredients: [{ name: "", amount: "", image: null as File | null }] as { name: string; amount: string; image?: File | null }[],
  Nutrition_facts: [{ label: "", value: "" }] as { label: string; value: string }[],
  Utensils: [""] as string[],
  StepsText: "",
    Is_active: true,
    Tags: [] as string[],
    isBestChoice: false,
  })
  const [newSteps, setNewSteps] = useState<Array<{ instructions: string; prep: number; ingredientIndices: number[]; image: File | null }>>([
    { instructions: "", prep: 1, ingredientIndices: [], image: null },
  ])
  const [newImages, setNewImages] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  // Edit-mode steps and previews
  const [editSteps, setEditSteps] = useState<Array<{ instructions: string; prep: number; ingredientIndices: number[]; image: File | null }>>([
    { instructions: "", prep: 1, ingredientIndices: [], image: null },
  ])
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([])
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
      fetchRecipes(1, perPage)
      loadPending()
      fetchAllRecipeTags()
    } else if (!authLoading) {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authLoading])

  // Fetch tags for recipes (paginate best-effort)
  const fetchAllRecipeTags = async () => {
    try {
      setTagsLoading(true)
      const all: any[] = []
      let page = 1
      let lastPage = 1
      for (let i = 0; i < 5; i++) { // cap safety
        const res: any = await apiService.get(`/recipes/tags?page=${page}`)
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : (Array.isArray(res?.data?.data) ? res.data.data : [])
        if (Array.isArray(list)) all.push(...list)
        const lp = Number(res?.last_page ?? res?.data?.last_page)
        if (Number.isFinite(lp) && lp > 0) lastPage = lp
        if (page >= lastPage) break
        page += 1
      }
      const mapped = (all || [])
        .map((t: any) => ({ id: Number(t?.id), name: String(t?.name ?? t?.slug ?? `#${t?.id}`), slug: t?.slug ? String(t.slug) : undefined }))
        .filter((t: any) => Number.isFinite(t.id) && t.name)
      const uniq: Record<number, { id: number; name: string; slug?: string }> = {}
      mapped.forEach((t: any) => { uniq[t.id] = t })
      setTagOptions(Object.values(uniq))
    } catch {
      setTagOptions([])
    } finally {
      setTagsLoading(false)
    }
  }

  // Mock loaders for pending requests
  const loadPending = () => {
    try {
      const raw = localStorage.getItem(PENDING_STORAGE_KEY)
      if (raw) {
        const list = JSON.parse(raw)
        if (Array.isArray(list)) {
          // setPending(list) // pending UI currently disabled
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
      localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(seed))
    } catch {
      // ignore
    } finally {
      // no-op
    }
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

  // Generate object URLs for edit image previews
  useEffect(() => {
    editImagePreviews.forEach((url) => URL.revokeObjectURL(url))
    const urls = (editRecipe.Images || []).map((f) => URL.createObjectURL(f))
    setEditImagePreviews(urls)
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRecipe.Images])

  const fetchRecipes = async (page = currentPage, size = perPage) => {
    try {
      setLoading(true)
      // Build filters and use server-side paging with per_page & page.
      const filterParts: string[] = []
      // tags (only include when selected)
      if (Array.isArray(tagSelections) && tagSelections.length > 0) {
        tagSelections.forEach((id, i) => {
          filterParts.push(`tags[${i}]=${encodeURIComponent(String(id))}`)
        })
      }
      // Always include these, even if empty, to satisfy backend parameter expectations
      filterParts.push(`min_calories=${encodeURIComponent(minCalories ?? "")}`)
      filterParts.push(`max_calories=${encodeURIComponent(maxCalories ?? "")}`)
      filterParts.push(`min_prep_time=${encodeURIComponent(minPrep ?? "")}`)
      filterParts.push(`max_prep_time=${encodeURIComponent(maxPrep ?? "")}`)

      const query = [`page=${page}`, `per_page=${size}`, ...filterParts].join("&")
      const res = await apiService.get(`/recipes?${query}`)
      const items: ApiRecipe[] = Array.isArray(res?.data) ? res.data : []
      setRecipes(items)

      // Parse pagination meta defensively
      const meta: any = res?.meta || res?.data?.meta || res?.pagination || res?.data?.pagination || {}
      const cur = Number(meta.current_page ?? meta.currentPage ?? res?.current_page ?? page ?? 1) || 1
      const tot = Number(meta.total ?? res?.total ?? (Array.isArray(res?.data) ? res.data.length : 0)) || 0
      let last = Number(meta.last_page ?? meta.lastPage ?? res?.last_page) || 0
      if (!last) {
        last = size ? Math.max(1, Math.ceil(tot / Number(size))) : 1
      }
      setCurrentPage(cur)
      setLastPage(last)
      setTotal(tot)
    } catch (error: any) {
      // Fallback: try a minimal query if per_page unsupported
      try {
        const res2 = await apiService.get(`/recipes?page=${page}&limit=${size}`)
        const items2: ApiRecipe[] = Array.isArray(res2?.data) ? res2.data : []
        setRecipes(items2)
        // Best-effort meta from fallback
        setCurrentPage(page)
        setTotal(Array.isArray(items2) ? items2.length : 0)
        setLastPage(items2.length < size ? page : page + 1)
      } catch (e2: any) {
        toast({
          title: "Error",
          description: e2?.message || error?.message || "Failed to fetch recipes",
          variant: "destructive",
        })
      }
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
      Ingredients: [{ name: "", amount: "", image: null }],
      Nutrition_facts: [{ label: "", value: "" }],
      Utensils: [""],
      StepsText: "",
      Is_active: true,
      Tags: [],
      isBestChoice: false,
    })
    setNewSteps([{ instructions: "", prep: 1, ingredientIndices: [], image: null }])
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
      // Always send multipart form-data using bracketed keys to match backend expectations
      const fd = new FormData()
      fd.append("name", nameVal)
      fd.append("description", descVal)
      fd.append("calories_kcal", String(calNum))
      fd.append("prep_minutes", String(prepNum))
      fd.append("is_active", newRecipe.Is_active ? "1" : "0")

      // Ingredients: use ingredients[i][name] and ingredients[i][amount]
      const ingredientsClean = (newRecipe.Ingredients || []).filter((x) => (x.name?.trim() || x.amount?.trim() || x.image))
      ingredientsClean.forEach((ing, i) => {
        if (ing.name?.trim()) fd.append(`ingredients[${i}][name]`, ing.name.trim())
        if (ing.amount?.trim()) fd.append(`ingredients[${i}][amount]`, ing.amount.trim())
        if (ing.image) fd.append(`ingredients[${i}][image]`, ing.image)
      })

      // Nutrition facts and utensils as JSON strings (per Postman example)
      const nutritionClean = (newRecipe.Nutrition_facts || []).filter((x) => (x.label?.trim() || x.value?.trim()))
      if (nutritionClean.length > 0) fd.append("nutrition_facts", JSON.stringify(nutritionClean))
      const utensilsClean = (newRecipe.Utensils || []).map((u) => (u ?? "").trim()).filter(Boolean)
      if (utensilsClean.length > 0) fd.append("utensils", JSON.stringify(utensilsClean))

      // Steps: steps[i][step_number], steps[i][instructions], steps[i][prep_minutes], steps[i][ingredient_indices][j], steps[i][image]
      const stepsClean = (newSteps || []).filter((s) => s.instructions.trim() || s.image)
      stepsClean.forEach((st, i) => {
        fd.append(`steps[${i}][step_number]`, String(i + 1))
        fd.append(`steps[${i}][instructions]`, st.instructions.trim())
        fd.append(`steps[${i}][prep_minutes]`, String(st.prep || 1))
        if (Array.isArray(st.ingredientIndices)) {
          st.ingredientIndices.forEach((idx, j) => {
            fd.append(`steps[${i}][ingredient_indices][${j}]`, String(idx))
          })
        }
        if (st.image) fd.append(`steps[${i}][image]`, st.image)
      })

      // Recipe images (optional)
      if (Array.isArray(newImages) && newImages.length > 0) {
        for (const file of newImages) fd.append("images[]", file)
      }

      // Best choice flag
      fd.append("is_best_choice", newRecipe.isBestChoice ? "1" : "0")

      // Tags: send as bracketed fields tags[i]
      if (Array.isArray(newRecipe.Tags)) {
        newRecipe.Tags.filter(t => t && String(t).trim()).forEach((t, i) => {
          fd.append(`tags[${i}]`, String(t).trim())
        })
      }

      const res: any = await apiService.postMultipart("/recipes", fd)
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
      // Surface backend validation errors if available
      let desc = error?.message || "Failed to create recipe"
      const serverErr = (error?.response?.data?.error || error?.data?.error) as any
      if (serverErr && typeof serverErr === "object") {
        try {
          const parts: string[] = []
          for (const k of Object.keys(serverErr)) {
            const val = (serverErr as any)[k]
            if (Array.isArray(val)) parts.push(`${k}: ${val.join(", ")}`)
            else if (typeof val === "string") parts.push(`${k}: ${val}`)
          }
          if (parts.length > 0) desc = parts.join("; ")
        } catch {}
      }
      toast({ title: "Error", description: desc, variant: "destructive" })
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
    // Derive initial structured steps from detailed steps or fallback
    const detailed: any[] = (recipe as any).Recipe_steps ?? []
    let initialEditSteps: Array<{ instructions: string; prep: number; ingredientIndices: number[]; image: File | null }> = []
    if (Array.isArray(detailed) && detailed.length > 0) {
      initialEditSteps = detailed
        .sort((a: any, b: any) => (a?.step_number ?? 0) - (b?.step_number ?? 0))
        .map((st: any) => {
          const instr = st?.instructions ? String(st.instructions) : ""
          const prep = typeof st?.prep_minutes !== 'undefined' ? Number(st.prep_minutes) || 1 : 1
          const indices = Array.isArray(st?.ingredient_indices)
            ? st.ingredient_indices.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n))
            : []
          return { instructions: instr, prep, ingredientIndices: indices, image: null }
        })
    } else {
      const steps: any = (recipe as any).Steps ?? (recipe as any).steps
      const stepsArr: string[] = Array.isArray(steps)
        ? steps.map((s: any) => String(s ?? "")).filter(Boolean)
        : typeof steps === "string"
          ? steps.split("\n").map((s) => s.trim()).filter(Boolean)
          : []
      initialEditSteps = stepsArr.length > 0
        ? stepsArr.map((txt) => ({ instructions: txt, prep: 1, ingredientIndices: [], image: null }))
        : [{ instructions: "", prep: 1, ingredientIndices: [], image: null }]
    }

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
              return { name: it?.name ?? it?.ingredient ?? "", amount: it?.amount ?? it?.qty ?? "", image: null }
            })
          : []
        return normalized.length > 0 ? normalized : [{ name: "", amount: "", image: null }]
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
      StepsText: "",
      Tags: (() => {
        const tags: any = (recipe as any).Tags ?? (recipe as any).tags ?? []
        if (Array.isArray(tags)) return tags.map((t: any) => String(t?.name ?? t?.slug ?? t))
        if (typeof tags === 'string') return tags.split(',').map((s) => s.trim()).filter(Boolean)
        return []
      })(),
      isBestChoice: Boolean((recipe as any).Is_best_choice),
    })
  setEditExistingImages(Array.isArray(recipe.Images) ? recipe.Images : [])
    setEditSteps(initialEditSteps)
    setIsEditDialogOpen(true)
    // reset new uploads for edit
  // Do not clear existingImages here; keep them until user removes explicitly

    // Pre-select tags if catalog is available
    try {
      const recTags: any[] = (recipe as any).Tags ?? (recipe as any).tags ?? []
      if (Array.isArray(recTags) && recTags.length > 0 && Array.isArray(tagOptions) && tagOptions.length > 0) {
        const idSet = new Set<number>()
        recTags.forEach((t: any) => {
          const tid = Number(t?.id)
          if (Number.isFinite(tid)) { idSet.add(tid); return }
          const label = String(t?.name ?? t?.slug ?? t ?? '').toLowerCase()
          const match = tagOptions.find(o => o.name.toLowerCase() === label || (o.slug && o.slug.toLowerCase() === label))
          if (match) idSet.add(match.id)
        })
        setSelectedEditTagIds(Array.from(idSet.values()))
      } else {
        setSelectedEditTagIds([])
      }
    } catch { setSelectedEditTagIds([]) }
  }

  // If tag options load while edit dialog is open, try to map from string labels
  useEffect(() => {
    if (!isEditDialogOpen) return
    if (tagOptions.length === 0) return
    const labels = Array.isArray(editRecipe.Tags) ? editRecipe.Tags : []
    if (labels.length === 0) return
    const idSet = new Set<number>()
    labels.forEach((lbl: string) => {
      const lower = String(lbl).toLowerCase()
      const match = tagOptions.find(o => o.name.toLowerCase() === lower || (o.slug && o.slug.toLowerCase() === lower))
      if (match) idSet.add(match.id)
    })
    if (idSet.size > 0) setSelectedEditTagIds(Array.from(idSet.values()))
  }, [isEditDialogOpen, tagOptions])

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
      // Build multipart form to match backend's bracketed fields
      const fd = new FormData()
      fd.append("_method", "put")
      fd.append("name", nameVal)
      fd.append("description", descVal)
      fd.append("calories_kcal", String(calNum))
      fd.append("prep_minutes", String(prepNum))
      fd.append("is_active", editRecipe.Is_active ? "1" : "0")

      // Ingredients: ingredients[i][name]/[amount]/[image]
      const ingredientsClean = (editRecipe.Ingredients || []).filter((x) => (x.name?.trim() || x.amount?.trim() || x.image))
      ingredientsClean.forEach((ing, i) => {
        if (ing.name?.trim()) fd.append(`ingredients[${i}][name]`, ing.name.trim())
        if (ing.amount?.trim()) fd.append(`ingredients[${i}][amount]`, ing.amount.trim())
        if (ing.image) fd.append(`ingredients[${i}][image]`, ing.image)
      })

      // Nutrition facts and utensils as JSON (per API examples)
      const nutritionClean = (editRecipe.Nutrition_facts || []).filter((x) => (x.label?.trim() || x.value?.trim()))
      if (nutritionClean.length > 0) fd.append("nutrition_facts", JSON.stringify(nutritionClean))
      const utensilsClean = (editRecipe.Utensils || []).map((u) => (u ?? "").trim()).filter(Boolean)
      if (utensilsClean.length > 0) fd.append("utensils", JSON.stringify(utensilsClean))

      // Steps: steps[i][step_number]/[instructions]/[prep_minutes]/[ingredient_indices][j]/[image]
      const stepsClean = (editSteps || []).filter((s) => s.instructions.trim() || s.image)
      stepsClean.forEach((st, i) => {
        fd.append(`steps[${i}][step_number]`, String(i + 1))
        fd.append(`steps[${i}][instructions]`, st.instructions.trim())
        fd.append(`steps[${i}][prep_minutes]`, String(st.prep || 1))
        if (Array.isArray(st.ingredientIndices)) {
          st.ingredientIndices.forEach((idx, j) => {
            fd.append(`steps[${i}][ingredient_indices][${j}]`, String(idx))
          })
        }
        if (st.image) fd.append(`steps[${i}][image]`, st.image)
      })
  // Best choice flag
  fd.append("is_best_choice", editRecipe.isBestChoice ? "1" : "0")

      // Tags for edit: prefer selected IDs from catalog; fallback to existing strings
      if (Array.isArray(selectedEditTagIds) && selectedEditTagIds.length > 0) {
        selectedEditTagIds.forEach((id, i) => fd.append(`tags[${i}]`, String(id)))
      } else if (Array.isArray(editRecipe.Tags)) {
        editRecipe.Tags.filter(t => t && String(t).trim()).forEach((t, i) => fd.append(`tags[${i}]`, String(t).trim()))
      }

      // Do NOT send existing images; backend will keep them if no new images replace them.
      // Only append newly added image files.

      // Newly added images (append after existing references)
      if (Array.isArray(editRecipe.Images) && editRecipe.Images.length > 0) {
        editRecipe.Images.forEach((file) => fd.append('images[]', file))
      }

      const res = await apiService.postMultipart(`/recipes/${editRecipe.id}`, fd)
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
      // Surface backend validation errors if available
      let desc = error?.message || "Failed to update recipe"
      const serverErr = (error?.response?.data?.error || error?.data?.error) as any
      if (serverErr && typeof serverErr === "object") {
        try {
          const parts: string[] = []
          for (const k of Object.keys(serverErr)) {
            const val = (serverErr as any)[k]
            if (Array.isArray(val)) parts.push(`${k}: ${val.join(", ")}`)
            else if (typeof val === "string") parts.push(`${k}: ${val}`)
          }
          if (parts.length > 0) desc = parts.join("; ")
        } catch {}
      }
      toast({ title: "Error", description: desc, variant: "destructive" })
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
                    onClick={() => setNewRecipe((s) => ({ ...s, Ingredients: [...(s.Ingredients || []), { name: "", amount: "", image: null }] }))}
                  >
                    Add
                  </Button>
                </div>
                <div className="grid gap-2">
                  {(newRecipe.Ingredients || []).map((ing, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="grid grid-cols-5 gap-2">
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
                      <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">Ingredient image (optional)</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = (e.target.files && e.target.files[0]) || null
                            const arr = [...(newRecipe.Ingredients || [])]
                            arr[idx] = { ...arr[idx], image: file }
                            setNewRecipe((s) => ({ ...s, Ingredients: arr }))
                          }}
                        />
                      </div>
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

              {/* Tags */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Tags</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewRecipe((s) => ({ ...s, Tags: [...(s.Tags || []), ""] }))}
                  >
                    Add
                  </Button>
                </div>
                <div className="grid gap-2">
                  {(newRecipe.Tags || []).map((t, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder="e.g. 2 or summer"
                        value={t}
                        onChange={(e) => {
                          const arr = [...(newRecipe.Tags || [])]
                          arr[idx] = e.target.value
                          setNewRecipe((s) => ({ ...s, Tags: arr }))
                        }}
                      />
                      <button
                        type="button"
                        className="px-2 rounded border text-sm hover:bg-muted"
                        onClick={() => setNewRecipe((s) => ({ ...s, Tags: (s.Tags || []).filter((_, i) => i !== idx) }))}
                        aria-label="Remove tag"
                        title="Remove"
                      >
                        <span className="inline-block leading-none">×</span>
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Sent as tags[0], tags[1], ...</p>
              </div>

              {/* Steps builder */}
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <Label>Steps</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewSteps((prev) => [...prev, { instructions: "", prep: 1, ingredientIndices: [], image: null }])}
                  >
                    Add Step
                  </Button>
                </div>
                <div className="grid gap-3">
                  {newSteps.map((st, i) => (
                    <div key={i} className="rounded border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Step {i + 1}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewSteps((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">Instructions</Label>
                        <textarea
                          className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Describe the step"
                          value={st.instructions}
                          onChange={(e) => {
                            const arr = [...newSteps]
                            arr[i] = { ...arr[i], instructions: e.target.value }
                            setNewSteps(arr)
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1">
                          <Label className="text-sm">Prep minutes</Label>
                          <Input
                            type="number"
                            value={st.prep}
                            onChange={(e) => {
                              const val = Number(e.target.value || 1)
                              const arr = [...newSteps]
                              arr[i] = { ...arr[i], prep: val }
                              setNewSteps(arr)
                            }}
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-sm">Step image (optional)</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = (e.target.files && e.target.files[0]) || null
                              const arr = [...newSteps]
                              arr[i] = { ...arr[i], image: file }
                              setNewSteps(arr)
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">Ingredient indices for this step</Label>
                        <div className="flex flex-wrap gap-3 text-sm">
                          {(newRecipe.Ingredients || []).map((ing, idx) => (
                            <label key={idx} className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={st.ingredientIndices.includes(idx)}
                                onChange={(e) => {
                                  const arr = [...newSteps]
                                  const set = new Set(arr[i].ingredientIndices)
                                  if (e.target.checked) set.add(idx)
                                  else set.delete(idx)
                                  arr[i] = { ...arr[i], ingredientIndices: Array.from(set.values()).sort((a,b)=>a-b) }
                                  setNewSteps(arr)
                                }}
                              />
                              <span>{ing.name || `#${idx+1}`}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Mark recipe as active</p>
                </div>
                <Switch checked={newRecipe.Is_active} onCheckedChange={(v) => setNewRecipe((s) => ({ ...s, Is_active: v }))} />
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="space-y-0.5">
                  <Label>Best choice</Label>
                  <p className="text-xs text-muted-foreground">Feature as best choice</p>
                </div>
                <Switch checked={newRecipe.isBestChoice} onCheckedChange={(v) => setNewRecipe((s) => ({ ...s, isBestChoice: v }))} />
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
              <Select
                value={String(perPage)}
                onValueChange={(val) => {
                  const n = Number(val)
                  setPerPage(n)
                  setCurrentPage(1)
                  // refetch with explicit size to avoid stale state (use per_page)
                  fetchRecipes(1, n)
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 (default)</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filters: Tags, Calories, Prep time */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Tags</Label>
                  <div className="flex flex-wrap gap-3">
                    {TAG_OPTIONS.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={tagSelections.includes(t.id)}
                          onCheckedChange={(checked) => {
                            setTagSelections((prev) => {
                              const set = new Set(prev)
                              if (checked) set.add(t.id)
                              else set.delete(t.id)
                              return Array.from(set)
                            })
                          }}
                        />
                        <span>{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="grid gap-1">
                  <Label className="text-sm">Min calories</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. 100"
                    value={minCalories}
                    onChange={(e) => setMinCalories(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-sm">Max calories</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. 200"
                    value={maxCalories}
                    onChange={(e) => setMaxCalories(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-sm">Min prep (min)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. 5"
                    value={minPrep}
                    onChange={(e) => setMinPrep(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-sm">Max prep (min)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. 45"
                    value={maxPrep}
                    onChange={(e) => setMaxPrep(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => fetchRecipes(1, perPage)}
                  disabled={loading}
                >
                  Apply filters
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTagSelections([])
                    setMinCalories("")
                    setMaxCalories("")
                    setMinPrep("")
                    setMaxPrep("")
                    setCurrentPage(1)
                    fetchRecipes(1, perPage)
                  }}
                  disabled={loading}
                >
                  Clear
                </Button>
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
                    <TableRow
                      key={recipe.Recipe_ID}
                      onClick={() => viewRecipe(recipe)}
                      className="cursor-pointer hover:bg-muted/30"
                    >
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
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
            {/* Pagination controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {lastPage}{total ? ` • ${total} items` : ""}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || currentPage <= 1}
                  onClick={() => {
                    const p = Math.max(1, currentPage - 1)
                    setCurrentPage(p)
                    fetchRecipes(p, perPage)
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || currentPage >= lastPage}
                  onClick={() => {
                    const p = Math.min(lastPage, currentPage + 1)
                    setCurrentPage(p)
                    fetchRecipes(p, perPage)
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
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
                {/* Tags and Best Choice */}
                {(() => {
                  const tags: any[] = (selectedRecipe as any).Tags ?? []
                  const hasBest = typeof (selectedRecipe as any).Is_best_choice !== 'undefined'
                  if ((!Array.isArray(tags) || tags.length === 0) && !hasBest) return null
                  return (
                    <div className="grid grid-cols-3 gap-4 text-sm items-start">
                      <div className="col-span-2">
                        {Array.isArray(tags) && tags.length > 0 ? (
                          <div>
                            <h3 className="font-semibold mb-2">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                              {tags.map((t: any, i: number) => (
                                <Badge key={i} variant="secondary">{t?.name || t?.slug || `#${t?.id ?? i+1}`}</Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      {hasBest ? (
                        <div className="flex items-center gap-2 justify-end">
                          <span>Best choice:</span>
                          {(selectedRecipe as any).Is_best_choice ? (
                            <Badge className="bg-green-100 text-green-800" variant="secondary">Yes</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800" variant="secondary">No</Badge>
                          )}
                        </div>
                      ) : null}
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
                {/* Steps */}
                {(() => {
                  // Detailed steps with optional ingredient indices and images
                  const detailed: any[] = (selectedRecipe as any).Recipe_steps ?? []
                  if (Array.isArray(detailed) && detailed.length > 0) {
                    // Base ingredients list to resolve indices per step
                    const baseIngs: any[] = (selectedRecipe as any).Ingredients ?? (selectedRecipe as any).ingredients ?? []
                    return (
                      <div>
                        <h3 className="font-semibold mb-2">Steps</h3>
                        <div className="space-y-3">
                          {detailed
                            .sort((a: any, b: any) => (a?.step_number ?? 0) - (b?.step_number ?? 0))
                            .map((st: any, idx: number) => (
                              <div key={st?.id ?? idx} className="rounded-md border p-3">
                                <div className="flex items-center justify-between mb-2 text-sm">
                                  <div className="font-medium">Step {st?.step_number ?? idx + 1}</div>
                                  {typeof st?.prep_minutes !== 'undefined' ? (
                                    <span className="text-muted-foreground">{st.prep_minutes} min</span>
                                  ) : null}
                                </div>
                                <p className="text-sm text-foreground">{st?.instructions || '-'}</p>
                                {(() => {
                                  // Ingredient indices can arrive under `ingredient_indices` or `ingredients`
                                  const raw = Array.isArray(st?.ingredient_indices)
                                    ? st.ingredient_indices
                                    : (Array.isArray(st?.ingredients) ? st.ingredients : [])
                                  const idxs: number[] = raw
                                    .map((n: any) => Number(n))
                                    .filter((n: number) => Number.isFinite(n) && n >= 0 && n < baseIngs.length)
                                  if (idxs.length === 0) return null
                                  return (
                                    <div className="mt-2">
                                      <div className="text-xs text-muted-foreground mb-1">Ingredients used:</div>
                                      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-0.5">
                                        {idxs.map((n: number, i2: number) => {
                                          const it: any = baseIngs[n]
                                          const name = typeof it === 'string' ? it : (it?.name ?? it?.ingredient ?? `#${n + 1}`)
                                          const amount = typeof it === 'string' ? '' : (it?.amount ?? it?.qty ?? '')
                                          return (
                                            <li key={i2}>
                                              {name}{amount ? ` — ${amount}` : ''}
                                            </li>
                                          )
                                        })}
                                      </ul>
                                    </div>
                                  )
                                })()}
                                {Array.isArray(st?.image) && st.image.length > 0 ? (
                                  <div className="grid grid-cols-3 gap-3 mt-3">
                                    {st.image.slice(0, 6).map((im: any, i: number) => (
                                      <div key={im?.id ?? i} className="aspect-square rounded border overflow-hidden bg-muted">
                                        {im?.url ? (
                                          <img src={im.url} alt={`Step ${st?.step_number} image ${i + 1}`} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full bg-muted" />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                        </div>
                      </div>
                    )
                  }
                  // Fallback to legacy simple steps
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
                  const ings: any[] = (selectedRecipe as any).Ingredients ?? (selectedRecipe as any).ingredients ?? []
                  if (!Array.isArray(ings) || ings.length === 0) return null
                  return (
                    <div>
                      <h3 className="font-semibold mb-2">Ingredients</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {ings.map((it: any, i: number) => {
                          if (typeof it === "string") {
                            return (
                              <div key={i} className="flex items-center gap-3 p-2 rounded border">
                                <div className="w-12 h-12 rounded bg-muted border" />
                                <div className="text-sm text-muted-foreground">{it}</div>
                              </div>
                            )
                          }
                          const name = it?.name ?? it?.ingredient ?? "—"
                          const amount = it?.amount ?? it?.qty ?? ""
                          const img = it?.image_url
                          return (
                            <div key={i} className="flex items-center gap-3 p-2 rounded border">
                              <div className="w-12 h-12 rounded overflow-hidden bg-muted border">
                                {img ? (
                                  <img src={img} alt={`${name} image`} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-muted" />
                                )}
                              </div>
                              <div className="text-sm">
                                <div className="font-medium text-foreground">{name}</div>
                                <div className="text-muted-foreground">{amount || ""}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
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
              {/* Existing images will be displayed beneath selector with removal controls */}
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
                    onClick={() => setEditRecipe((s) => ({ ...s, Ingredients: [...(s.Ingredients || []), { name: "", amount: "", image: null }] }))}
                  >
                    Add
                  </Button>
                </div>
                <div className="grid gap-2">
                  {(editRecipe.Ingredients || []).map((ing, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="grid grid-cols-5 gap-2">
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
                      <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">Ingredient image (optional)</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = (e.target.files && e.target.files[0]) || null
                            const arr = [...(editRecipe.Ingredients || [])]
                            arr[idx] = { ...arr[idx], image: file }
                            setEditRecipe((s) => ({ ...s, Ingredients: arr }))
                          }}
                        />
                      </div>
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

              {/* Tags (edit) */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Tags</Label>
                  {tagsLoading ? (<span className="text-xs text-muted-foreground">Loading tags…</span>) : null}
                </div>
                {tagOptions.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No tags available.</div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {tagOptions.map((t) => {
                      const checked = selectedEditTagIds.includes(t.id)
                      return (
                        <label key={t.id} className="flex items-center gap-2 text-sm border rounded px-2 py-1">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedEditTagIds((prev) => {
                                const set = new Set(prev)
                                if (e.target.checked) set.add(t.id)
                                else set.delete(t.id)
                                return Array.from(set.values())
                              })
                            }}
                          />
                          <span>{t.name}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Sent as tags[i] (IDs when available).</p>
              </div>

              {/* Steps builder (edit) */}
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <Label>Steps</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditSteps((prev) => [...prev, { instructions: "", prep: 1, ingredientIndices: [], image: null }])}
                  >
                    Add Step
                  </Button>
                </div>
                <div className="grid gap-3">
                  {editSteps.map((st, i) => (
                    <div key={i} className="rounded border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Step {i + 1}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditSteps((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">Instructions</Label>
                        <textarea
                          className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Describe the step"
                          value={st.instructions}
                          onChange={(e) => {
                            const arr = [...editSteps]
                            arr[i] = { ...arr[i], instructions: e.target.value }
                            setEditSteps(arr)
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1">
                          <Label className="text-sm">Prep minutes</Label>
                          <Input
                            type="number"
                            value={st.prep}
                            onChange={(e) => {
                              const val = Number(e.target.value || 1)
                              const arr = [...editSteps]
                              arr[i] = { ...arr[i], prep: val }
                              setEditSteps(arr)
                            }}
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-sm">Step image (optional)</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = (e.target.files && e.target.files[0]) || null
                              const arr = [...editSteps]
                              arr[i] = { ...arr[i], image: file }
                              setEditSteps(arr)
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm">Ingredient indices for this step</Label>
                        <div className="flex flex-wrap gap-3 text-sm">
                          {(editRecipe.Ingredients || []).map((ing, idx) => (
                            <label key={idx} className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={st.ingredientIndices.includes(idx)}
                                onChange={(e) => {
                                  const arr = [...editSteps]
                                  const set = new Set(arr[i].ingredientIndices)
                                  if (e.target.checked) set.add(idx)
                                  else set.delete(idx)
                                  arr[i] = { ...arr[i], ingredientIndices: Array.from(set.values()).sort((a,b)=>a-b) }
                                  setEditSteps(arr)
                                }}
                              />
                              <span>{ing.name || `#${idx+1}`}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Mark recipe as active</p>
                </div>
                <Switch checked={editRecipe.Is_active} onCheckedChange={(v) => setEditRecipe((s) => ({ ...s, Is_active: v }))} />
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="space-y-0.5">
                  <Label>Best choice</Label>
                  <p className="text-xs text-muted-foreground">Feature as best choice</p>
                </div>
                <Switch checked={editRecipe.isBestChoice} onCheckedChange={(v) => setEditRecipe((s) => ({ ...s, isBestChoice: v }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eimages">Images (add more)</Label>
                <Input
                  id="eimages"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []) as File[]
                    if (files.length === 0) return
                    setEditRecipe((s) => ({ ...s, Images: [...(s.Images || []), ...files] }))
                    // allow re-selecting the same file to trigger onChange again
                    if (e.currentTarget) e.currentTarget.value = ""
                  }}
                />
                {Array.isArray(editExistingImages) && editExistingImages.length > 0 && (
                  <div>
                    <Label className="text-xs font-normal">Existing Images (kept)</Label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {editExistingImages.map((img: any, i: number) => {
                        const src = getImageSrc(img)
                        return (
                          <div key={i} className="aspect-square rounded border overflow-hidden bg-muted">
                            {src ? (
                              <img src={src} alt={`Existing ${i + 1}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No Src</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {editImagePreviews.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {editImagePreviews.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded border overflow-hidden bg-muted">
                        <img src={src} alt={`New image ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          aria-label="Remove image"
                          onClick={() =>
                            setEditRecipe((s) => {
                              const next = (s.Images || []).slice()
                              next.splice(i, 1)
                              return { ...s, Images: next }
                            })
                          }
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black"
                          title="Remove"
                        >
                          <span className="inline-block leading-none">×</span>
                        </button>
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
