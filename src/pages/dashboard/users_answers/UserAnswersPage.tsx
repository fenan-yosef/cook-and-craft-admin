import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-service"
import { Search } from "lucide-react"

interface UserPreferenceAnswer {
  id: number
  user_id: number
  question: string
  answer: string
  answered_at: string
}

export default function UserAnswersPage() {
  const [answers, setAnswers] = useState<UserPreferenceAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  // Fetch user preference answers from API
  const fetchPreferences = async () => {
    try {
  setLoading(true)
  // Ensure auth token is set on ApiService
  const storedToken = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  if (storedToken) apiService.setAuthToken(storedToken)
  const response = await apiService.get("/users_preference_answers/")
      setAnswers(response.data)
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch answers", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPreferences()
  }, [])

  const filteredAnswers = answers.filter(
    (q) =>
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">User Answers</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All User Answers</CardTitle>
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
                  <TableHead>Question</TableHead>
                  <TableHead>Answer</TableHead>
                  <TableHead>Answered At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredAnswers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      No answers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAnswers.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>{q.question}</TableCell>
                      <TableCell>{q.answer}</TableCell>
                      <TableCell>{new Date(q.answered_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
