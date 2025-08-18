import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Search, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"

interface PreferenceAnswers {
  id: number
  Answers: string
  description?: string
  Answers_type: "single_choice" | "multiple_choice" | "text" | "rating"
  is_required: boolean
  is_active: boolean
  order_index: number
  created_at: string
  updated_at: string
}

const AnswersTypeColors = {
  single_choice: "bg-blue-100 text-blue-800",
  multiple_choice: "bg-green-100 text-green-800",
  text: "bg-purple-100 text-purple-800",
  rating: "bg-orange-100 text-orange-800",
}

export default function AnswersPage() {
  const [answers, setanswers] = useState<PreferenceAnswers[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateAnswersDialogOpen, setIsCreateAnswersDialogOpen] = useState(false)
  const [newAnswers, setNewAnswers] = useState({
    Answers: "",
    description: "",
    Answers_type: "single_choice" as "single_choice" | "multiple_choice" | "text" | "rating",
    is_required: true,
    is_active: true,
  })
  const { toast } = useToast()

  useEffect(() => {
    // set auth token from localStorage and fetch answers
    const token = localStorage.getItem('auth_token')
    apiService.setAuthToken(token)
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      setLoading(true)
      // Fetch real data from API
      const response = await apiService.get('/preference_answers')
      const items = response.data as Array<{ ID: number; Question: string; Answer: string; Sort: number }>
      setanswers(
        items.map((item) => ({
          id: item.ID,
          Answers: item.Answer,
          description: item.Question,
          Answers_type: 'single_choice', // default or adjust as needed
          is_required: true,
          is_active: true,
          order_index: item.Sort,
          created_at: '',
          updated_at: '',
        }))
      )
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch preferences",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAnswers = async () => {
    try {
      setanswers([
        ...answers,
        {
          id: answers.length + 1,
          ...newAnswers,
          order_index: answers.length + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      toast({
        title: "Success",
        description: "Answers created successfully",
      })
      setIsCreateAnswersDialogOpen(false)
      setNewAnswers({
        Answers: "",
        description: "",
        Answers_type: "single_choice",
        is_required: true,
        is_active: true,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create Answers",
        variant: "destructive",
      })
    }
  }

  const filteredanswers = answers.filter(
    (q) =>
      q.Answers.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.description || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Answers</h2>
          <Button onClick={() => setIsCreateAnswersDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Answers
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Answers</CardTitle>
            <CardDescription>Manage preference answers and answers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search answers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Answers</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredanswers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No answers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredanswers.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>
                        <div className="font-medium">{q.Answers}</div>
                        <div className="text-sm text-muted-foreground">{q.description}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${
                            AnswersTypeColors[q.Answers_type]
                          } hover:bg-opacity-80`}
                        >
                          {q.Answers_type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch checked={q.is_required} disabled />
                      </TableCell>
                      <TableCell>
                        <Switch checked={q.is_active} disabled />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <Search className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Search className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Search className="mr-2 h-4 w-4" />
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
      </div>

      {/* Create Answers Dialog */}
      <Dialog open={isCreateAnswersDialogOpen} onOpenChange={setIsCreateAnswersDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Answers</DialogTitle>
            <DialogDescription>
              Add a new preference Answers to the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="Answers">Answers</Label>
              <Input
                id="Answers"
                value={newAnswers.Answers}
                onChange={(e) => setNewAnswers({ ...newAnswers, Answers: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newAnswers.description}
                onChange={(e) => setNewAnswers({ ...newAnswers, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="Answers_type">Answers Type</Label>
              <Switch
                id="is_required"
                checked={newAnswers.is_required}
                onCheckedChange={(checked) => setNewAnswers({ ...newAnswers, is_required: checked })}
              />
              <Label htmlFor="is_required">Required</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={newAnswers.is_active}
                onCheckedChange={(checked) => setNewAnswers({ ...newAnswers, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCreateAnswersDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleCreateAnswers}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
