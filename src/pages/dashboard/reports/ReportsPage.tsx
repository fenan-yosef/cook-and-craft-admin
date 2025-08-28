import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, MoreHorizontal, Eye, CheckCircle, XCircle, AlertTriangle, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context";

interface PostReport {
  id: number
  post_id: number
  post_title: string
  post_content: string
  user_id: number
  reporter_name: string
  reporter_email: string
  reason: string
  description?: string
  status: "pending" | "resolved" | "dismissed"
  created_at: string
  resolved_at?: string
  resolved_by?: string
}

const statusColors = {
  pending: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-red-100 text-red-800",
}

const reasonColors = {
  spam: "bg-red-100 text-red-800",
  harassment: "bg-orange-100 text-orange-800",
  inappropriate: "bg-purple-100 text-purple-800",
  misinformation: "bg-blue-100 text-blue-800",
  other: "bg-gray-100 text-gray-800",
}

const API_BASE_URL = "https://cook-craft.dhcb.io/api"

export default function ReportsPage() {
  const [reports, setReports] = useState<PostReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedReport, setSelectedReport] = useState<PostReport | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [resolutionNote, setResolutionNote] = useState("")
  const { toast } = useToast()
  const { token } = useAuth();

  useEffect(() => {
    fetchReports()
  }, [token])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/post_reports`, {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Accept": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch reports")
      }
      const result = await response.json();
      setReports(
        result.data.map((item: any) => ({
          id: item.id,
          post_id: item.post_id,
          post_title: `Post #${item.post_id}`,
          post_content: "",
          user_id: item.user_id,
          reporter_name: `User #${item.user_id}`,
          reporter_email: "",
          reason: item.reason,
          status: item.status === "reviewed" ? "resolved" : item.status as "pending" | "resolved" | "dismissed",
          created_at: item.created_at,
          resolved_at: item.reviewed_at,
          resolved_by: item.reviewed_by,
        }))
      );

    } catch (error) {
      console.error("Fetch reports error:", error)
      toast({
        title: "Error",
        description: "Failed to fetch reports",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resolveReport = async (reportId: number, resolution: "resolved" | "dismissed") => {
    try {
      const statusToApi = resolution === "resolved" ? "reviewed" : "dismissed"

      const response = await fetch(`${API_BASE_URL}/post_reports/${reportId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
          "Accept": "application/json",

        },
        body: JSON.stringify({ status: statusToApi, note: resolutionNote }),
      })

      if (!response.ok) {
        throw new Error("Failed to resolve report")
      }

      setReports((prevReports) =>
        prevReports.map((report) =>
          report.id === reportId
            ? {
              ...report,
              status: resolution,
              resolved_at: new Date().toISOString(),
              resolved_by: "Admin User",
            }
            : report,
        ),
      )

      setIsViewDialogOpen(false)
      setResolutionNote("")
      toast({
        title: "Success",
        description: `Report ${resolution} successfully`,
      })
    } catch (error) {
      console.error("Resolve report error:", error)
      toast({
        title: "Error",
        description: "Failed to resolve report",
        variant: "destructive",
      })
    }
  }

  const viewReport = async (report: PostReport) => {
  try {
    const response = await fetch(`${API_BASE_URL}/post_reports/${report.id}`, {
      headers: {
        "Authorization": token ? `Bearer ${token}` : "",
        "Accept": "application/json",
      },
    })
    if (!response.ok) {
      throw new Error("Failed to fetch single report")
    }

    const result = await response.json()
    const item = result.data

    const detailedReport: PostReport = {
      id: item.id,
      post_id: item.post_id,
      post_title: `Post #${item.post_id}`,
      post_content: "", // You can ask backend for post content if available
      user_id: item.user_id,
      reporter_name: `User #${item.user_id}`,
      reporter_email: "",
      reason: item.reason,
      status: item.status === "reviewed" ? "resolved" : item.status,
      created_at: item.created_at,
      resolved_at: item.reviewed_at,
      resolved_by: item.reviewed_by,
      description: item.description || "",
    }

    setSelectedReport(detailedReport)
    setIsViewDialogOpen(true)
  } catch (error) {
    console.error("View report error:", error)
    toast({
      title: "Error",
      description: "Failed to fetch report details",
      variant: "destructive",
    })
  }
}

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.post_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reporter_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reason.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || report.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Post Reports</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.filter((r) => r.status === "pending").length}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Reports</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.filter((r) => r.status === "resolved").length}</div>
              <p className="text-xs text-muted-foreground">Action taken</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dismissed Reports</CardTitle>
              <XCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.filter((r) => r.status === "dismissed").length}</div>
              <p className="text-xs text-muted-foreground">No action needed</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Reports</CardTitle>
            <CardDescription>Review and manage community reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium truncate">{report.post_title}</div>
                          <div className="text-sm text-muted-foreground truncate">{report.post_content}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{report.reporter_name}</div>
                          <div className="text-sm text-muted-foreground">{report.reporter_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={reasonColors[report.reason as keyof typeof reasonColors] || reasonColors.other}
                        >
                          {report.reason}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[report.status]}>{report.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(report.created_at).toLocaleDateString()}
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
                            <DropdownMenuItem onClick={() => viewReport(report)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {report.status === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => resolveReport(report.id, "resolved")}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark Resolved
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => resolveReport(report.id, "dismissed")}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Dismiss Report
                                </DropdownMenuItem>
                              </>
                            )}
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

        {/* View Report Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Report Details</DialogTitle>
              <DialogDescription>Review report information and take action</DialogDescription>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Report ID</Label>
                    <p className="text-sm mt-1">#{selectedReport.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={`mt-1 ${statusColors[selectedReport.status]}`}>{selectedReport.status}</Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Reported Post</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <p className="font-medium text-sm">{selectedReport.post_title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{selectedReport.post_content}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Reporter</Label>
                    <div className="mt-1">
                      <p className="text-sm font-medium">{selectedReport.reporter_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedReport.reporter_email}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Reason</Label>
                    <Badge
                      className={`mt-1 ${reasonColors[selectedReport.reason as keyof typeof reasonColors] || reasonColors.other}`}
                    >
                      {selectedReport.reason}
                    </Badge>
                  </div>
                </div>

                {selectedReport.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm">{selectedReport.description}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Reported On</Label>
                    <p className="text-sm mt-1">{new Date(selectedReport.created_at).toLocaleString()}</p>
                  </div>
                  {selectedReport.resolved_at && (
                    <div>
                      <Label className="text-sm font-medium">Resolved On</Label>
                      <p className="text-sm mt-1">{new Date(selectedReport.resolved_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {selectedReport.status === "pending" && (
                  <div>
                    <Label className="text-sm font-medium">Resolution Note (Optional)</Label>
                    <Textarea
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Add a note about your decision..."
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {selectedReport?.status === "pending" ? (
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="outline" onClick={() => resolveReport(selectedReport.id, "dismissed")}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Dismiss
                  </Button>
                  <Button onClick={() => resolveReport(selectedReport.id, "resolved")}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Resolve
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}