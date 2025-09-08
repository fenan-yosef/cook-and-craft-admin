import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
// removed unused Textarea and Switch
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

// removed unused AnswersTypeColors

export default function AnswersPage() {
  const [answers, setanswers] = useState<PreferenceAnswers[]>([])
  const [questions, setQuestions] = useState<{ id: number; question: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateAnswersDialogOpen, setIsCreateAnswersDialogOpen] = useState(false)
  const [newAnswers, setNewAnswers] = useState({
    question_id: 0,
    answer_text: "",
    sort_order: 1,
  })
  const { toast } = useToast()

  useEffect(() => {
  // set auth token from localStorage and fetch answers/questions
  const token = localStorage.getItem('auth_token')
  apiService.setAuthToken(token)
  fetchPreferences()
  fetchQuestions()
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

  // Fetch all available questions for dropdown
  const fetchQuestions = async () => {
    try {
      const response = await apiService.get('/preference_questions')
      const items = Array.isArray(response.data) ? response.data : []
      setQuestions(
        items.map((item: any) => ({
          id: item.ID,
          question: item.Question,
        }))
      )
    } catch (error) {
      // Optionally toast error
    }
  }

  const handleCreateAnswers = async () => {
    try {
      // Actually send POST request to backend
      const payload = {
        question_id: newAnswers.question_id,
        answer_text: newAnswers.answer_text,
        sort_order: newAnswers.sort_order,
      }
      const response = await apiService.post('/preference_answers', payload)
      if (response && response.data && response.data.ID) {
        // Add the new answer to the local list using backend response
        setanswers([
          ...answers,
          {
            id: response.data.ID,
            Answers: response.data.Answer || newAnswers.answer_text,
            description: questions.find(q => q.id === newAnswers.question_id)?.question || "",
            Answers_type: 'single_choice',
            is_required: true,
            is_active: true,
            order_index: response.data.Sort || newAnswers.sort_order,
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
          question_id: 0,
          answer_text: "",
          sort_order: 1,
        })
      } else {
        throw new Error("No ID returned from backend")
      }
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
                  <TableHead>Answer</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Sort Order</TableHead>
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
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{q.description}</div>
                      </TableCell>
                      <TableCell>
                        {q.order_index}
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
              <Label htmlFor="question_id">Question</Label>
              <select
                id="question_id"
                className="w-full border rounded px-2 py-2"
                value={newAnswers.question_id}
                onChange={e => setNewAnswers({ ...newAnswers, question_id: Number(e.target.value) })}
              >
                <option value={0}>Select a question...</option>
                {questions.map(q => (
                  <option key={q.id} value={q.id}>{q.question}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="answer_text">Answer Text</Label>
              <Input
                id="answer_text"
                value={newAnswers.answer_text}
                onChange={e => setNewAnswers({ ...newAnswers, answer_text: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                min={1}
                value={newAnswers.sort_order}
                onChange={e => setNewAnswers({ ...newAnswers, sort_order: Number(e.target.value) })}
              />
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
