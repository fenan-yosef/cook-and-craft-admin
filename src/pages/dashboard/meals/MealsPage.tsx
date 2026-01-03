import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, MoreHorizontal, Eye, Utensils, Pen, Trash2, Crown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"
import { useAuth } from "@/contexts/auth-context"

type ApiRecipe = {
  ID: number
  Name: string
  Description?: string
  CaloriesKCal?: number
  PrepMinutes?: number
  Ingredients?: Array<{ name: string; amount?: string }>
  // Can be array or object depending on endpoint
  NutritionFacts?: Array<{ label: string; value: string }> | Record<string, any>
  Utensils?: string[]
  Steps?: string[]
  RecipeSteps?: Array<{ id?: number; step_number?: number; instructions?: string; prep_minutes?: number; image?: Array<{ id: number; url: string; isThumbnail?: boolean }> }>
  IsActive?: number
  IsBestChoice?: number
  Tags?: Array<{ id: number; name: string; slug?: string }>
  Images?: Array<{ ID: number; URL: string; IsThumbnail?: boolean }>
}

type ApiAddonLink = { id: number; max_free_quantity?: number; addon?: { id: number; name: string; description?: string; price?: number; is_active?: number; images?: Array<{ id: number; url: string; is_thumbnail?: boolean }> } }
type ApiMeal = { ID: number; Label: string; Recipe: any; Available: number; IsDefault?: number; Addons?: ApiAddonLink[] }
type Meal = { id: number; label: string; recipe: any; available: boolean; isDefault?: boolean; addons?: ApiAddonLink[] }

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [recipesOptions, setRecipesOptions] = useState<{ id: number; name: string }[]>([])
  const [recipesLoading, setRecipesLoading] = useState(false)
  const [newMeal, setNewMeal] = useState<{ recipe_id: number | null; label: string; is_active: boolean }>({
    recipe_id: null,
    label: "",
    is_active: true,
  })
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editMeal, setEditMeal] = useState<{ id: number; recipe_id: number | null; label: string; is_active: boolean }>({
    id: 0,
    recipe_id: null,
    label: "",
    is_active: true,
  })
  const [viewBaseMeal, setViewBaseMeal] = useState<Meal | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { toast } = useToast()
  const { token, isLoading: authLoading } = useAuth()

  // Ensure auth header is present
  useEffect(() => {
    const t = token || (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null)
    apiService.setAuthToken(t || null)
  }, [token])

  useEffect(() => {
    if (token) {
      fetchMeals()
      fetchRecipesOptions()
    } else if (!authLoading) {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authLoading])

  const fetchMeals = async () => {
    try {
      setLoading(true)
      const res = await apiService.get("/meals")
      const raw = res?.data
      const arr: ApiMeal[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])
      const mapped: Meal[] = arr.map((m) => ({
        id: m.ID,
        label: m.Label,
        recipe: m.Recipe ?? "",
        available: m.Available === 1,
        isDefault: (m.IsDefault ?? 0) === 1,
        addons: Array.isArray(m.Addons) ? m.Addons : [],
      }))
      setMeals(mapped)
    } catch (error) {
      toast({
        title: "Error",
        description: (error as any)?.message || "Failed to fetch meals",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  // No create/delete here; only fetching and viewing with the available fields

  const fetchRecipesOptions = async () => {
    try {
      setRecipesLoading(true)
      const res = await apiService.get("/admins/recipes")
      const items: any[] = Array.isArray(res?.data) ? res.data : []
      const opts = items.map((r) => ({ id: r.Recipe_ID ?? r.id ?? r.recipe_id, name: r.Name ?? r.name ?? "Unnamed" })).filter((o) => o.id)
      setRecipesOptions(opts)
    } catch (error) {
      // silent; dropdown can be empty
    } finally {
      setRecipesLoading(false)
    }
  }

  const resetNewMeal = () => {
    setNewMeal({ recipe_id: null, label: "", is_active: true })
  }

  const createMeal = async () => {
    try {
      const errs: string[] = []
      if (!newMeal.recipe_id) errs.push("Recipe is required")
      if (!newMeal.label.trim()) errs.push("Label is required")
      if (errs.length) {
        toast({ title: "Validation", description: errs.join("; ") })
        return
      }
      setCreating(true)
      const payload: any = {
        recipe_id: newMeal.recipe_id,
        label: newMeal.label.trim(),
        lable: newMeal.label.trim(), // include common misspelling just in case
        is_active: newMeal.is_active ? 1 : 0,
      }
      const res = await apiService.post("/meals", payload)
      const created = Array.isArray(res?.data) && res.data.length > 0 ? res.data[0] : null
      if (created) {
        // Remap and prepend
        const m: Meal = {
          id: created.ID ?? created.id,
          label: created.Label ?? created.label ?? newMeal.label.trim(),
          recipe: created.Recipe ?? created.recipe ?? "",
          available: (created.Available ?? created.is_active ?? 1) === 1,
        }
        setMeals((prev) => [m, ...prev])
      } else {
        await fetchMeals()
      }
      toast({ title: "Success", description: "Meal created" })
      setIsCreateDialogOpen(false)
      resetNewMeal()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to create meal", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (meal: Meal) => {
    const getIdFromValue = (val: any): number | null => {
      if (val && typeof val === "object") {
        const raw = (val as any).ID ?? (val as any).id
        const n = typeof raw === "number" ? raw : Number(raw)
        return Number.isFinite(n) && n > 0 ? n : null
      }
      const n = typeof val === "number" ? val : Number(val)
      return Number.isFinite(n) && n > 0 ? n : null
    }
    let recipeId: number | null = getIdFromValue(meal.recipe)
    if (!recipeId) {
      const name = getRecipeName(meal.recipe)
      const match = recipesOptions.find((r) => r.name === name)
      recipeId = match ? match.id : null
    }
    setEditMeal({ id: meal.id, recipe_id: recipeId, label: meal.label, is_active: meal.available })
    setSelectedMeal(meal)
    setIsEditDialogOpen(true)
  }

  // Ensure the edit dropdown selects the current recipe once options are available
  useEffect(() => {
    if (!isEditDialogOpen || !selectedMeal) return
    if (editMeal.recipe_id) return
    const idFromObj = (() => {
      const rv = selectedMeal.recipe
      if (rv && typeof rv === "object") {
        const raw = (rv as any).ID ?? (rv as any).id
        const n = typeof raw === "number" ? raw : Number(raw)
        return Number.isFinite(n) && n > 0 ? n : null
      }
      const n = typeof rv === "number" ? rv : Number(rv)
      return Number.isFinite(n) && n > 0 ? n : null
    })()
    let rid: number | null = idFromObj
    if (!rid) {
      const name = getRecipeName(selectedMeal.recipe)
      const match = recipesOptions.find((r) => r.name === name)
      rid = match ? match.id : null
    }
    if (rid) setEditMeal((s) => ({ ...s, recipe_id: rid }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipesOptions, isEditDialogOpen])

  const submitEdit = async () => {
    try {
      const errs: string[] = []
      if (!editMeal.recipe_id) errs.push("Recipe is required")
      if (!editMeal.label.trim()) errs.push("Label is required")
      if (errs.length) {
        toast({ title: "Validation", description: errs.join("; ") })
        return
      }
      setEditing(true)
      const payload: any = {
        recipe_id: editMeal.recipe_id,
        label: editMeal.label.trim(),
        lable: editMeal.label.trim(),
        is_active: editMeal.is_active ? 1 : 0,
      }
      const res = await apiService.post(`/meals/${editMeal.id}?_method=put`, payload)
      const updated = Array.isArray(res?.data) && res.data.length > 0 ? res.data[0] : null
      if (updated) {
        const m: Meal = {
          id: updated.ID ?? updated.id ?? editMeal.id,
          label: updated.Label ?? updated.label ?? editMeal.label,
          recipe: updated.Recipe ?? updated.recipe ?? (recipesOptions.find((r) => r.id === editMeal.recipe_id)?.name || ""),
          available: (updated.Available ?? updated.is_active ?? (editMeal.is_active ? 1 : 0)) === 1,
        }
        setMeals((prev) => prev.map((x) => (x.id === m.id ? m : x)))
      } else {
        await fetchMeals()
      }
      toast({ title: "Updated", description: "Meal updated" })
      setIsEditDialogOpen(false)
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to update meal", variant: "destructive" })
    } finally {
      setEditing(false)
    }
  }

  const viewMeal = async (meal: Meal) => {
    setViewBaseMeal(meal)
    setSelectedMeal(null)
    setIsViewDialogOpen(true)
    setViewLoading(true)
    try {
      const res = await apiService.get(`/meals/${meal.id}`)
      const raw = res?.data
      const obj: any = raw && !Array.isArray(raw) ? (raw.data ?? raw) : null
      if (obj) {
        // Merge all fields from both sources, preferring detail API but falling back to list data
        const detailed: Meal = {
          ...meal, // fallback fields
          ...{
            id: obj.ID ?? meal.id,
            label: obj.Label ?? meal.label,
            recipe: obj.Recipe ?? meal.recipe,
            available: (obj.Available ?? (meal.available ? 1 : 0)) === 1,
            isDefault: (obj.IsDefault ?? (meal.isDefault ? 1 : 0)) === 1,
            addons: Array.isArray(obj.Addons) ? obj.Addons : meal.addons ?? [],
          },
        }
        // Attach all other fields from obj (e.g., Recipe fields, tags, etc.)
        setSelectedMeal({ ...detailed, ...obj })
      } else {
        setSelectedMeal(meal)
      }
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to load meal details", variant: "destructive" })
      setSelectedMeal(meal)
    } finally {
      setViewLoading(false)
    }
  }

  const deleteMeal = async (meal: Meal) => {
    if (deletingId !== null) return
    if (!window.confirm(`Delete meal "${meal.label}"? This action cannot be undone.`)) return
    setDeletingId(meal.id)
    try {
      await apiService.delete(`/meals/${meal.id}`)
      setMeals(prev => prev.filter(m => m.id !== meal.id))
      if ((selectedMeal?.id ?? viewBaseMeal?.id) === meal.id) {
        setIsViewDialogOpen(false)
        setSelectedMeal(null)
        setViewBaseMeal(null)
        setViewLoading(false)
      }
      toast({ title: 'Deleted', description: 'Meal removed.' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to delete meal', variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  // filtering moved below after helpers

  // Helpers to read recipe data (supports object or legacy string/id)
  const getRecipeName = (recipeValue: any): string => {
    if (recipeValue === null || recipeValue === undefined) return ""
    if (typeof recipeValue === "object") {
      // API now returns a recipe object
      return recipeValue.Name || recipeValue.name || ""
    }
    const asNumber = typeof recipeValue === "number" ? recipeValue : Number(recipeValue)
    if (!Number.isNaN(asNumber) && asNumber > 0) {
      const match = recipesOptions.find((r) => r.id === asNumber)
      return match?.name ?? String(recipeValue)
    }
    return String(recipeValue)
  }

  const getRecipeObject = (recipeValue: any): ApiRecipe | null => {
    if (recipeValue && typeof recipeValue === "object" && (recipeValue.Name || recipeValue.ID)) return recipeValue as ApiRecipe
    return null
  }

  const normalizeNutritionFacts = (nf: ApiRecipe["NutritionFacts"]): Array<{ label: string; value: string }> => {
    if (!nf) return []
    if (Array.isArray(nf)) return nf as Array<{ label: string; value: string }>
    const obj = nf as Record<string, any>
    return Object.entries(obj).map(([k, v]) => ({ label: k.replace(/_/g, " "), value: String(v) }))
  }

  const getRecipeSteps = (rec: ApiRecipe | null): Array<{ step_number?: number; instructions?: string; image?: Array<{ id: number; url: string; isThumbnail?: boolean }> }> => {
    if (!rec) return []
    if (Array.isArray(rec.RecipeSteps) && rec.RecipeSteps.length > 0) {
      return rec.RecipeSteps.map(s => ({ step_number: s.step_number, instructions: s.instructions, image: s.image }))
    }
    if (Array.isArray(rec.Steps) && rec.Steps.length > 0) {
      return (rec.Steps as any[]).map((txt, idx) => ({ step_number: idx + 1, instructions: String(txt) }))
    }
    return []
  }

  // Filter using recipe name safely (supports object/id/string)
  const filteredMeals = meals.filter((meal) => {
    const q = searchTerm.toLowerCase()
    const recipeName = getRecipeName(meal.recipe).toLowerCase()
    return (
      meal.label.toLowerCase().includes(q) ||
      recipeName.includes(q) ||
      (meal.available ? "available" : "unavailable").includes(q)
    )
  })

  const displayMeal = selectedMeal ?? viewBaseMeal

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Meals</h2>
          <Button disabled={!token || authLoading} onClick={() => setIsCreateDialogOpen(true)}>
            <Utensils className="mr-2 h-4 w-4" /> Add Meal
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Meals</CardTitle>
            <CardDescription>List of meals from the API</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search meals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Meal Label</TableHead>
                  <TableHead>Recipe Name</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Addons</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredMeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No meals found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMeals.map((meal) => (
                    <TableRow
                      key={meal.id}
                      onClick={() => viewMeal(meal)}
                      className="cursor-pointer hover:bg-muted/30"
                    >
                      <TableCell className="w-[64px]">
                        {(() => {
                          const rec = getRecipeObject(meal.recipe)
                          const thumb = rec?.Images?.find((i) => i.IsThumbnail)?.URL || rec?.Images?.[0]?.URL
                          return thumb ? (
                            <img src={thumb} alt={getRecipeName(meal.recipe)} className="h-10 w-10 object-cover rounded" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted" />
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium flex items-center">
                            <Utensils className="mr-2 h-4 w-4" />
                            {meal.label}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const rec = getRecipeObject(meal.recipe)
                          const name = getRecipeName(meal.recipe)
                          const tagsCount = Array.isArray(rec?.Tags) ? rec!.Tags!.length : 0
                          const isBest = (rec?.IsBestChoice ?? 0) === 1
                          return (
                            <div className="flex items-center gap-2 max-w-xs">
                              <div className="text-sm text-muted-foreground truncate">{name}</div>
                              {isBest && (
                                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 flex items-center gap-1 bg-yellow-100 text-yellow-800">
                                  <Crown className="h-3 w-3" /> Best
                                </Badge>
                              )}
                              {tagsCount > 0 && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                  {tagsCount} tags
                                </Badge>
                              )}
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        {meal.isDefault ? (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{Array.isArray(meal.addons) ? meal.addons.length : 0}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant={meal.available ? "default" : "secondary"} className={meal.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {meal.available ? "available" : "unavailable"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewMeal(meal)} disabled={deletingId === meal.id}>
                              <Eye className="mr-2 h-4 w-4" />
                              View 
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(meal)} disabled={deletingId === meal.id}>
                              <Pen className="mr-2 h-4 w-4" />
                              Edit 
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-700" disabled={deletingId === meal.id} onClick={() => deleteMeal(meal)}>
                              {deletingId === meal.id ? (
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

        {/* Create Meal Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(o) => { setIsCreateDialogOpen(o); if (!o) resetNewMeal() }}>
          <DialogContent className="sm:max-w-[500px] animate-in fade-in-0 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle>Add Meal</DialogTitle>
              <DialogDescription>Create a new meal.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Recipe</Label>
                <Select
                  value={newMeal.recipe_id ? String(newMeal.recipe_id) : ""}
                  onValueChange={(v) => setNewMeal((s) => ({ ...s, recipe_id: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={recipesLoading ? "Loading recipes..." : "Select a recipe"} />
                  </SelectTrigger>
                  <SelectContent>
                    {recipesOptions.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mlabel">Label</Label>
                <Input id="mlabel" value={newMeal.label} onChange={(e) => setNewMeal((s) => ({ ...s, label: e.target.value }))} placeholder="Meal label" />
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Mark meal as active</p>
                </div>
                <Switch checked={newMeal.is_active} onCheckedChange={(v) => setNewMeal((s) => ({ ...s, is_active: v }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={creating}>Cancel</Button>
              <Button onClick={createMeal} disabled={creating}>{creating ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Meal Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] animate-in fade-in-0 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle>Edit Meal</DialogTitle>
              <DialogDescription>Update meal details.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Recipe</Label>
                <Select
                  value={editMeal.recipe_id ? String(editMeal.recipe_id) : ""}
                  onValueChange={(v) => setEditMeal((s) => ({ ...s, recipe_id: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={recipesLoading ? "Loading recipes..." : "Select a recipe"} />
                  </SelectTrigger>
                  <SelectContent>
                    {recipesOptions.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="elabel">Label</Label>
                <Input id="elabel" value={editMeal.label} onChange={(e) => setEditMeal((s) => ({ ...s, label: e.target.value }))} placeholder="Meal label" />
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Mark meal as active</p>
                </div>
                <Switch checked={editMeal.is_active} onCheckedChange={(v) => setEditMeal((s) => ({ ...s, is_active: v }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={editing}>Cancel</Button>
              <Button onClick={submitEdit} disabled={editing}>{editing ? "Saving..." : "Save changes"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Meal Dialog */}
        <Dialog
          open={isViewDialogOpen}
          onOpenChange={(open) => {
            setIsViewDialogOpen(open)
            if (!open) {
              setSelectedMeal(null)
              setViewBaseMeal(null)
              setViewLoading(false)
            }
          }}
        >
          <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto nice-scrollbar animate-in fade-in-0 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Utensils className="mr-2 h-5 w-5" />
                {displayMeal?.label ?? "Meal"}
              </DialogTitle>
              <DialogDescription>Meal ID: {displayMeal?.id ?? "—"}</DialogDescription>
            </DialogHeader>
            {viewLoading ? (
              <div className="space-y-6" aria-live="polite">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <div className="flex gap-3">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ) : selectedMeal ? (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Recipe</h4>
                  {(() => {
                    const rec = getRecipeObject(selectedMeal.recipe)
                    const name = getRecipeName(selectedMeal.recipe)
                    if (!rec && !name) return <div className="text-sm text-muted-foreground">No recipe info</div>
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium">{name}</div>
                          {rec?.Images && rec.Images.length > 0 && (
                            <img src={rec.Images.find((i) => i.IsThumbnail)?.URL || rec.Images[0].URL} alt={name} className="h-14 w-14 object-cover rounded" />
                          )}
                        </div>
                        {rec?.Description && (
                          <div>
                            <div className="text-xs uppercase text-muted-foreground mb-1">Description</div>
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{rec.Description}</div>
                          </div>
                        )}
                        {(rec?.CaloriesKCal || rec?.PrepMinutes) && (
                          <div className="flex flex-wrap gap-4 text-sm">
                            {rec?.CaloriesKCal ? <div><span className="text-muted-foreground">Calories: </span>{rec.CaloriesKCal} kcal</div> : null}
                            {rec?.PrepMinutes ? <div><span className="text-muted-foreground">Prep: </span>{rec.PrepMinutes} min</div> : null}
                          </div>
                        )}
                        {Array.isArray(rec?.Ingredients) && rec!.Ingredients!.length > 0 && (
                          <div>
                            <div className="text-xs uppercase text-muted-foreground mb-1">Ingredients</div>
                            <ul className="list-disc pl-5 text-sm">
                              {rec!.Ingredients!.map((ing, idx) => (
                                <li key={idx}>{ing.name}{ing.amount ? ` - ${ing.amount}` : ""}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {normalizeNutritionFacts(rec?.NutritionFacts).length > 0 && (
                          <div>
                            <div className="text-xs uppercase text-muted-foreground mb-1">Nutrition Facts</div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                              {normalizeNutritionFacts(rec!.NutritionFacts!).map((nf, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                  <span className="text-muted-foreground">{nf.label}</span>
                                  <span>{nf.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {rec?.Utensils && rec.Utensils.length > 0 && (
                          <div>
                            <div className="text-xs uppercase text-muted-foreground mb-1">Utensils</div>
                            <ul className="list-disc pl-5 text-sm">
                              {rec.Utensils.flatMap((u) => String(u).split(",")).map((u, idx) => (<li key={idx}>{u.trim()}</li>))}
                            </ul>
                          </div>
                        )}
                        {(() => {
                          const steps = getRecipeSteps(rec)
                          if (steps.length === 0) return null
                          return (
                            <div>
                              <div className="text-xs uppercase text-muted-foreground mb-1">Steps</div>
                              <ol className="list-decimal pl-5 space-y-2 text-sm">
                                {steps.map((s, idx) => (
                                  <li key={idx}>
                                    <div>{s.instructions}</div>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )
                        })()}
                        {rec?.Tags && rec.Tags.length > 0 && (
                          <div>
                            <div className="text-xs uppercase text-muted-foreground mb-1">Tags</div>
                            <div className="flex flex-wrap gap-2">
                              {rec.Tags.map((t) => (
                                <Badge key={t.id} variant="secondary">{t.name}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Status</h4>
                  <Badge variant={selectedMeal.available ? "default" : "secondary"} className={selectedMeal.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {selectedMeal.available ? "available" : "unavailable"}
                  </Badge>
                  {selectedMeal.isDefault ? (
                    <span className="ml-2 text-xs text-muted-foreground">Default</span>
                  ) : null}
                </div>

                {Array.isArray(selectedMeal.addons) && selectedMeal.addons.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Addons</h4>
                    <div className="space-y-2">
                      {selectedMeal.addons.map((a) => (
                        <div key={a.id} className="flex items-center justify-between text-sm">
                          <div className="flex-1">
                            <div className="font-medium">{a.addon?.name}</div>
                            {a.addon?.description ? (
                              <div className="text-muted-foreground">{a.addon.description}</div>
                            ) : null}
                          </div>
                          <div className="text-right">
                            {typeof a.max_free_quantity === "number" ? <div className="text-xs text-muted-foreground">Free qty: {a.max_free_quantity}</div> : null}
                            {typeof a.addon?.price === "number" ? <div className="font-medium">{a.addon.price}</div> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">ID: {selectedMeal.id}</div>
                  <div className="text-sm text-muted-foreground">Label: {selectedMeal.label}</div>
                </div>
              </div>
            ) : displayMeal ? (
              <div className="text-sm text-muted-foreground">No additional details available.</div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
