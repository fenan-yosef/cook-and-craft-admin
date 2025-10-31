import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Subscription Types model (admin-configurable pricing for plan names)
type SubscriptionTypeName = "weekly" | "monthly" | "3months"
interface SubscriptionType {
  name: SubscriptionTypeName
  price: number
}

// Base URL for the API
const API_BASE_URL = "https://cook-craft.dhcb.io/api"

export default function SubscriptionTypesPage() {
  const { token } = useAuth()
  const { toast } = useToast()

  const [types, setTypes] = useState<SubscriptionType[]>([
    { name: "weekly", price: 0 },
    { name: "monthly", price: 0 },
    { name: "3months", price: 0 },
  ])
  const [typesLoading, setTypesLoading] = useState<boolean>(false)
  const [typesSaving, setTypesSaving] = useState<boolean>(false)

  useEffect(() => {
    fetchSubscriptionTypes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Fetch subscription types (public endpoint; still include token if available)
  const fetchSubscriptionTypes = async () => {
    try {
      setTypesLoading(true)
      const response = await fetch(`${API_BASE_URL}/subscriptions/types`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!response.ok) throw new Error("Failed to fetch subscription types")
      const data = await response.json()
      const received: SubscriptionType[] = (data?.data ?? [])
        .filter((t: any) => ["weekly", "monthly", "3months"].includes(t?.name))
        .map((t: any) => ({ name: t.name as SubscriptionTypeName, price: Number(t.price) || 0 }))
      // Merge with defaults to ensure all three appear
      const defaultNames: SubscriptionTypeName[] = ["weekly", "monthly", "3months"]
      const merged: SubscriptionType[] = defaultNames.map((n) => received.find((r) => r.name === n) ?? { name: n, price: 0 })
      setTypes(merged)
    } catch (error) {
      console.warn("Failed to fetch subscription types", error)
      toast({ title: "Error", description: "Couldn't load subscription types.", variant: "destructive" })
    } finally {
      setTypesLoading(false)
    }
  }

  // Save subscription types (admin endpoint; used for create/update)
  const saveSubscriptionTypes = async () => {
    if (!token) {
      toast({ title: "Auth required", description: "Please log in first.", variant: "destructive" })
      return
    }
    try {
      setTypesSaving(true)
      const response = await fetch(`${API_BASE_URL}/admins/subscriptions/types`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ types }),
      })
      if (!response.ok) throw new Error("Failed to save subscription types")
      toast({ title: "Saved", description: "Subscription types updated successfully." })
      // re-fetch to be sure we reflect backend rounding/validation
      fetchSubscriptionTypes()
    } catch (error) {
      toast({ title: "Error", description: "Failed to save subscription types.", variant: "destructive" })
    } finally {
      setTypesSaving(false)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Subscription Types</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchSubscriptionTypes} disabled={typesLoading || typesSaving}>
              Refresh
            </Button>
            <Button onClick={saveSubscriptionTypes} disabled={typesLoading || typesSaving}>
              {typesSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Plan Prices</CardTitle>
            <CardDescription>Configure plan prices for Weekly, Monthly, and 3 months</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((t, idx) => (
                  <TableRow key={t.name}>
                    <TableCell className="font-medium capitalize">{t.name === "3months" ? "3 months" : t.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-xs">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min={0}
                          value={Number.isFinite(t.price) ? t.price : 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            setTypes((prev) => prev.map((x, i) => (i === idx ? { ...x, price: isNaN(val) ? 0 : val } : x)))
                          }}
                          className="w-40"
                          disabled={typesLoading}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {typesLoading && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground">
                      Loading types...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
