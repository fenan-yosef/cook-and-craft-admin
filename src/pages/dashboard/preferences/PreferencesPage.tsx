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
}

const questionTypeColors = {
  single_choice: "bg-blue-100 text-blue-800",
  multiple_choice: "bg-green-100 text-green-800",
  text: "bg-purple-100 text-purple-800",
  rating: "bg-orange-100 text-orange-800",
}

export default function PreferencesPage() {
  const [questions, setQuestions] = useState<PreferenceQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateQuestionDialogOpen, setIsCreateQuestionDialogOpen] = useState(false)
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
      // Mock data for demonstration
      const mockQuestions: PreferenceQuestion[] = [
        {
          id: 1,
          question: "What type of cuisine do you prefer?",
          description: "Select your favorite cuisine types to personalize your meal recommendations",
          question_type: "multiple_choice",
          is_required: true,
          is_active: true,
          order_index: 1,
          created_at: "2024-01-15T10:30:00Z",
          updated_at: "2024-01-15T10:30:00Z",
        },
        {
          id: 2,
          question: "Do you have any dietary restrictions?",
          description: "Help us customize meals according to your dietary needs",
          question_type: "multiple_choice",
          is_required: true,
          is_active: true,
          order_index: 2,
          created_at: "2024-01-15T10:35:00Z",
          updated_at: "2024-01-15T10:35:00Z",
        },
        {
          id: 3,
          question: "How would you rate your cooking skill level?",
          description: "This helps us suggest recipes with appropriate difficulty levels",
          question_type: "rating",
          is_required: false,
          is_active: true,
          order_index: 3,
          created_at: "2024-01-15T10:40:00Z",
          updated_at: "2024-01-15T10:40:00Z",
        },
        {
          id: 4,
          question: "Any specific ingredients you'd like to avoid?",
          description: "Tell us about any ingredients you prefer not to have in your meals",
          question_type: "text",
          is_required: false,
          is_active: true,
          order_index: 4,
          created_at: "2024-01-15T10:45:00Z",
          updated_at: "2024-01-15T10:45:00Z",
        },
      ]

      setQuestions(mockQuestions)
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

  const handleCreateQuestion = async () => {
    try {
      setQuestions([
        ...questions,
        {
          id: questions.length + 1,
          ...newQuestion,
          order_index: questions.length + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
          <h2 className="text-3xl font-bold tracking-tight">Preferences</h2>
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
                        <Badge
                          className={`${
                            questionTypeColors[q.question_type]
                          } hover:bg-opacity-80`}
                        >
                          {q.question_type.replace("_", " ")}
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
    </div>
  )
}
