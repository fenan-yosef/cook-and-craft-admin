"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, MoreHorizontal, Plus, Edit, Trash2, Utensils, Zap, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProfileAvatar } from "@/components/profile-avatar"

interface Recipe {
  id: number
  name: string
  prep_time: number
  cook_time: number
}

interface Meal {
  id: number
  name: string
  description: string
  recipes: Recipe[]
  total_calories: number
  total_prep_time: number
  total_cook_time: number
  meal_type: "breakfast" | "lunch" | "dinner" | "snack"
  dietary_tags: string[]
  created_at: string
  updated_at: string
}

const mealTypeColors = {
  breakfast: "bg-yellow-100 text-yellow-800",
  lunch: "bg-green-100 text-green-800",
  dinner: "bg-blue-100 text-blue-800",
  snack: "bg-purple-100 text-purple-800",
}

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [newMeal, setNewMeal] = useState({
    name: "",
    description: "",
    meal_type: "lunch" as "breakfast" | "lunch" | "dinner" | "snack",
    dietary_tags: "",
    selected_recipes: [] as number[],
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchMeals()
    fetchAvailableRecipes()
  }, [])

  const fetchMeals = async () => {
    try {
      setLoading(true)
      // Mock data for demonstration
      const mockMeals: Meal[] = [
        {
          id: 1,
          name: "Mediterranean Power Bowl",
          description: "A complete meal with quinoa bowl and grilled chicken",
          recipes: [
            { id: 1, name: "Mediterranean Quinoa Bowl", prep_time: 20, cook_time: 15 },
            { id: 4, name: "Grilled Lemon Herb Chicken", prep_time: 10, cook_time: 20 },
          ],
          total_calories: 650,
          total_prep_time: 30,
          total_cook_time: 35,
          meal_type: "lunch",
          dietary_tags: ["high-protein", "healthy", "gluten-free"],
          created_at: "2024-01-20T10:30:00Z",
          updated_at: "2024-01-20T10:30:00Z",
        },
        {
          id: 2,
          name: "Thai Fusion Dinner",
          description: "Spicy Thai basil chicken with jasmine rice and spring rolls",
          recipes: [
            { id: 2, name: "Spicy Thai Basil Chicken", prep_time: 15, cook_time: 10 },
            { id: 5, name: "Jasmine Rice", prep_time: 5, cook_time: 18 },
            { id: 6, name: "Fresh Spring Rolls", prep_time: 25, cook_time: 0 },
          ],
          total_calories: 820,
          total_prep_time: 45,
          total_cook_time: 28,
          meal_type: "dinner",
          dietary_tags: ["spicy", "asian-fusion"],
          created_at: "2024-01-19T14:22:00Z",
          updated_at: "2024-01-19T14:22:00Z",
        },
        {
          id: 3,
          name: "French Comfort Feast",
          description: "Classic coq au vin with roasted vegetables and crusty bread",
          recipes: [
            { id: 3, name: "Classic French Coq au Vin", prep_time: 30, cook_time: 90 },
            { id: 7, name: "Roasted Root Vegetables", prep_time: 15, cook_time: 45 },
            { id: 8, name: "Crusty French Bread", prep_time: 10, cook_time: 0 },
          ],
          total_calories: 950,
          total_prep_time: 55,
          total_cook_time: 135,
          meal_type: "dinner",
          dietary_tags: ["comfort-food", "wine-pairing", "french"],
          created_at: "2024-01-18T16:45:00Z",
          updated_at: "2024-01-18T16:45:00Z",
        },
      ]
      setMeals(mockMeals)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch meals",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableRecipes = async () => {
    try {
      // Mock available recipes
      const mockRecipes: Recipe[] = [
        { id: 1, name: "Mediterranean Quinoa Bowl", prep_time: 20, cook_time: 15 },
        { id: 2, name: "Spicy Thai Basil Chicken", prep_time: 15, cook_time: 10 },
        { id: 3, name: "Classic French Coq au Vin", prep_time: 30, cook_time: 90 },
        { id: 4, name: "Grilled Lemon Herb Chicken", prep_time: 10, cook_time: 20 },
        { id: 5, name: "Jasmine Rice", prep_time: 5, cook_time: 18 },
        { id: 6, name: "Fresh Spring Rolls", prep_time: 25, cook_time: 0 },
        { id: 7, name: "Roasted Root Vegetables", prep_time: 15, cook_time: 45 },
        { id: 8, name: "Crusty French Bread", prep_time: 10, cook_time: 0 },
      ]
      setAvailableRecipes(mockRecipes)
    } catch (error) {
      console.error("Failed to fetch recipes:", error)
    }
  }

  const createMeal = async () => {
    try {
      const selectedRecipeObjects = availableRecipes.filter((recipe) => newMeal.selected_recipes.includes(recipe.id))

      const mealData = {
        ...newMeal,
        recipes: selectedRecipeObjects,
        total_prep_time: selectedRecipeObjects.reduce((sum, recipe) => sum + recipe.prep_time, 0),
        total_cook_time: selectedRecipeObjects.reduce((sum, recipe) => sum + recipe.cook_time, 0),
        total_calories: selectedRecipeObjects.length * 300, // Mock calculation
        dietary_tags: newMeal.dietary_tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      }

      // In real app: await apiService.post("/meals", mealData)
      const mockNewMeal: Meal = {
        id: Date.now(),
        ...mealData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setMeals([mockNewMeal, ...meals])
      setIsCreateDialogOpen(false)
      setNewMeal({
        name: "",
        description: "",
        meal_type: "lunch",
        dietary_tags: "",
        selected_recipes: [],
      })

      toast({
        title: "Success",
        description: "Meal created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create meal",
        variant: "destructive",
      })
    }
  }

  const deleteMeal = async (mealId: number) => {
    try {
      // In real app: await apiService.delete(`/meals/${mealId}`)
      setMeals(meals.filter((meal) => meal.id !== mealId))
      toast({
        title: "Success",
        description: "Meal deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete meal",
        variant: "destructive",
      })
    }
  }

  const viewMeal = (meal: Meal) => {
    setSelectedMeal(meal)
    setIsViewDialogOpen(true)
  }

  const handleRecipeSelection = (recipeId: number, checked: boolean) => {
    if (checked) {
      setNewMeal({ ...newMeal, selected_recipes: [...newMeal.selected_recipes, recipeId] })
    } else {
      setNewMeal({
        ...newMeal,
        selected_recipes: newMeal.selected_recipes.filter((id) => id !== recipeId),
      })
    }
  }

  const filteredMeals = meals.filter(
    (meal) =>
      meal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meal.meal_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meal.dietary_tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Meals</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Meal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Meal</DialogTitle>
                <DialogDescription>Combine recipes to create a complete meal</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newMeal.name}
                    onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                    className="col-span-3"
                    placeholder="Mediterranean Power Bowl"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={newMeal.description}
                    onChange={(e) => setNewMeal({ ...newMeal, description: e.target.value })}
                    className="col-span-3"
                    placeholder="A complete meal with..."
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="meal_type" className="text-right">
                    Meal Type
                  </Label>
                  <select
                    id="meal_type"
                    value={newMeal.meal_type}
                    onChange={(e) =>
                      setNewMeal({
                        ...newMeal,
                        meal_type: e.target.value as "breakfast" | "lunch" | "dinner" | "snack",
                      })
                    }
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dietary_tags" className="text-right">
                    Dietary Tags
                  </Label>
                  <Input
                    id="dietary_tags"
                    value={newMeal.dietary_tags}
                    onChange={(e) => setNewMeal({ ...newMeal, dietary_tags: e.target.value })}
                    className="col-span-3"
                    placeholder="high-protein, healthy, gluten-free"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right mt-2">Select Recipes</Label>
                  <div className="col-span-3 space-y-2 max-h-40 overflow-y-auto">
                    {availableRecipes.map((recipe) => (
                      <div key={recipe.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`recipe-${recipe.id}`}
                          checked={newMeal.selected_recipes.includes(recipe.id)}
                          onCheckedChange={(checked) => handleRecipeSelection(recipe.id, checked as boolean)}
                        />
                        <Label htmlFor={`recipe-${recipe.id}`} className="text-sm">
                          {recipe.name} ({recipe.prep_time + recipe.cook_time}m)
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={createMeal} disabled={newMeal.selected_recipes.length === 0}>
                  Create Meal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Meals</CardTitle>
            <CardDescription>Manage meal combinations for subscription plans</CardDescription>
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
                  <TableHead>Meal</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipes</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Calories</TableHead>
                  <TableHead>Tags</TableHead>
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
                    <TableRow key={meal.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium flex items-center">
                            <Utensils className="mr-2 h-4 w-4" />
                            {meal.name}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">{meal.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={mealTypeColors[meal.meal_type]}>{meal.meal_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {meal.recipes.length} recipe{meal.recipes.length !== 1 ? "s" : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Prep: {meal.total_prep_time}m</div>
                          <div>Cook: {meal.total_cook_time}m</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Zap className="mr-1 h-3 w-3" />
                          {meal.total_calories}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {meal.dietary_tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {meal.dietary_tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{meal.dietary_tags.length - 2}
                            </Badge>
                          )}
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
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => deleteMeal(meal.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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

        {/* View Meal Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Utensils className="mr-2 h-5 w-5" />
                {selectedMeal?.name}
              </DialogTitle>
              <DialogDescription>{selectedMeal?.description}</DialogDescription>
            </DialogHeader>
            {selectedMeal && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <Badge className={mealTypeColors[selectedMeal.meal_type]}>{selectedMeal.meal_type}</Badge>
                    <div className="text-sm text-muted-foreground mt-1">Meal Type</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedMeal.total_prep_time}m</div>
                    <div className="text-sm text-muted-foreground">Prep Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedMeal.total_cook_time}m</div>
                    <div className="text-sm text-muted-foreground">Cook Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedMeal.total_calories}</div>
                    <div className="text-sm text-muted-foreground">Calories</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Dietary Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeal.dietary_tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Included Recipes</h4>
                  <div className="space-y-2">
                    {selectedMeal.recipes.map((recipe, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="font-medium">{recipe.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {recipe.prep_time + recipe.cook_time} minutes
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(selectedMeal.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMeal.recipes.length} recipe{selectedMeal.recipes.length !== 1 ? "s" : ""} total
                  </div>
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
