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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Switch } from "@/components/ui/switch"
import { Search, MoreHorizontal, Plus, Edit, Trash2, HelpCircle, CheckCircle, Users } from "lucide-react"
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

interface PreferenceAnswer {
  id: number
  question_id: number
  answer_text: string
  answer_value?: number
  is_active: boolean
  order_index: number
  created_at: string
}

interface UserPreferenceAnswer {
  id: number
  user_id: number
  user_name: string
  question_id: number
  question_text: string
  answer_id?: number
  answer_text: string
  custom_answer?: string
  created_at: string
}

const questionTypeColors = {
  single_choice: "bg-blue-100 text-blue-800",
  multiple_choice: "bg-green-100 text-green-800",
  text: "bg-purple-100 text-purple-800",
  rating: "bg-orange-100 text-orange-800",
}

export default function PreferencesPage() {
  const [questions, setQuestions] = useState<PreferenceQuestion[]>([])
  const [answers, setAnswers] = useState<PreferenceAnswer[]>([])
  const [userAnswers, setUserAnswers] = useState<UserPreferenceAnswer[]>([])
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

      const mockAnswers: PreferenceAnswer[] = [
        {
          id: 1,
          question_id: 1,
          answer_text: "Italian",
          order_index: 1,
          is_active: true,
          created_at: "2024-01-15T10:30:00Z",
        },
        {
          id: 2,
          question_id: 1,
          answer_text: "Asian",
          order_index: 2,
          is_active: true,
          created_at: "2024-01-15T10:30:00Z",
        },
        {
          id: 3,
          question_id: 1,
          answer_text: "Mediterranean",
          order_index: 3,
          is_active: true,
          created_at: "2024-01-15T10:30:00Z",
        },
        {
          id: 4,
          question_id: 1,
          answer_text: "Mexican",
          order_index: 4,
          is_active: true,
          created_at: "2024-01-15T10:30:00Z",
        },
        {
          id: 5,
          question_id: 2,
          answer_text: "Vegetarian",
          order_index: 1,
          is_active: true,
          created_at: "2024-01-15T10:35:00Z",
        },
        {
          id: 6,
          question_id: 2,
          answer_text: "Vegan",
          order_index: 2,
          is_active: true,
          created_at: "2024-01-15T10:35:00Z",
        },
        {
          id: 7,
          question_id: 2,
          answer_text: "Gluten-Free",
          order_index: 3,
          is_active: true,
          created_at: "2024-01-15T10:35:00Z",
        },
        {
          id: 8,
          question_id: 2,
          answer_text: "Dairy-Free",
          order_index: 4,
          is_active: true,
          created_at: "2024-01-15T10:35:00Z",
        },
      ]

      const mockUserAnswers: UserPreferenceAnswer[] = [
        {
          id: 1,
          user_id: 1,
          user_name: "John Doe",
          question_id: 1,
          question_text: "What type of cuisine do you prefer?",
          answer_id: 1,
          answer_text: "Italian, Mediterranean",
          created_at: "2024-01-16T09:15:00Z",
        },
        {
          id: 2,
          user_id: 1,
          user_name: "John Doe",
          question_id: 2,
          question_text: "Do you have any dietary restrictions?",
          answer_id: 7,
          answer_text: "Gluten-Free",
          created_at: "2024-01-16T09:16:00Z",
        },
        {
          id: 3,
          user_id: 2,
          user_name: "Jane Smith",
          question_id: 1,
          question_text: "What type of cuisine do you prefer?",
          answer_id: 2,
          answer_text: "Asian, Mexican",
          created_at: "2024-01-17T14:22:00Z",
        },
        {
          id: 4,
          user_id: 2,
          user_name: "Jane Smith",
          question_id: 4,
          question_text: "Any specific ingredients you'd like to avoid?",
          answer_text: "Shellfish, nuts",
          custom_answer: "Shellfish, nuts",
          created_at: "2024-01-17T14:25:00Z",
        },
      ]

      setQuestions(mockQuestions)
      setAnswers(mockAnswers)
      setUserAnswers(mockUserAnswers)
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

  const createQuestion = async () => {
    try {
      // In real app: await apiService.post("/preference_questions", newQuestion)
      const mockNewQuestion: PreferenceQuestion = {
        id: Date.now(),
        ...newQuestion,
        order_index: questions.length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setQuestions([...questions, mockNewQuestion])
      setIsCreateQuestionDialogOpen(false)
      setNewQuestion({
        question: "",
        description: "",
        question_type: "single_choice",
        is_required: true,
        is_active: true,
      })

      toast({
        title: "Success",
        description: "Preference question created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create preference question",
        variant: "destructive",
      })
    }
  }

  const toggleQuestionStatus = async (questionId: number) => {
    try {
      // In real app: await apiService.put(`/preference_questions/${questionId}`, { is_active: !question.is_active })
      setQuestions(questions.map((q) => (q.id === questionId ? { ...q, is_active: !q.is_active } : q)))
      toast({
        title: "Success",
        description: "Question status updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update question status",
        variant: "destructive",
      })
    }
  }

  const deleteQuestion = async (questionId: number) => {
    try {
      // In real app: await apiService.delete(`/preference_questions/${questionId}`)
      setQuestions(questions.filter((q) => q.id !== questionId))
      setAnswers(answers.filter((a) => a.question_id !== questionId))
      toast({
        title: "Success",
        description: "Question deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      })
    }
  }

  const filteredQuestions = questions.filter((question) =>
    question.question.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getAnswersForQuestion = (questionId: number) => {
    return answers.filter((answer) => answer.question_id === questionId)
  }

  const getUserAnswersForQuestion = (questionId: number) => {
    return userAnswers.filter((ua) => ua.question_id === questionId)
  }

  return (
    <div className="flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Preferences Management</h1>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">User Preferences</h2>
          <Dialog open={isCreateQuestionDialogOpen} onOpenChange={setIsCreateQuestionDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Preference Question</DialogTitle>
                <DialogDescription>Add a new question to gather user preferences</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="question" className="text-right">
                    Question
                  </Label>
                  <Textarea
                    id="question"
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                    className="col-span-3"
                    placeholder="What type of cuisine do you prefer?"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={newQuestion.description}
                    onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
                    className="col-span-3"
                    placeholder="Optional description to help users understand the question"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="question_type" className="text-right">
                    Type
                  </Label>
                  <select
                    id="question_type"
                    value={newQuestion.question_type}
                    onChange={(e) =>
                      setNewQuestion({
                        ...newQuestion,
                        question_type: e.target.value as "single_choice" | "multiple_choice" | "text" | "rating",
                      })
                    }
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="single_choice">Single Choice</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="text">Text Input</option>
                    <option value="rating">Rating Scale</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="is_required" className="text-right">
                    Required
                  </Label>
                  <Switch
                    id="is_required"
                    checked={newQuestion.is_required}
                    onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, is_required: checked })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="is_active" className="text-right">
                    Active
                  </Label>
                  <Switch
                    id="is_active"
                    checked={newQuestion.is_active}
                    onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={createQuestion}>
                  Create Question
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="questions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="answers">User Responses</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preference Questions</CardTitle>
                <CardDescription>
                  Manage questions used to gather user preferences for meal recommendations
                </CardDescription>
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
                      <TableHead>Responses</TableHead>
                      <TableHead>Order</TableHead>
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
                    ) : filteredQuestions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No questions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredQuestions.map((question) => (
                        <TableRow key={question.id}>
                          <TableCell>
                            <div className="max-w-xs">
                              <div className="font-medium flex items-center">
                                <HelpCircle className="mr-2 h-4 w-4" />
                                {question.question}
                              </div>
                              {question.description && (
                                <div className="text-sm text-muted-foreground truncate">{question.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={questionTypeColors[question.question_type]}>
                              {question.question_type.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {question.is_required ? (
                              <Badge variant="destructive">Required</Badge>
                            ) : (
                              <Badge variant="secondary">Optional</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={question.is_active ? "default" : "secondary"}>
                              {question.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Users className="mr-1 h-3 w-3" />
                              {getUserAnswersForQuestion(question.id).length}
                            </div>
                          </TableCell>
                          <TableCell>{question.order_index}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Question
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleQuestionStatus(question.id)}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  {question.is_active ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => deleteQuestion(question.id)}>
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
          </TabsContent>

          <TabsContent value="answers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Responses</CardTitle>
                <CardDescription>View how users have responded to preference questions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : userAnswers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          No user responses found
                        </TableCell>
                      </TableRow>
                    ) : (
                      userAnswers.map((userAnswer) => (
                        <TableRow key={userAnswer.id}>
                          <TableCell>
                            <div className="font-medium">{userAnswer.user_name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">{userAnswer.question_text}</div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">{userAnswer.custom_answer || userAnswer.answer_text}</div>
                          </TableCell>
                          <TableCell>{new Date(userAnswer.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
