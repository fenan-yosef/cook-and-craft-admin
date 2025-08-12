import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function MealsPage() {
  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Meals Management</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Meals</CardTitle>
            <CardDescription>Manage subscription meals</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Meals management functionality will be implemented here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
