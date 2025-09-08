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
import { Search, MoreHorizontal, Eye, Utensils, Pen } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"
import { useAuth } from "@/contexts/auth-context"

type ApiMeal = { ID: number; Label: string; Recipe: string; Available: number }
type Meal = { id: number; label: string; recipe: string; available: boolean }

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
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
      const items: ApiMeal[] = Array.isArray(res?.data) ? res.data : []
      const mapped: Meal[] = items.map((m) => ({ id: m.ID, label: m.Label, recipe: m.Recipe || "", available: m.Available === 1 }))
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
      const res = await apiService.get("/recipes")
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
    const match = recipesOptions.find((r) => r.name === meal.recipe)
    setEditMeal({ id: meal.id, recipe_id: match ? match.id : null, label: meal.label, is_active: meal.available })
    setIsEditDialogOpen(true)
  }

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

  const viewMeal = (meal: Meal) => {
    setSelectedMeal(meal)
    setIsViewDialogOpen(true)
  }

  const filteredMeals = meals.filter(
    (meal) =>
      meal.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meal.recipe.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (meal.available ? "available" : "unavailable").includes(searchTerm.toLowerCase()),
  )

  // Derive recipe display name (maps numeric IDs to recipe names when possible)
  const getRecipeName = (recipeValue: any): string => {
    if (recipeValue === null || recipeValue === undefined) return ""
    const asNumber = typeof recipeValue === "number" ? recipeValue : Number(recipeValue)
    if (!Number.isNaN(asNumber) && asNumber > 0) {
      const match = recipesOptions.find((r) => r.id === asNumber)
      return match?.name ?? String(recipeValue)
    }
    return String(recipeValue)
  }

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
                  <TableHead>Meal Label</TableHead>
                  <TableHead>Recipe Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredMeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No meals found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMeals.map((meal) => (
                    <TableRow key={meal.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium flex items-center">
                            <Utensils className="mr-2 h-4 w-4" />
                            {meal.label}
                          </div>
                        </div>
                      </TableCell>
               <TableCell>
                 <div className="text-sm text-muted-foreground truncate">{getRecipeName(meal.recipe)}</div>
               </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant={meal.available ? "default" : "secondary"} className={meal.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {meal.available ? "available" : "unavailable"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewMeal(meal)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View 
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(meal)}>
                              <Pen className="mr-2 h-4 w-4" />
                              Edit 
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
          <DialogContent className="sm:max-w-[500px]">
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
          <DialogContent className="sm:max-w-[500px]">
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
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Utensils className="mr-2 h-5 w-5" />
                {selectedMeal?.label}
              </DialogTitle>
              <DialogDescription>Meal ID: {selectedMeal?.id}</DialogDescription>
            </DialogHeader>
            {selectedMeal && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <div className="text-sm text-muted-foreground">{selectedMeal.recipe || "No description"}</div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Status</h4>
                  <Badge variant={selectedMeal.available ? "default" : "secondary"} className={selectedMeal.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {selectedMeal.available ? "available" : "unavailable"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">ID: {selectedMeal.id}</div>
                  <div className="text-sm text-muted-foreground">Label: {selectedMeal.label}</div>
                </div>
              </div>
            )}
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
