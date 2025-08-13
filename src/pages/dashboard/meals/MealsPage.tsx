import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, MoreHorizontal, Eye, Utensils } from "lucide-react"
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
  const { toast } = useToast()
  const { token, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (token) {
      fetchMeals()
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

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Meals</h2>
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
                  <TableHead>Meal</TableHead>
                  <TableHead>Description</TableHead>
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
                          <div className="text-sm text-muted-foreground truncate">ID: {meal.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="text-sm text-muted-foreground truncate">{meal.recipe}</div>
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
                              View Details
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
