import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

// Domain model for conversion rules
// Points earned in the app can be converted to either wallet balance or credits.
// Admin configures rates and limits. We'll mock the data and persist in localStorage for now.

export type ConversionTarget = "wallet" | "credit"

export interface ConversionRules {
  enabled: boolean
  // How many points equal 1 unit of money/credit
  pointsPerUnit: number // e.g., 100 points = 1 currency unit (or credit)
  // Minimum points allowed per single convert action
  minPointsPerConversion: number
  // Maximum points per single convert action (0 or null = unlimited)
  maxPointsPerConversion?: number | null
  // Daily cap for total points that can be converted (0 or null = unlimited)
  dailyPointsCap?: number | null
  // Allowed conversion targets
  allowWallet: boolean
  allowCredit: boolean
  // Optional fee percentage taken during conversion (0-100)
  feePercent?: number
}

const STORAGE_KEY = "mock_conversion_rules"

const defaultRules: ConversionRules = {
  enabled: true,
  pointsPerUnit: 100,
  minPointsPerConversion: 100,
  maxPointsPerConversion: 0,
  dailyPointsCap: 0,
  allowWallet: true,
  allowCredit: true,
  feePercent: 0,
}

function loadRules(): ConversionRules {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultRules
    const parsed = JSON.parse(raw)
    return { ...defaultRules, ...parsed }
  } catch {
    return defaultRules
  }
}

function saveRules(rules: ConversionRules) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
  } catch {}
}

