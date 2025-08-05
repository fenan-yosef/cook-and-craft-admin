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
import { Search, MoreHorizontal, Plus, Edit, Trash2, Clock, Users, Heart, ChefHat } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProfileAvatar } from "@/components/profile-avatar"

interface Recipe {
  id: number
  name: string
  description: string
  ingredients: string[]
  instructions: string[]
  prep_time: number
  cook_time: number
  servings: number
  difficulty: "easy" | "medium" | "hard"
  cuisine_type: string
  dietary_tags: string[]
  likes_count: number
  created_at: string
  updated_at: string
}

const difficultyColors = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-red-100 text-red-800",
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [newRecipe, setNewRecipe] = useState({
    name: "",
    description: "",
    ingredients: "",
    instructions: "",
    prep_time: 0,
    cook_time: 0,
    servings: 1,
    difficulty: "easy" as "easy" | "medium" | "hard",
    cuisine_type: "",
    dietary_tags: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    try {
      setLoading(true)
      // Mock data for demonstration
      const mockRecipes: Recipe[] = [
        {
          id: 1,
          name: "Mediterranean Quinoa Bowl",
          description: "A healthy and delicious quinoa bowl with fresh Mediterranean flavors",
          ingredients: [
            "1 cup quinoa",
            "2 cups vegetable broth",
            "1 cucumber, diced",
            "2 tomatoes, chopped",
            "1/2 red onion, sliced",
            "1/4 cup kalamata olives",
            "1/4 cup feta cheese",
            "2 tbsp olive oil",
            "1 lemon, juiced",
            "Fresh herbs (parsley, mint)",
          ],
          instructions: [
            "Rinse quinoa and cook in vegetable broth for 15 minutes",
            "Let quinoa cool completely",
            "Dice cucumber and tomatoes",
            "Slice red onion thinly",
            "Combine all vegetables with quinoa",
            "Whisk olive oil and lemon juice",
            "Toss with dressing and top with feta and herbs",
          ],
          prep_time: 20,
          cook_time: 15,
          servings: 4,
          difficulty: "easy",
          cuisine_type: "Mediterranean",
          dietary_tags: ["vegetarian", "gluten-free", "healthy"],
          likes_count: 89,
          created_at: "2024-01-20T10:30:00Z",
          updated_at: "2024-01-20T10:30:00Z",
        },
        {
          id: 2,
          name: "Spicy Thai Basil Chicken",
          description: "Authentic Thai stir-fry with aromatic basil and chilies",
          ingredients: [
            "1 lb ground chicken",
            "3 cloves garlic, minced",
            "2 Thai chilies, sliced",
            "1 cup Thai basil leaves",
            "2 tbsp vegetable oil",
            "2 tbsp fish sauce",
            "1 tbsp soy sauce",
            "1 tsp sugar",
            "Jasmine rice for serving",
          ],
          instructions: [
            "Heat oil in wok over high heat",
            "Add garlic and chilies, stir-fry 30 seconds",
            "Add ground chicken, break up and cook until done",
            "Add fish sauce, soy sauce, and sugar",
            "Stir in Thai basil until wilted",
            "Serve immediately over jasmine rice",
          ],
          prep_time: 15,
          cook_time: 10,
          servings: 3,
          difficulty: "medium",
          cuisine_type: "Thai",
          dietary_tags: ["spicy", "high-protein"],
          likes_count: 156,
          created_at: "2024-01-19T14:22:00Z",
          updated_at: "2024-01-19T14:22:00Z",
        },
        {
          id: 3,
          name: "Classic French Coq au Vin",
          description: "Traditional French braised chicken in red wine sauce",
          ingredients: [
            "1 whole chicken, cut into pieces",
            "6 strips bacon, chopped",
            "1 bottle red wine",
            "2 cups chicken stock",
            "1 lb pearl onions",
            "8 oz mushrooms",
            "3 cloves garlic",
            "2 bay leaves",
            "Fresh thyme",
            "Flour for dusting",
          ],
          instructions: [
            "Cook bacon until crispy, remove and set aside",
            "Dust chicken with flour and brown in bacon fat",
            "Add wine and stock, bring to simmer",
            "Add aromatics and braise for 45 minutes",
            "Sauté onions and mushrooms separately",
            "Combine everything and simmer until tender",
            "Serve with crusty bread or mashed potatoes",
          ],
          prep_time: 30,
          cook_time: 90,
          servings: 6,
          difficulty: "hard",
          cuisine_type: "French",
          dietary_tags: ["comfort-food", "wine-pairing"],
          likes_count: 234,
          created_at: "2024-01-18T16:45:00Z",
          updated_at: "2024-01-18T16:45:00Z",
        },
      ]
      setRecipes(mockRecipes)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch recipes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createRecipe = async () => {
    try {
      const recipeData = {
        ...newRecipe,
        ingredients: newRecipe.ingredients
          .split("\n")
          .map((item) => item.trim())
          .filter((item) => item),
        instructions: newRecipe.instructions
          .split("\n")
          .map((item) => item.trim())
          .filter((item) => item),
        dietary_tags: newRecipe.dietary_tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      }

      // In real app: await apiService.post("/recipes", recipeData)
      const mockNewRecipe: Recipe = {
        id: Date.now(),
        ...recipeData,
        likes_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setRecipes([mockNewRecipe, ...recipes])
      setIsCreateDialogOpen(false)
      setNewRecipe({
        name: "",
        description: "",
        ingredients: "",
        instructions: "",
        prep_time: 0,
        cook_time: 0,
        servings: 1,
        difficulty: "easy",
        cuisine_type: "",
        dietary_tags: "",
      })

      toast({
        title: "Success",
        description: "Recipe created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create recipe",
        variant: "destructive",
      })
    }
  }

  const deleteRecipe = async (recipeId: number) => {
    try {
      // In real app: await apiService.delete(`/recipes/${recipeId}`)
      setRecipes(recipes.filter((recipe) => recipe.id !== recipeId))
      toast({
        title: "Success",
        description: "Recipe deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete recipe",
        variant: "destructive",
      })
    }
  }

  const viewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setIsViewDialogOpen(true)
  }

  const filteredRecipes = recipes.filter(
    (recipe) =>
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.cuisine_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.dietary_tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Recipes Management</h1>
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-end px-4">
            <ProfileAvatar />
          </div>
        </header>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Recipes</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Recipe
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Recipe</DialogTitle>
                <DialogDescription>Add a new recipe to your collection</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newRecipe.name}
                    onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                    className="col-span-3"
                    placeholder="Mediterranean Quinoa Bowl"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={newRecipe.description}
                    onChange={(e) => setNewRecipe({ ...newRecipe, description: e.target.value })}
                    className="col-span-3"
                    placeholder="A healthy and delicious..."
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ingredients" className="text-right">
                    Ingredients
                  </Label>
                  <Textarea
                    id="ingredients"
                    value={newRecipe.ingredients}
                    onChange={(e) => setNewRecipe({ ...newRecipe, ingredients: e.target.value })}
                    className="col-span-3"
                    placeholder="1 cup quinoa&#10;2 cups vegetable broth&#10;..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="instructions" className="text-right">
                    Instructions
                  </Label>
                  <Textarea
                    id="instructions"
                    value={newRecipe.instructions}
                    onChange={(e) => setNewRecipe({ ...newRecipe, instructions: e.target.value })}
                    className="col-span-3"
                    placeholder="Rinse quinoa and cook...&#10;Let quinoa cool...&#10;..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="prep_time" className="text-right col-span-2">
                      Prep Time (min)
                    </Label>
                    <Input
                      id="prep_time"
                      type="number"
                      value={newRecipe.prep_time}
                      onChange={(e) => setNewRecipe({ ...newRecipe, prep_time: Number.parseInt(e.target.value) || 0 })}
                      className="col-span-2"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cook_time" className="text-right col-span-2">
                      Cook Time (min)
                    </Label>
                    <Input
                      id="cook_time"
                      type="number"
                      value={newRecipe.cook_time}
                      onChange={(e) => setNewRecipe({ ...newRecipe, cook_time: Number.parseInt(e.target.value) || 0 })}
                      className="col-span-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="servings" className="text-right col-span-2">
                      Servings
                    </Label>
                    <Input
                      id="servings"
                      type="number"
                      value={newRecipe.servings}
                      onChange={(e) => setNewRecipe({ ...newRecipe, servings: Number.parseInt(e.target.value) || 1 })}
                      className="col-span-2"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="difficulty" className="text-right col-span-2">
                      Difficulty
                    </Label>
                    <select
                      id="difficulty"
                      value={newRecipe.difficulty}
                      onChange={(e) =>
                        setNewRecipe({ ...newRecipe, difficulty: e.target.value as "easy" | "medium" | "hard" })
                      }
                      className="col-span-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cuisine_type" className="text-right">
                    Cuisine Type
                  </Label>
                  <Input
                    id="cuisine_type"
                    value={newRecipe.cuisine_type}
                    onChange={(e) => setNewRecipe({ ...newRecipe, cuisine_type: e.target.value })}
                    className="col-span-3"
                    placeholder="Mediterranean, Thai, French..."
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dietary_tags" className="text-right">
                    Dietary Tags
                  </Label>
                  <Input
                    id="dietary_tags"
                    value={newRecipe.dietary_tags}
                    onChange={(e) => setNewRecipe({ ...newRecipe, dietary_tags: e.target.value })}
                    className="col-span-3"
                    placeholder="vegetarian, gluten-free, healthy"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={createRecipe}>
                  Create Recipe
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

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
                  <TableHead>Cuisine</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Servings</TableHead>
                  <TableHead>Likes</TableHead>
                  <TableHead>Tags</TableHead>
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
                    <TableRow key={recipe.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium flex items-center">
                            <ChefHat className="mr-2 h-4 w-4" />
                            {recipe.name}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">{recipe.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{recipe.cuisine_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={difficultyColors[recipe.difficulty]}>{recipe.difficulty}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Clock className="mr-1 h-3 w-3" />
                          {recipe.prep_time + recipe.cook_time}m
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Users className="mr-1 h-3 w-3" />
                          {recipe.servings}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Heart className="mr-1 h-3 w-3" />
                          {recipe.likes_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {recipe.dietary_tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {recipe.dietary_tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{recipe.dietary_tags.length - 2}
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
                            <DropdownMenuItem onClick={() => viewRecipe(recipe)}>
                              <ChefHat className="mr-2 h-4 w-4" />
                              View Recipe
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => deleteRecipe(recipe.id)}>
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

        {/* View Recipe Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <ChefHat className="mr-2 h-5 w-5" />
                {selectedRecipe?.name}
              </DialogTitle>
              <DialogDescription>{selectedRecipe?.description}</DialogDescription>
            </DialogHeader>
            {selectedRecipe && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedRecipe.prep_time}</div>
                    <div className="text-sm text-muted-foreground">Prep Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedRecipe.cook_time}</div>
                    <div className="text-sm text-muted-foreground">Cook Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedRecipe.servings}</div>
                    <div className="text-sm text-muted-foreground">Servings</div>
                  </div>
                  <div className="text-center">
                    <Badge className={difficultyColors[selectedRecipe.difficulty]}>{selectedRecipe.difficulty}</Badge>
                    <div className="text-sm text-muted-foreground mt-1">Difficulty</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Cuisine & Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{selectedRecipe.cuisine_type}</Badge>
                    {selectedRecipe.dietary_tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Ingredients</h4>
                  <ul className="space-y-1">
                    {selectedRecipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="text-sm flex items-start">
                        <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Instructions</h4>
                  <ol className="space-y-2">
                    {selectedRecipe.instructions.map((instruction, index) => (
                      <li key={index} className="text-sm flex items-start">
                        <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Heart className="mr-1 h-4 w-4" />
                      {selectedRecipe.likes_count} likes
                    </div>
                    <div>Created: {new Date(selectedRecipe.created_at).toLocaleDateString()}</div>
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
