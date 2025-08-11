import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RecipesPage() {
  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Recipes Management</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recipes</CardTitle>
            <CardDescription>Manage subscription recipes</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Recipes management functionality will be implemented here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
