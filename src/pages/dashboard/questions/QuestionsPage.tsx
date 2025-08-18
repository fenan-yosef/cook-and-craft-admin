import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Search, Plus, MoreVertical, Eye, Pencil, Trash } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"

interface PreferenceQuestion {
  id: number
  question: string
  description?: string
  question_type: "single_choice" | "multiple_choice" | "text" | "rating"
  is_required: boolean
  is_active: boolean
  order_index: number
  created_at: string
  updated_at: string
  answers?: any[]
  multiple?: boolean
}

// Removed badge-based type coloring; table shows backend fields directly

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<PreferenceQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateQuestionDialogOpen, setIsCreateQuestionDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<PreferenceQuestion | null>(null)
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    description: "",
    question_type: "single_choice" as "single_choice" | "multiple_choice" | "text" | "rating",
    is_required: true,
    is_active: true,
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      setLoading(true)
      // Ensure auth token is applied to API service
      const storedToken = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (storedToken) {
        apiService.setAuthToken(storedToken)
      }

      // Fetch from API: GET /preference_questions
      const response = await apiService.get("/preference_questions")
      const data = Array.isArray(response?.data) ? response.data : []

      // Map backend shape to local UI model
      const mapped: PreferenceQuestion[] = data.map((item: any, idx: number) => ({
        id: Number(item.ID),
        question: String(item.Question ?? ""),
        description: "",
        question_type: (item.Multiple ? "multiple_choice" : "single_choice") as
          | "single_choice"
          | "multiple_choice"
          | "text"
          | "rating",
        is_required: true,
        is_active: Boolean(item.Active),
        order_index: Number(item.Sort_Order ?? idx + 1),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        answers: Array.isArray(item.answers) ? item.answers : [],
        multiple: Boolean(item.Multiple),
      }))

      setQuestions(mapped)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch preference questions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateQuestion = async () => {
    try {
      setQuestions([
        ...questions,
        {
          id: questions.length + 1,
          ...newQuestion,
          multiple: newQuestion.question_type === "multiple_choice",
          order_index: questions.length + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          answers: [],
        },
      ])
      toast({
        title: "Success",
        description: "Question created successfully",
      })
      setIsCreateQuestionDialogOpen(false)
      setNewQuestion({
        question: "",
        description: "",
        question_type: "single_choice",
        is_required: true,
        is_active: true,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create question",
        variant: "destructive",
      })
    }
  }

  const filteredQuestions = questions.filter(
    (q) =>
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.description || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Questions</h2>
          <Button onClick={() => setIsCreateQuestionDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Questions</CardTitle>
            <CardDescription>Manage preference questions and answers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Multiple</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Answers</TableHead>
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
                ) : filteredQuestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No questions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuestions.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>
                        <div className="font-medium">{q.question}</div>
                        <div className="text-sm text-muted-foreground">{q.description}</div>
                      </TableCell>
                      <TableCell>
                        <Switch checked={!!q.multiple} disabled />
                      </TableCell>
                      <TableCell>
                        <Switch checked={q.is_active} disabled />
                      </TableCell>
                      <TableCell>{q.order_index}</TableCell>
                      <TableCell>{q.answers?.length ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedQuestion(q)
                                setIsViewDialogOpen(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash className="mr-2 h-4 w-4" />
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

      {/* Create Question Dialog */}
      <Dialog open={isCreateQuestionDialogOpen} onOpenChange={setIsCreateQuestionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Question</DialogTitle>
            <DialogDescription>
              Add a new preference question to the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                value={newQuestion.question}
                onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newQuestion.description}
                onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="question_type">Question Type</Label>
              <Switch
                id="is_required"
                checked={newQuestion.is_required}
                onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, is_required: checked })}
              />
              <Label htmlFor="is_required">Required</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={newQuestion.is_active}
                onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCreateQuestionDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleCreateQuestion}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Question Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
            <DialogDescription>Full question data including answers.</DialogDescription>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <Label>Question</Label>
                <div className="mt-1">{selectedQuestion.question}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Multiple</Label>
                  <div className="mt-1">{selectedQuestion.multiple ? "Yes" : "No"}</div>
                </div>
                <div>
                  <Label>Active</Label>
                  <div className="mt-1">{selectedQuestion.is_active ? "Active" : "Inactive"}</div>
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <div className="mt-1">{selectedQuestion.order_index}</div>
                </div>
                <div>
                  <Label>Required</Label>
                  <div className="mt-1">{selectedQuestion.is_required ? "Yes" : "No"}</div>
                </div>
              </div>
              <div>
                <Label>Answers ({selectedQuestion.answers?.length ?? 0})</Label>
                <div className="mt-2 space-y-2">
                  {selectedQuestion.answers && selectedQuestion.answers.length > 0 ? (
                    selectedQuestion.answers.map((ans: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-md border p-3 text-sm bg-muted/30"
                      >
                        {typeof ans === "string" || typeof ans === "number"
                          ? String(ans)
                          : <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(ans, null, 2)}</pre>}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No answers</div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
