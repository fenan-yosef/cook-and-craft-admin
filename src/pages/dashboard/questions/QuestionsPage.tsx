import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editTargetId, setEditTargetId] = useState<number | null>(null)
  const [editQuestion, setEditQuestion] = useState({
    question: "",
    allow_multiple: 0,
    is_active: 1,
    sort_order: 1,
  })
  const [editAnswers, setEditAnswers] = useState<string[]>([])
  const [existingAnswers, setExistingAnswers] = useState<Array<{
    id: number;
    text: string;
    sort: number;
    logoUrl?: string;
    editText?: string;
    newLogoFile?: File;
    previewUrl?: string;
    saving?: boolean;
  }>>([])
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    allow_multiple: 0,
    is_active: 1,
    sort_order: 1,
  })
  const [newAnswers, setNewAnswers] = useState<string[]>([])
  const { toast } = useToast()

  // Load existing answers for a question using question text comparison
  const loadExistingAnswersByQuestionText = async (questionText: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (token) apiService.setAuthToken(token)
      const resp = await apiService.get('/preference_answers')
      const raw = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : []
      const norm = (s: any) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
      const targetQ = norm(questionText)
      const mapped = raw
        .filter((it: any) => norm(it?.Question) === targetQ)
        .map((it: any) => {
          const logoArr = Array.isArray(it?.Logo) ? it.Logo : []
          const logoFromArr = logoArr.find((l: any) => l?.isThumbnail) || logoArr[0]
          const url = logoFromArr?.url || it?.logoUrl || it?.logo_url || null
          return { id: Number(it.ID), text: String(it.Answer ?? ''), sort: Number(it.Sort ?? 1), logoUrl: url || undefined }
        })
      setExistingAnswers(mapped)
    } catch (e) {
      setExistingAnswers([])
    }
  }

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
      const payload = {
        question_text: newQuestion.question,
        allow_multiple: newQuestion.allow_multiple,
        is_active: newQuestion.is_active,
        sort_order: newQuestion.sort_order,
      }
      const resp = await apiService.post("/preference_questions", payload)
      const item = resp?.data ?? {}
      const created: PreferenceQuestion = {
        id: Number(item.ID ?? Date.now()),
        question: String(item.Question ?? newQuestion.question),
        description: "",
        question_type: (item.Multiple ? "multiple_choice" : "single_choice") as
          | "single_choice"
          | "multiple_choice"
          | "text"
          | "rating",
        is_required: true,
        is_active: Boolean(item.Active ?? (newQuestion.is_active === 1)),
        order_index: Number(item.Sort_Order ?? newQuestion.sort_order),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        answers: Array.isArray(item.answers) ? item.answers : [],
        multiple: Boolean(item.Multiple ?? (newQuestion.allow_multiple === 1)),
      }
      // If admin added inline answers, create them now, sequentially
      const answersToCreate = newAnswers
        .map((a) => (typeof a === "string" ? a.trim() : ""))
        .filter((a) => a.length > 0)

      let createdAnswers: any[] = []
      if (answersToCreate.length > 0) {
        for (let i = 0; i < answersToCreate.length; i++) {
          try {
            const ar = await apiService.post("/preference_answers", {
              question_id: created.id,
              answer_text: answersToCreate[i],
              sort_order: i + 1,
            })
            if (ar?.data) createdAnswers.push(ar.data)
          } catch (e) {
            // continue creating remaining answers, but notify user
          }
        }
      }

      const finalCreated: PreferenceQuestion = {
        ...created,
        answers: createdAnswers.length
          ? createdAnswers
          : created.answers,
      }

      setQuestions((prev) => [...prev, finalCreated])
      toast({
        title: "Success",
        description:
          answersToCreate.length > 0
            ? `Question and ${answersToCreate.length} answer(s) created`
            : "Question created successfully",
      })
      setIsCreateQuestionDialogOpen(false)
      setNewQuestion({ question: "", allow_multiple: 0, is_active: 1, sort_order: 1 })
      setNewAnswers([])
    } catch (error: any) {
      const backendMsg = error?.response?.data?.error
      const msg = typeof backendMsg === "object" && backendMsg?.question_text?.[0]
        ? backendMsg.question_text[0]
        : "Failed to create question"
      toast({ title: "Error", description: msg, variant: "destructive" })
    }
  }

  const filteredQuestions = questions.filter(
    (q) =>
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.description || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const openViewModal = (q: PreferenceQuestion) => {
    setSelectedQuestion(q)
    setIsViewDialogOpen(true)
  }

  const handleDeleteQuestion = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this question?")
    if (!confirmed) return
    try {
      // Use apiService base URL and auth token for this delete request as requested
      const base = apiService.getBaseUrl()
      const token = apiService.getAuthToken() || (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null)
      const resp = await fetch(`${base}/preference_questions/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!resp.ok) {
        const txt = await resp.text()
        throw new Error(txt || `HTTP error ${resp.status}`)
      }
      setQuestions((prev) => prev.filter((q) => q.id !== id))
      toast({ title: "Deleted", description: "Question removed successfully." })
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete question", variant: "destructive" })
    }
  }

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
                    <TableRow
                      key={q.id}
                      onClick={() => openViewModal(q)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="font-medium">{q.question}</div>
                        <div className="text-sm text-muted-foreground">{q.description}</div>
                      </TableCell>
                      <TableCell>
                        {q.multiple ? (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-300">Yes</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-300">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {q.is_active ? (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-300">Active</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-300">Inactive</span>
                        )}
                      </TableCell>
                      <TableCell>{q.order_index}</TableCell>
                      <TableCell>{q.answers?.length ?? 0}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                openViewModal(q)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditTargetId(q.id)
                                setEditQuestion({
                                  question: q.question,
                                  allow_multiple: q.multiple ? 1 : 0,
                                  is_active: q.is_active ? 1 : 0,
                                  sort_order: q.order_index,
                                })
                                setEditAnswers([])
                                // Fetch existing answers for this question text
                                void loadExistingAnswersByQuestionText(q.question)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteQuestion(q.id)}>
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
      <Dialog
        open={isCreateQuestionDialogOpen}
        onOpenChange={(open) => {
          setIsCreateQuestionDialogOpen(open)
          if (!open) {
            setNewQuestion({ question: "", allow_multiple: 0, is_active: 1, sort_order: 1 })
            setNewAnswers([])
          }
        }}
      >
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
            <div className="flex items-center space-x-2">
              <Label htmlFor="allow_multiple">Allow Multiple</Label>
              <Switch
                id="allow_multiple"
                checked={newQuestion.allow_multiple === 1}
                onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, allow_multiple: checked ? 1 : 0 })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={newQuestion.is_active === 1}
                onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, is_active: checked ? 1 : 0 })}
              />
            </div>
            <div>
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                min={1}
                value={newQuestion.sort_order}
                onChange={(e) => setNewQuestion({ ...newQuestion, sort_order: Number(e.target.value) })}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Answers</Label>
                <Button type="button" size="sm" variant="secondary" onClick={() => setNewAnswers((prev) => [...prev, ""]) }>
                  Add Answer
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                {newAnswers.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No answers added yet.</div>
                ) : (
                  newAnswers.map((val, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder={`Answer #${idx + 1}`}
                        value={val}
                        onChange={(e) => {
                          const copy = [...newAnswers]
                          copy[idx] = e.target.value
                          setNewAnswers(copy)
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setNewAnswers((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
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
              <div>
                <Label>Answers ({selectedQuestion.answers?.length ?? 0})</Label>
                <div className="mt-2">
                  {selectedQuestion.answers && selectedQuestion.answers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedQuestion.answers.map((ans: any, idx: number) => {
                        // Extract logo URL if present in Logo array
                        let logoUrl: string | undefined
                        if (ans && typeof ans === 'object') {
                          const logoArr = Array.isArray(ans.Logo) ? ans.Logo : []
                          const chosen = logoArr.find((l: any) => l?.isThumbnail) || logoArr[0]
                          logoUrl = chosen?.url
                        }
                        const text = (typeof ans === 'string' || typeof ans === 'number')
                          ? String(ans)
                          : ans && typeof ans === 'object' && 'Answer' in ans
                            ? String(ans.Answer ?? '')
                            : JSON.stringify(ans)
                        return (
                          <div
                            key={idx}
                            className="rounded-xl border p-4 bg-muted/10 hover:bg-muted/20 transition flex items-center gap-3"
                          >
                            {logoUrl ? (
                              <img src={logoUrl} alt="logo" className="w-10 h-10 rounded object-cover border" />
                            ) : (
                              <div className="w-10 h-10 rounded border bg-muted" />
                            )}
                            <div className="font-semibold text-sm sm:text-base">{text}</div>
                          </div>
                        )
                      })}
                    </div>
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

      {/* Edit Question Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            setEditAnswers([])
            setExistingAnswers([])
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Update the selected question.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit_question">Question</Label>
              <Input
                id="edit_question"
                value={editQuestion.question}
                onChange={(e) => setEditQuestion({ ...editQuestion, question: e.target.value })}
              />
            </div>
            {/* Existing answers list with delete */}
            <div>
              <Label>Existing Answers</Label>
              <div className="mt-2 space-y-2">
                {existingAnswers.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No existing answers.</div>
                ) : (
                  existingAnswers
                    .sort((a, b) => a.sort - b.sort)
                    .map((ans) => (
                      <div key={ans.id} className="flex flex-col gap-2 rounded-md border p-2">
                        <div className="flex items-center gap-3">
                          {(ans.previewUrl || ans.logoUrl) ? (
                            <img src={ans.previewUrl || ans.logoUrl} alt="logo" className="w-8 h-8 rounded object-cover border" />
                          ) : (
                            <div className="w-8 h-8 rounded border bg-muted" />
                          )}
                          <Input
                            value={ans.editText ?? ans.text}
                            onChange={(e) => {
                              const val = e.target.value
                              setExistingAnswers((prev) => prev.map((a) => a.id === ans.id ? { ...a, editText: val } : a))
                            }}
                          />
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files && e.target.files[0]
                              if (!file) return
                              const preview = URL.createObjectURL(file)
                              setExistingAnswers((prev) => prev.map((a) => a.id === ans.id ? { ...a, newLogoFile: file, previewUrl: preview } : a))
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const confirmed = window.confirm('Remove this answer?')
                              if (!confirmed) return
                              try {
                                const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
                                if (token) apiService.setAuthToken(token)
                                await apiService.delete(`/preference_answers/${ans.id}`)
                                setExistingAnswers((prev) => prev.filter((a) => a.id !== ans.id))
                                setQuestions((prev) => prev.map((q) => (q.id === editTargetId ? { ...q, answers: (q.answers || []).filter((ea: any) => Number(ea?.ID ?? ea?.id) !== ans.id) } : q)))
                                toast({ title: 'Deleted', description: 'Answer removed.' })
                              } catch (err) {
                                toast({ title: 'Error', description: 'Failed to remove answer', variant: 'destructive' })
                              }
                            }}
                          >
                            Remove
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!!ans.saving}
                            onClick={async () => {
                              if (!editTargetId) return
                              try {
                                setExistingAnswers((prev) => prev.map((a) => a.id === ans.id ? { ...a, saving: true } : a))
                                const fd = new FormData()
                                fd.append('question_id', String(editTargetId))
                                fd.append('answer_text', String(ans.editText ?? ans.text ?? ''))
                                fd.append('sort_order', String(ans.sort))
                                if (ans.newLogoFile) fd.append('logo', ans.newLogoFile)
                                const resp = await apiService.postMultipart(`/preference_answers/${ans.id}?_method=put`, fd)
                                const updated = resp?.data ?? resp
                                // Try to pull back updated values
                                const newText = String(updated?.Answer ?? (ans.editText ?? ans.text))
                                const logoArr = Array.isArray(updated?.Logo) ? updated.Logo : []
                                const chosen = logoArr.find((l: any) => l?.isThumbnail) || logoArr[0]
                                const newUrl = chosen?.url ?? ans.previewUrl ?? ans.logoUrl
                                setExistingAnswers((prev) => prev.map((a) => a.id === ans.id ? { ...a, text: newText, editText: undefined, logoUrl: newUrl, newLogoFile: undefined, previewUrl: undefined, saving: false } : a))
                                // Update in questions state as well
                                setQuestions((prev) => prev.map((q) => (
                                  q.id === editTargetId
                                    ? {
                                        ...q,
                                        answers: (q.answers || []).map((ea: any) => {
                                          const aid = Number(ea?.ID ?? ea?.id)
                                          if (aid !== ans.id) return ea
                                          const updatedLogo = newUrl ? [{ id: 0, url: newUrl, isThumbnail: true }] : ea?.Logo
                                          return { ...ea, Answer: newText, Logo: updatedLogo }
                                        }),
                                      }
                                    : q
                                )))
                                toast({ title: 'Saved', description: 'Answer updated successfully.' })
                              } catch (err: any) {
                                const backendMsg = err?.response?.data?.error
                                const msg = typeof backendMsg === 'object' && backendMsg?.answer_text?.[0]
                                  ? backendMsg.answer_text[0]
                                  : 'Failed to update answer'
                                toast({ title: 'Error', description: msg, variant: 'destructive' })
                                setExistingAnswers((prev) => prev.map((a) => a.id === ans.id ? { ...a, saving: false } : a))
                              }
                            }}
                          >
                            {ans.saving ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="edit_allow_multiple">Allow Multiple</Label>
              <Switch
                id="edit_allow_multiple"
                checked={editQuestion.allow_multiple === 1}
                onCheckedChange={(checked) => setEditQuestion({ ...editQuestion, allow_multiple: checked ? 1 : 0 })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="edit_is_active">Active</Label>
              <Switch
                id="edit_is_active"
                checked={editQuestion.is_active === 1}
                onCheckedChange={(checked) => setEditQuestion({ ...editQuestion, is_active: checked ? 1 : 0 })}
              />
            </div>
            <div>
              <Label htmlFor="edit_sort_order">Sort Order</Label>
              <Input
                id="edit_sort_order"
                type="number"
                min={1}
                value={editQuestion.sort_order}
                onChange={(e) => setEditQuestion({ ...editQuestion, sort_order: Number(e.target.value) })}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Add Answers</Label>
                <Button type="button" size="sm" variant="secondary" onClick={() => setEditAnswers((prev) => [...prev, ""]) }>
                  Add Answer
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                {editAnswers.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No new answers to add.</div>
                ) : (
                  editAnswers.map((val, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder={`Answer #${idx + 1}`}
                        value={val}
                        onChange={(e) => {
                          const copy = [...editAnswers]
                          copy[idx] = e.target.value
                          setEditAnswers(copy)
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditAnswers((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsEditDialogOpen(false)} variant="outline">Cancel</Button>
            <Button
              onClick={async () => {
                if (!editTargetId) return
                try {
                  const payload = {
                    question_text: editQuestion.question,
                    allow_multiple: editQuestion.allow_multiple,
                    is_active: editQuestion.is_active,
                    sort_order: editQuestion.sort_order,
                  }
                  await apiService.post(`/preference_questions/${editTargetId}?_method=put`, payload)
                  // Create any new answers added in the edit dialog
                  const answersToCreate = editAnswers
                    .map((a) => (typeof a === "string" ? a.trim() : ""))
                    .filter((a) => a.length > 0)
                  let createdAnswers: any[] = []
                  if (answersToCreate.length > 0) {
                    for (let i = 0; i < answersToCreate.length; i++) {
                      try {
                        const ar = await apiService.post("/preference_answers", {
                          question_id: editTargetId,
                          answer_text: answersToCreate[i],
                          sort_order: i + 1,
                        })
                        if (ar?.data) createdAnswers.push(ar.data)
                      } catch (e) {
                        // continue
                      }
                    }
                  }
                  setQuestions((prev) =>
                    prev.map((it) =>
                      it.id === editTargetId
                        ? {
                            ...it,
                            question: editQuestion.question,
                            multiple: editQuestion.allow_multiple === 1,
                            is_active: editQuestion.is_active === 1,
                            order_index: editQuestion.sort_order,
                            updated_at: new Date().toISOString(),
                            answers: createdAnswers.length ? [...(it.answers || []), ...createdAnswers] : it.answers,
                          }
                        : it,
                    ),
                  )
                  toast({ title: "Success", description: "Question updated successfully" })
                  setIsEditDialogOpen(false)
                  setEditAnswers([])
                } catch (error) {
                  toast({ title: "Error", description: "Failed to update question", variant: "destructive" })
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