export default function ConversionRulesPage() {
  const { toast } = useToast()
  const [rules, setRules] = useState<ConversionRules>(defaultRules)
  const [editing, setEditing] = useState(false)

  // Calculator state (to preview effects)
  const [simulatePoints, setSimulatePoints] = useState<string>("")
  const [simulateTarget, setSimulateTarget] = useState<ConversionTarget>("wallet")

  useEffect(() => {
    setRules(loadRules())
  }, [])

  const computed = useMemo(() => {
    const pts = Number(simulatePoints) || 0
    const pointsPerUnit = Math.max(1, Number(rules.pointsPerUnit) || 1)
    const fee = Math.min(100, Math.max(0, Number(rules.feePercent) || 0))
    const rawUnits = pts / pointsPerUnit
    const feeAmount = rawUnits * (fee / 100)
    const finalUnits = Math.max(0, rawUnits - feeAmount)
    const warnings: string[] = []

    if (!rules.enabled) warnings.push("Conversions are currently disabled.")
    if (rules.minPointsPerConversion && pts > 0 && pts < rules.minPointsPerConversion) warnings.push(`Below minimum per conversion (${rules.minPointsPerConversion} pts).`)
    if (rules.maxPointsPerConversion && rules.maxPointsPerConversion > 0 && pts > rules.maxPointsPerConversion) warnings.push(`Above maximum per conversion (${rules.maxPointsPerConversion} pts).`)
    if (simulateTarget === "wallet" && !rules.allowWallet) warnings.push("Wallet conversions are disabled.")
    if (simulateTarget === "credit" && !rules.allowCredit) warnings.push("Credit conversions are disabled.")

    return { rawUnits, feeAmount, finalUnits, warnings }
  }, [simulatePoints, rules, simulateTarget])

  const startEdit = () => setEditing(true)
  const cancelEdit = () => {
    setRules(loadRules())
    setEditing(false)
  }
  const saveEdit = () => {
    saveRules(rules)
    setEditing(false)
    toast({ title: "Saved", description: "Conversion rules updated." })
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Conversion Rules</h1>
        {!editing ? (
          <Button onClick={startEdit}>Edit Rules</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Rules</CardTitle>
          <CardDescription>Rules that control points conversion to wallet or credits.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Enabled</Label>
            {editing ? (
              <div className="flex items-center gap-3">
                <Switch checked={rules.enabled} onCheckedChange={(v) => setRules((r) => ({ ...r, enabled: v }))} />
                <span>{rules.enabled ? "On" : "Off"}</span>
              </div>
            ) : (
              <div className="text-sm">{rules.enabled ? "Yes" : "No"}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Points per 1 unit</Label>
            {editing ? (
              <Input type="number" value={rules.pointsPerUnit} onChange={(e) => setRules((r) => ({ ...r, pointsPerUnit: Number(e.target.value) }))} />
            ) : (
              <div className="text-sm">{rules.pointsPerUnit}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Minimum points per conversion</Label>
            {editing ? (
              <Input type="number" value={rules.minPointsPerConversion} onChange={(e) => setRules((r) => ({ ...r, minPointsPerConversion: Number(e.target.value) }))} />
            ) : (
              <div className="text-sm">{rules.minPointsPerConversion}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Maximum points per conversion (0 = unlimited)</Label>
            {editing ? (
              <Input type="number" value={rules.maxPointsPerConversion ?? 0} onChange={(e) => setRules((r) => ({ ...r, maxPointsPerConversion: Number(e.target.value) }))} />
            ) : (
              <div className="text-sm">{rules.maxPointsPerConversion ? rules.maxPointsPerConversion : "Unlimited"}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Daily points cap (0 = unlimited)</Label>
            {editing ? (
              <Input type="number" value={rules.dailyPointsCap ?? 0} onChange={(e) => setRules((r) => ({ ...r, dailyPointsCap: Number(e.target.value) }))} />
            ) : (
              <div className="text-sm">{rules.dailyPointsCap ? rules.dailyPointsCap : "Unlimited"}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Fee percent (0-100)</Label>
            {editing ? (
              <Input type="number" value={rules.feePercent ?? 0} onChange={(e) => setRules((r) => ({ ...r, feePercent: Number(e.target.value) }))} />
            ) : (
              <div className="text-sm">{rules.feePercent ?? 0}%</div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Allow wallet conversion</Label>
            {editing ? (
              <div className="flex items-center gap-3">
                <Switch checked={rules.allowWallet} onCheckedChange={(v) => setRules((r) => ({ ...r, allowWallet: v }))} />
                <span>{rules.allowWallet ? "Enabled" : "Disabled"}</span>
              </div>
            ) : (
              <div className="text-sm">{rules.allowWallet ? "Enabled" : "Disabled"}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Allow credit conversion</Label>
            {editing ? (
              <div className="flex items-center gap-3">
                <Switch checked={rules.allowCredit} onCheckedChange={(v) => setRules((r) => ({ ...r, allowCredit: v }))} />
                <span>{rules.allowCredit ? "Enabled" : "Disabled"}</span>
              </div>
            ) : (
              <div className="text-sm">{rules.allowCredit ? "Enabled" : "Disabled"}</div>
            )}
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Tip: 100 points per 1 unit means 500 points convert to 5 units (minus any fee).
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversion Calculator</CardTitle>
          <CardDescription>Simulate a conversion to preview the result under the current rules.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Points to convert</Label>
            <Input type="number" placeholder="e.g. 500" value={simulatePoints} onChange={(e) => setSimulatePoints(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Target</Label>
            <div className="flex gap-2">
              <Button
                variant={simulateTarget === "wallet" ? "default" : "outline"}
                onClick={() => setSimulateTarget("wallet")}
                disabled={!rules.allowWallet}
              >
                Wallet
              </Button>
              <Button
                variant={simulateTarget === "credit" ? "default" : "outline"}
                onClick={() => setSimulateTarget("credit")}
                disabled={!rules.allowCredit}
              >
                Credit
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Result</Label>
            <div className="text-sm">
              {computed.finalUnits.toFixed(2)} {simulateTarget === "wallet" ? "wallet units" : "credits"}
            </div>
            {computed.warnings.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-xs text-amber-600">
                {computed.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Formula: (points / pointsPerUnit) - fee%.
        </CardFooter>
      </Card>

      <div className="text-xs text-muted-foreground">
        This page uses mock data stored in your browser. When the API is ready, replace loads/saves with the proper endpoints.
      </div>
    </div>
  )
}
