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
import { Search, MoreHorizontal, Eye, Plus } from "lucide-react"
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
}

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
  })
  const [editExistingImages, setEditExistingImages] = useState<any[]>([])
  const [newRecipe, setNewRecipe] = useState({
    Name: "",
    Description: "",
    Calories: "" as string | number,
    Prep_minutes: "" as string | number,
    Is_active: true,
  })
  const [newImages, setNewImages] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const { toast } = useToast()
  const { token, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (token) {
      fetchRecipes()
    } else if (!authLoading) {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authLoading])

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
  { setNewRecipe({ Name: "", Description: "", Calories: "", Prep_minutes: "", Is_active: true }); setNewImages([]); setNewImagePreviews([]) }

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
      if (newImages.length > 0) {
        const fd = new FormData()
        fd.append("name", nameVal)
        fd.append("description", descVal)
        fd.append("calories_kcal", String(calNum))
        fd.append("prep_minutes", String(prepNum))
        fd.append("is_active", newRecipe.Is_active ? "1" : "0")
        for (const file of newImages) fd.append("images[]", file)
        res = await apiService.postMultipart("/recipes", fd)
      } else {
        const payload: any = {
          name: nameVal,
          description: descVal,
          calories_kcal: calNum,
          prep_minutes: prepNum,
          is_active: newRecipe.Is_active ? 1 : 0,
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

  const openEdit = (recipe: ApiRecipe) => {
    setEditRecipe({
      id: recipe.Recipe_ID,
      Name: recipe.Name || "",
      Description: recipe.Description || "",
      Calories: recipe.Calories ?? "",
      Prep_minutes: recipe.Prep_minutes ?? "",
      Is_active: recipe.Is_active === 1,
      Images: [],
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
                  <Label htmlFor="cal">Calories</Label>
                  <Input id="cal" type="number" value={newRecipe.Calories} onChange={(e) => setNewRecipe((s) => ({ ...s, Calories: e.target.value }))} placeholder="e.g. 450" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prep">Prep minutes</Label>
                  <Input id="prep" type="number" value={newRecipe.Prep_minutes} onChange={(e) => setNewRecipe((s) => ({ ...s, Prep_minutes: e.target.value }))} placeholder="e.g. 20" />
                </div>
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
                  <TableHead>Calories</TableHead>
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
                            <DropdownMenuItem onClick={() => viewRecipe(recipe)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(recipe)}>
                              <Eye className="mr-2 h-4 w-4" />
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
                  <Label htmlFor="ecal">Calories</Label>
                  <Input id="ecal" type="number" value={editRecipe.Calories} onChange={(e) => setEditRecipe((s) => ({ ...s, Calories: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="eprep">Prep minutes</Label>
                  <Input id="eprep" type="number" value={editRecipe.Prep_minutes} onChange={(e) => setEditRecipe((s) => ({ ...s, Prep_minutes: e.target.value }))} />
                </div>
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
