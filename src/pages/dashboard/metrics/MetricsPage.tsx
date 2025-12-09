
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiService } from "@/lib/api-service";

// Example KPI types (replace with real fields as needed)
interface SalesRevenueKPI {
  totalRevenue: number;
  orderRevenue: number;
  subscriptionRevenue: number;
  subscriptionBreakdown: {
    oven_baked: number;
    weekly: number;
    monthly: number;
    ['3months']: number;
  };
  calculatedAt: string;
    // Subscription vs One-Time Ratio
    subVsOneTimePeriods?: {
      [period: string]: {
        one_time_revenue: number;
        subscription_revenue: number;
        total_revenue: number;
        subscription_vs_onetime_ratio: number;
        subscription_percentage: number;
        onetime_percentage: number;
        period_start: string;
        period_end: string;
      };
    };
    subVsOneTimeOverall?: {
      all_time_onetime_revenue: number;
      all_time_subscription_revenue: number;
      all_time_total_revenue: number;
      overall_ratio: number;
      subscription_percentage: number;
      onetime_percentage: number;
      active_subscriptions: number;
      total_orders: number;
    };
    subVsOneTimeTrends?: {
      monthly_trends: {
        ratio_change: number;
        subscription_revenue_change: number;
        onetime_revenue_change: number;
      };
      quarterly_trends: {
        ratio_change: number;
        subscription_percentage_change: number;
      };
    };
    subVsOneTimeInsights?: string[];
    subVsOneTimeCalculatedAt?: string;
  // Revenue by product type
  productTypeBreakdown?: {
    fresh_meal_kits: number;
    oven_baked: number;
    frozen_boxes: number;
    gathering_boxes: number;
    add_ons: number;
    uncategorized: number;
  };
  productTypePercentages?: {
    fresh_meal_kits: number;
    oven_baked: number;
    frozen_boxes: number;
    gathering_boxes: number;
    add_ons: number;
    uncategorized: number;
  };
  productTypeTotalCategorized?: number;
  productTypeCalculatedAt?: string;
  // Average order value
  overallAOV?: number;
  totalOrders?: number;
  aovTotalRevenue?: number;
  aovTrends?: {
    last_30_days: number;
    previous_30_days: number;
    growth_rate: number;
  };
  aovSegments?: {
    low_value: number;
    medium_value: number;
    high_value: number;
  };
  aovCalculatedAt?: string;
  // Sales by channel
  salesByChannelPeriods?: {
    [period: string]: {
      total_revenue: number;
      total_orders: number;
      channels: {
        web: { revenue: number; orders: number; avg_order_value: number; percentage: number };
        app: { revenue: number; orders: number; avg_order_value: number; percentage: number };
        partner: { revenue: number; orders: number; avg_order_value: number; percentage: number };
      };
      period_start: string;
      period_end: string;
    };
  };
  salesByChannelOverall?: {
    total_revenue: number;
    total_orders: number;
    channels: {
      web: { revenue: number; orders: number; avg_order_value: number; percentage: number };
      app: { revenue: number; orders: number; avg_order_value: number; percentage: number };
      partner: { revenue: number; orders: number; avg_order_value: number; percentage: number };
    };
    top_performing_channel: { channel: string | null; revenue: number; percentage: number };
    channel_diversity_score: number;
  };
  salesByChannelTrends?: {
    monthly_trends: Record<string, { revenue_change: number; orders_change: number }>;
    quarterly_trends: Record<string, { revenue_change: number; percentage_change: number }>;
  };
  salesByChannelInsights?: string[];
  salesByChannelCalculatedAt?: string;
  // Revenue growth rate
  revenueGrowthRate?: number;
  currentMonthRevenue?: number;
  previousMonthRevenue?: number;
  revenueDifference?: number;
  revenueGrowthPeriod?: { current_month: string; previous_month: string };
  // Product performance
  productPerformance?: {
    top_products: { by_revenue: any[]; by_quantity: any[] };
    category_performance: any[];
    inventory_insights: {
      fast_moving_products: { id: number; name: string; category: string | null }[];
      slow_moving_products: { id: number; name: string; category: string | null }[];
      velocity_insights: { avg_daily_velocity_top_10: number; products_with_zero_sales_30_days: number };
    };
    time_based_performance: {
      last_7_days: any;
      last_30_days: any;
      last_90_days: any;
    };
    lifecycle_analysis: {
      new_products: { id: number; name: string; category: string | null; launch_date: string; orders_count: number; days_since_launch: number }[];
      declining_products: any[];
      lifecycle_insights: { new_products_count: number; declining_products_count: number; avg_orders_for_new_products: number };
    };
    summary: {
      top_revenue_product: string;
      top_quantity_product: string;
      top_performing_category: string;
      total_categories_analyzed: number;
      total_products_with_sales: number;
    };
    calculated_at: string;
  };
}

interface CustomerKPI {
  // New Customer Acquisition Rate endpoint data
  acquisitionPeriods?: {
    [period: string]: {
      rate: number;
      new_customers_count: number;
      total_customers_count: number;
      period_start: string;
      period_end: string;
    };
  };
  acquisitionTrending?: {
    monthly_growth: number;
    quarterly_growth: number;
  };
  acquisitionSummary?: {
    primary_rate: number;
    primary_period: string; // key into acquisitionPeriods
  };
  acquisitionCalculatedAt?: string;
  // Derived simple KPI fields (kept for forward compatibility with future endpoints)
  totalCustomers?: number;
  newCustomers?: number;
  activeCustomers?: number; // placeholder until active customer endpoint provided
  churnRate?: number; // placeholder until churn endpoint provided
  // Retention Rate endpoint data
  retentionPeriods?: {
    [period: string]: {
      rate: number;
      retained_customers: number;
      customers_at_start: number;
      period_days: number;
      breakdown: { via_orders: number; via_subscriptions: number };
    };
  };
  retentionBenchmark?: {
    rate: number;
    retained_customers: number;
    customers_at_start: number;
    period_days: number;
    breakdown: { via_orders: number; via_subscriptions: number };
  };
  retentionTrends?: {
    improving: boolean;
    best_period: string;
    trend_direction: string;
  };
  retentionInsights?: {
    health_status: string;
    primary_driver: string;
    recommendation: string;
  };
  retentionCalculatedAt?: string;
  // Churn Rate endpoint data
  churnPeriods?: {
    [period: string]: {
      subscription_churn_rate: number;
      customer_churn_rate: number;
      cancelled_subscriptions: number;
      inactive_customers: number;
      active_subscriptions_start: number;
      period_days: number;
      churn_velocity: number;
    };
  };
  churnPrimary?: {
    subscription_churn_rate: number;
    customer_churn_rate: number;
    cancelled_subscriptions: number;
    inactive_customers: number;
    active_subscriptions_start: number;
    period_days: number;
    churn_velocity: number;
  };
  churnAlerts?: {
    high_churn: boolean;
    increasing_trend: boolean;
    critical_velocity: boolean;
    subscription_risk: boolean;
  };
  churnInsights?: {
    primary_concern: string;
    urgency_level: string;
    recommended_action: string;
    trend_analysis: string;
  };
  churnCalculatedAt?: string;
  // Repeat Purchase Rate endpoint data
  repeatPurchaseOverall?: {
    rate: number;
    repeat_customers: number;
    total_customers: number;
    subscription_adoption_rate: number;
  };
  repeatPurchaseSegments?: {
    one_time_buyers: number;
    repeat_buyers: number;
    subscribers: number;
    inactive: number;
  };
  repeatPurchaseTimeBased?: {
    [period: string]: {
      new_customers: number;
      repeat_customers: number;
      rate: number;
    };
  };
  repeatPurchaseInsights?: {
    loyalty_score: number;
    primary_segment: string;
    engagement_level: string;
  };
  repeatPurchaseCalculatedAt?: string;
  // Cancellation Reasons endpoint data
  cancellationPeriods?: {
    [period: string]: {
      total_cancellations: number;
      total_active_subscriptions: number;
      cancellation_rate: number;
      reasons_breakdown: {
        [reason: string]: { count: number; percentage: number };
      };
      period_start: string;
      period_end: string;
    };
  };
  cancellationOverall?: {
    total_subscriptions: number;
    total_cancelled: number;
    active_subscriptions: number;
    overall_cancellation_rate: number;
    average_duration_before_cancellation_days: number;
    top_cancellation_reasons: { reason: string; count: number; percentage: number }[];
  };
  cancellationTrends?: {
    monthly_trend: { cancellation_count_change: number; cancellation_rate_change: number };
    quarterly_trend: { cancellation_count_change: number; cancellation_rate_change: number };
  };
  cancellationInsights?: string[];
  cancellationCalculatedAt?: string;
  // Customer Revenue Growth Rate (customer-specific perspective)
  customerRevenueGrowthRate?: number;
  customerCurrentMonthRevenue?: number;
  customerPreviousMonthRevenue?: number;
  customerRevenueDifference?: number;
  customerRevenueGrowthPeriod?: { current_month: string; previous_month: string };
}

export default function MetricsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [salesKPI, setSalesKPI] = useState<SalesRevenueKPI | null>(null);
  const [customerKPI, setCustomerKPI] = useState<CustomerKPI | null>(null);

  useEffect(() => {
    fetchAllKPIs();
    // eslint-disable-next-line
  }, [token]);

  // Replace these with real API calls and endpoints
  const fetchAllKPIs = async () => {
    setLoading(true);
    try {
      // Fetch Sales/Revenue KPI
      const baseUrl = apiService.getBaseUrl();
      let salesData: SalesRevenueKPI | null = null;
      if (token) {
        // Fetch total revenue
        const res = await fetch(`${baseUrl}/metrics/total-revenue`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        if (!res.ok) throw new Error("Failed to fetch total revenue");
        const json = await res.json();
        const d = json.data;
        salesData = {
          totalRevenue: d.total_revenue,
          orderRevenue: d.order_revenue,
          subscriptionRevenue: d.subscription_revenue,
          subscriptionBreakdown: d.subscription_breakdown,
          calculatedAt: d.calculated_at,
        };

        // Fetch revenue by product type
        const res2 = await fetch(`${baseUrl}/metrics/revenue-by-product-type`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        if (!res2.ok) throw new Error("Failed to fetch revenue by product type");
        const json2 = await res2.json();
        const d2 = json2.data;
        salesData.productTypeBreakdown = d2.breakdown;
        salesData.productTypePercentages = d2.percentages;
        salesData.productTypeTotalCategorized = d2.total_categorized;
        salesData.productTypeCalculatedAt = d2.calculated_at;

        // Fetch average order value
        const res3 = await fetch(`${baseUrl}/metrics/average-order-value`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        if (!res3.ok) throw new Error("Failed to fetch average order value");
        const json3 = await res3.json();
        const d3 = json3.data;
        salesData.overallAOV = d3.overall_aov;
        salesData.totalOrders = d3.total_orders;
        salesData.aovTotalRevenue = d3.total_revenue;
        salesData.aovTrends = d3.trends;
        salesData.aovSegments = d3.segments;
        salesData.aovCalculatedAt = d3.calculated_at;

        // Fetch subscription vs one-time ratio
        const res4 = await fetch(`${baseUrl}/metrics/subscription-vs-one-time-ratio`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        if (!res4.ok) throw new Error("Failed to fetch subscription vs one-time ratio");
        const json4 = await res4.json();
        const d4 = json4.data;
        salesData.subVsOneTimePeriods = d4.periods;
        salesData.subVsOneTimeOverall = d4.overall;
        salesData.subVsOneTimeTrends = d4.trends;
        salesData.subVsOneTimeInsights = d4.insights;
        salesData.subVsOneTimeCalculatedAt = d4.calculated_at;

        // Fetch sales by channel
        const res5 = await fetch(`${baseUrl}/metrics/sales-by-channel`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        if (!res5.ok) throw new Error("Failed to fetch sales by channel");
        const json5 = await res5.json();
        const d5 = json5.data;
        salesData.salesByChannelPeriods = d5.periods;
        salesData.salesByChannelOverall = d5.overall;
        salesData.salesByChannelTrends = d5.trends;
        salesData.salesByChannelInsights = d5.insights;
        salesData.salesByChannelCalculatedAt = d5.calculated_at;

        // Fetch revenue growth rate
        const res6 = await fetch(`${baseUrl}/metrics/revenue-growth-rate`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        if (!res6.ok) throw new Error("Failed to fetch revenue growth rate");
        const json6 = await res6.json();
        const d6 = json6.data;
        salesData.revenueGrowthRate = d6.growth_rate;
        salesData.currentMonthRevenue = d6.current_month_revenue;
        salesData.previousMonthRevenue = d6.previous_month_revenue;
        salesData.revenueDifference = d6.revenue_difference;
        salesData.revenueGrowthPeriod = d6.period;

        // Fetch product performance
        const res7 = await fetch(`${baseUrl}/metrics/product-performance`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        if (!res7.ok) throw new Error("Failed to fetch product performance");
        const json7 = await res7.json();
        const d7 = json7.data;
        // The endpoint may return an empty array when data is cleared. An empty
        // array is truthy and would cause rendering code to attempt to access
        // object fields (like `.summary`) and crash. Treat an empty array as
        // "no data" and leave `productPerformance` undefined so the UI
        // gracefully skips the Product Performance section.
        salesData.productPerformance = Array.isArray(d7) && d7.length === 0 ? undefined : d7;
      }
      // Fetch new customer acquisition rate (Customer KPI)
      let customerData: CustomerKPI | null = null;
      if (token) {
        const resCust = await fetch(`${baseUrl}/metrics/new-customer-acquisition-rate`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        if (!resCust.ok) throw new Error("Failed to fetch new customer acquisition rate");
        const jsonCust = await resCust.json();
        const cd = jsonCust.data;
        const primaryKey = cd?.summary?.primary_period;
        const primaryPeriod = primaryKey ? cd.periods?.[primaryKey] : undefined;
        customerData = {
          acquisitionPeriods: cd.periods,
          acquisitionTrending: cd.trending,
          acquisitionSummary: cd.summary,
          acquisitionCalculatedAt: cd.calculated_at,
          totalCustomers: primaryPeriod?.total_customers_count,
          newCustomers: primaryPeriod?.new_customers_count,
        };

        // Fetch customer retention rate and merge
        const resRetention = await fetch(`${baseUrl}/metrics/customer-retention-rate`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        if (!resRetention.ok) throw new Error("Failed to fetch customer retention rate");
        const jsonRetention = await resRetention.json();
        const rd = jsonRetention.data;
        customerData = {
          ...customerData,
          retentionPeriods: rd.periods,
          retentionBenchmark: rd.benchmark,
            retentionTrends: rd.trends,
            retentionInsights: rd.insights,
            retentionCalculatedAt: rd.calculated_at,
        };

        // Fetch churn rate and merge
        const resChurn = await fetch(`${baseUrl}/metrics/churn-rate`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        if (!resChurn.ok) throw new Error("Failed to fetch churn rate");
        const jsonChurn = await resChurn.json();
        const chd = jsonChurn.data;
        customerData = {
          ...customerData,
          churnPeriods: chd.periods,
          churnPrimary: chd.primary,
          churnAlerts: chd.alerts,
          churnInsights: chd.insights,
          churnCalculatedAt: chd.calculated_at,
          churnRate: chd.primary?.customer_churn_rate,
        };

        // Fetch repeat purchase rate and merge
        const resRepeat = await fetch(`${baseUrl}/metrics/repeat-purchase-rate`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        if (!resRepeat.ok) throw new Error("Failed to fetch repeat purchase rate");
        const jsonRepeat = await resRepeat.json();
        const rpd = jsonRepeat.data;
        customerData = {
          ...customerData,
          repeatPurchaseOverall: rpd.overall,
          repeatPurchaseSegments: rpd.segments,
          repeatPurchaseTimeBased: rpd.time_based_analysis,
          repeatPurchaseInsights: rpd.insights,
          repeatPurchaseCalculatedAt: rpd.calculated_at,
        };

        // Fetch cancellation reasons and merge
        const resCancellation = await fetch(`${baseUrl}/metrics/cancellation-reasons`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        if (!resCancellation.ok) throw new Error("Failed to fetch cancellation reasons");
        const jsonCancellation = await resCancellation.json();
        const canc = jsonCancellation.data;
        customerData = {
          ...customerData,
          cancellationPeriods: canc.periods,
          cancellationOverall: canc.overall,
          cancellationTrends: canc.trends,
          cancellationInsights: canc.insights,
          cancellationCalculatedAt: canc.calculated_at,
        };

        // Fetch customer revenue growth rate (separate perspective if needed from sales growth)
        const resCustGrowth = await fetch(`${baseUrl}/metrics/revenue-growth-rate`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
        if (resCustGrowth.ok) { // don't fail whole chain if this duplicates
          const jsonCustGrowth = await resCustGrowth.json();
          const cg = jsonCustGrowth.data;
          customerData = {
            ...customerData,
            customerRevenueGrowthRate: cg.growth_rate,
            customerCurrentMonthRevenue: cg.current_month_revenue,
            customerPreviousMonthRevenue: cg.previous_month_revenue,
            customerRevenueDifference: cg.revenue_difference,
            customerRevenueGrowthPeriod: cg.period,
          };
        }
      }
      setSalesKPI(salesData);
      setCustomerKPI(customerData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch KPI data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">Metrics</h2>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Loading KPI Data...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">Loading...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold tracking-tight">Metrics</h2>
        </div>

        {/* Sales and Revenue KPI Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sales and Revenue KPI's</CardTitle>
            <CardDescription>Key performance indicators for sales and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {salesKPI && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <KPIBox label="Total Revenue" value={`$${salesKPI.totalRevenue.toLocaleString()}`} />
                  <KPIBox label="Order Revenue" value={`$${salesKPI.orderRevenue.toLocaleString()}`} />
                  <KPIBox label="Subscription Revenue" value={`$${salesKPI.subscriptionRevenue.toLocaleString()}`} />
                </div>
                <div className="mb-8">
                  <div className="text-lg font-semibold mb-2">Subscription Revenue Breakdown</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={[
                        { name: "Oven Baked", value: salesKPI.subscriptionBreakdown.oven_baked },
                        { name: "Weekly", value: salesKPI.subscriptionBreakdown.weekly },
                        { name: "Monthly", value: salesKPI.subscriptionBreakdown.monthly },
                        { name: "3 Months", value: salesKPI.subscriptionBreakdown["3months"] },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#4d7c0f" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="text-xs text-gray-500 mt-2">Last calculated: {new Date(salesKPI.calculatedAt).toLocaleString()}</div>
                </div>

                {/* Average Order Value Section */}
                {typeof salesKPI.overallAOV === 'number' && (
                  <div className="mb-8">
                    <div className="text-lg font-semibold mb-2">Average Order Value (AOV)</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                      <KPIBox label="Overall AOV" value={`$${salesKPI.overallAOV}`} />
                      <KPIBox label="Total Orders" value={salesKPI.totalOrders ?? '-'} />
                      <KPIBox label="AOV Revenue" value={`$${salesKPI.aovTotalRevenue?.toLocaleString() ?? '-'}`} />
                      <KPIBox label="Last 30d Growth" value={salesKPI.aovTrends ? `${salesKPI.aovTrends.growth_rate}%` : '-'} />
                    </div>
                    <div className="mb-2">
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart
                          data={salesKPI.aovSegments ? [
                            { name: "Low Value", value: salesKPI.aovSegments.low_value },
                            { name: "Medium Value", value: salesKPI.aovSegments.medium_value },
                            { name: "High Value", value: salesKPI.aovSegments.high_value },
                          ] : []}
                          margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#f59e42" name="AOV" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Last 30d: ${salesKPI.aovTrends?.last_30_days ?? '-'} | Prev 30d: ${salesKPI.aovTrends?.previous_30_days ?? '-'}<br />
                      Last calculated: {salesKPI.aovCalculatedAt ? new Date(salesKPI.aovCalculatedAt).toLocaleString() : "-"}
                    </div>
                  </div>
                )}
                {salesKPI.productTypeBreakdown && (
                  <div className="mb-4">
                    <div className="text-lg font-semibold mb-2">Revenue by Product Type</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={[
                          { name: "Fresh Meal Kits", value: salesKPI.productTypeBreakdown.fresh_meal_kits, percent: salesKPI.productTypePercentages?.fresh_meal_kits },
                          { name: "Oven Baked", value: salesKPI.productTypeBreakdown.oven_baked, percent: salesKPI.productTypePercentages?.oven_baked },
                          { name: "Frozen Boxes", value: salesKPI.productTypeBreakdown.frozen_boxes, percent: salesKPI.productTypePercentages?.frozen_boxes },
                          { name: "Gathering Boxes", value: salesKPI.productTypeBreakdown.gathering_boxes, percent: salesKPI.productTypePercentages?.gathering_boxes },
                          { name: "Add Ons", value: salesKPI.productTypeBreakdown.add_ons, percent: salesKPI.productTypePercentages?.add_ons },
                          { name: "Uncategorized", value: salesKPI.productTypeBreakdown.uncategorized, percent: salesKPI.productTypePercentages?.uncategorized },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: any) => [`$${value}`, "Revenue"]} />
                        <Bar dataKey="value" fill="#8884d8" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="text-xs text-gray-500 mt-2">
                      Total Categorized: ${salesKPI.productTypeTotalCategorized?.toLocaleString()}<br />
                      Last calculated: {salesKPI.productTypeCalculatedAt ? new Date(salesKPI.productTypeCalculatedAt).toLocaleString() : "-"}
                    </div>
                  </div>
                )}

                {/* Subscription vs One-Time Ratio Section */}
                {salesKPI.subVsOneTimePeriods && (
                  <div className="mb-8">
                    <div className="text-lg font-semibold mb-2">Subscription vs One-Time Revenue Ratio</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                      <KPIBox label="All-Time Subscription Revenue" value={`$${salesKPI.subVsOneTimeOverall?.all_time_subscription_revenue?.toLocaleString() ?? '-'}`} />
                      <KPIBox label="All-Time One-Time Revenue" value={`$${salesKPI.subVsOneTimeOverall?.all_time_onetime_revenue?.toLocaleString() ?? '-'}`} />
                      <KPIBox label="All-Time Total Revenue" value={`$${salesKPI.subVsOneTimeOverall?.all_time_total_revenue?.toLocaleString() ?? '-'}`} />
                    </div>
                    <div className="mb-2">
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart
                          data={Object.entries(salesKPI.subVsOneTimePeriods).map(([period, val]) => ({
                            name: period.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            Subscription: val.subscription_revenue,
                            "One-Time": val.one_time_revenue,
                          }))}
                          margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => [`$${value}`, "Revenue"]} />
                          <Bar dataKey="Subscription" fill="#4d7c0f" name="Subscription" />
                          <Bar dataKey="One-Time" fill="#f59e42" name="One-Time" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Active Subscriptions: {salesKPI.subVsOneTimeOverall?.active_subscriptions ?? '-'} | Total Orders: {salesKPI.subVsOneTimeOverall?.total_orders ?? '-'}<br />
                      Last calculated: {salesKPI.subVsOneTimeCalculatedAt ? new Date(salesKPI.subVsOneTimeCalculatedAt).toLocaleString() : "-"}
                    </div>
                    {salesKPI.subVsOneTimeInsights && salesKPI.subVsOneTimeInsights.length > 0 && (
                      <div className="mt-2">
                        <div className="font-semibold text-sm mb-1">Insights:</div>
                        <ul className="list-disc list-inside text-xs text-gray-700">
                          {salesKPI.subVsOneTimeInsights.map((insight, idx) => (
                            <li key={idx}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Sales by Channel Section */}
                {salesKPI.salesByChannelPeriods && (
                  <div className="mb-8">
                    <div className="text-lg font-semibold mb-2">Sales by Channel</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                      <KPIBox label="Overall Revenue" value={`$${salesKPI.salesByChannelOverall?.total_revenue?.toLocaleString() ?? '-'}`} />
                      <KPIBox label="Overall Orders" value={salesKPI.salesByChannelOverall?.total_orders ?? '-'} />
                      <KPIBox label="Top Channel" value={salesKPI.salesByChannelOverall?.top_performing_channel?.channel ?? '-'} />
                      <KPIBox label="Diversity Score" value={salesKPI.salesByChannelOverall?.channel_diversity_score?.toFixed(2) ?? '-'} />
                    </div>
                    <div className="mb-2">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={Object.entries(salesKPI.salesByChannelPeriods).map(([period, val]) => ({
                            name: period.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            Web: val.channels.web.revenue,
                            App: val.channels.app.revenue,
                            Partner: val.channels.partner.revenue,
                          }))}
                          margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => [`$${value}`, "Revenue"]} />
                          <Bar dataKey="Web" fill="#2563eb" name="Web" />
                          <Bar dataKey="App" fill="#16a34a" name="App" />
                          <Bar dataKey="Partner" fill="#9333ea" name="Partner" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {salesKPI.salesByChannelOverall?.top_performing_channel && (
                      <div className="text-xs text-gray-500 mt-2">
                        Top Channel: {salesKPI.salesByChannelOverall.top_performing_channel.channel ?? '-'} ({salesKPI.salesByChannelOverall.top_performing_channel.percentage}%)
                      </div>
                    )}
                    {salesKPI.salesByChannelInsights && salesKPI.salesByChannelInsights.length > 0 && (
                      <div className="mt-2">
                        <div className="font-semibold text-sm mb-1">Insights:</div>
                        <ul className="list-disc list-inside text-xs text-gray-700">
                          {salesKPI.salesByChannelInsights.map((insight, idx) => (
                            <li key={idx}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Revenue Growth Rate Section */}
                {typeof salesKPI.revenueGrowthRate === 'number' && (
                  <div className="mb-8">
                    <div className="text-lg font-semibold mb-2">Revenue Growth Rate</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                      <KPIBox label="Growth Rate" value={`${salesKPI.revenueGrowthRate}%`} />
                      <KPIBox label="Current Month" value={`$${salesKPI.currentMonthRevenue?.toLocaleString()}`} />
                      <KPIBox label="Previous Month" value={`$${salesKPI.previousMonthRevenue?.toLocaleString()}`} />
                      <KPIBox label="Difference" value={`$${salesKPI.revenueDifference?.toLocaleString()}`} />
                    </div>
                    <div className="mb-2">
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart
                          data={[
                            { name: salesKPI.revenueGrowthPeriod?.previous_month || 'Prev', revenue: salesKPI.previousMonthRevenue },
                            { name: salesKPI.revenueGrowthPeriod?.current_month || 'Current', revenue: salesKPI.currentMonthRevenue },
                          ]}
                          margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => [`$${value}`, 'Revenue']} />
                          <Bar dataKey="revenue" fill="#0d9488" name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Period: {salesKPI.revenueGrowthPeriod?.previous_month} → {salesKPI.revenueGrowthPeriod?.current_month}
                    </div>
                  </div>
                )}

                {/* Product Performance Section */}
                {salesKPI.productPerformance && (
                  <div className="mb-8">
                    <div className="text-lg font-semibold mb-2">Product Performance</div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-4">
                      <KPIBox label="Top Revenue Product" value={salesKPI.productPerformance.summary.top_revenue_product || 'N/A'} />
                      <KPIBox label="Top Quantity Product" value={salesKPI.productPerformance.summary.top_quantity_product || 'N/A'} />
                      <KPIBox label="Top Category" value={salesKPI.productPerformance.summary.top_performing_category || 'N/A'} />
                      <KPIBox label="# Categories" value={salesKPI.productPerformance.summary.total_categories_analyzed} />
                      <KPIBox label="Products w/ Sales" value={salesKPI.productPerformance.summary.total_products_with_sales} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <div className="text-sm font-semibold mb-2">Slow Moving Products</div>
                        <div className="max-h-48 overflow-auto border rounded p-2 text-xs space-y-1 bg-white">
                          {salesKPI.productPerformance.inventory_insights.slow_moving_products.length === 0 && <div className="text-gray-500">None</div>}
                          {salesKPI.productPerformance.inventory_insights.slow_moving_products.map(p => (
                            <div key={p.id} className="flex justify-between gap-2">
                              <span className="truncate" title={p.name}>{p.name}</span>
                              <span className="text-gray-400">{p.category || '—'}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">Zero-sales (30d): {salesKPI.productPerformance.inventory_insights.velocity_insights.products_with_zero_sales_30_days}</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold mb-2">New Products (Lifecycle)</div>
                        <div className="max-h-48 overflow-auto border rounded p-2 text-xs space-y-1 bg-white">
                          {salesKPI.productPerformance.lifecycle_analysis.new_products.length === 0 && <div className="text-gray-500">None</div>}
                          {salesKPI.productPerformance.lifecycle_analysis.new_products.map(p => (
                            <div key={p.id} className="flex justify-between gap-2">
                              <span className="truncate" title={p.name}>{p.name}</span>
                              <span className="text-gray-400">{p.category || '—'}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">New Products: {salesKPI.productPerformance.lifecycle_analysis.lifecycle_insights.new_products_count}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {['last_7_days','last_30_days','last_90_days'].map(range => {
                        const perf: any = (salesKPI.productPerformance as any).time_based_performance?.[range];
                        if(!perf) return null;
                        return (
                          <div key={range} className="border rounded p-3 bg-white">
                            <div className="text-sm font-semibold mb-2">{range.replace(/_/g,' ').toUpperCase()}</div>
                            <ul className="text-[10px] space-y-1">
                              <li>Unique Products: {perf.unique_products_sold}</li>
                              <li>Total Qty: {perf.total_quantity}</li>
                              <li>Revenue: ${perf.total_revenue}</li>
                              <li>Orders: {perf.total_orders}</li>
                              <li>Avg Products/Order: {perf.avg_products_per_order}</li>
                              <li>Avg Qty/Order: {perf.avg_quantity_per_order}</li>
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-xs text-gray-500 mt-4">Last calculated: {new Date(salesKPI.productPerformance.calculated_at).toLocaleString()}</div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Customer KPI Card */}
        <Card>
          <CardHeader>
            <CardTitle>Customer KPI's</CardTitle>
            <CardDescription>Key performance indicators for customers</CardDescription>
          </CardHeader>
          <CardContent>
            {customerKPI && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
                  <KPIBox label="Primary Acquisition Rate" value={`${customerKPI.acquisitionSummary?.primary_rate?.toFixed(2) ?? '0.00'}%`} />
                  <KPIBox label="New Customers" value={customerKPI.newCustomers ?? 0} />
                  <KPIBox label="Total Customers" value={customerKPI.totalCustomers ?? 0} />
                  <KPIBox label="Monthly Growth" value={`${customerKPI.acquisitionTrending?.monthly_growth?.toFixed(2) ?? '0.00'}%`} />
                  <KPIBox label="Quarterly Growth" value={`${customerKPI.acquisitionTrending?.quarterly_growth?.toFixed(2) ?? '0.00'}%`} />
                </div>

                {customerKPI.acquisitionPeriods && (
                  <div className="mb-6">
                    <div className="text-lg font-semibold mb-2">Acquisition Rate by Period</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={Object.entries(customerKPI.acquisitionPeriods).map(([key, val]) => ({
                          name: key.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase()),
                          rate: val.rate,
                          newCustomers: val.new_customers_count,
                          totalCustomers: val.total_customers_count,
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: any, name: string) => {
                          if(name === 'rate') return [`${value}%`, 'Rate'];
                          return [value, name === 'newCustomers' ? 'New' : 'Total'];
                        }} />
                        <Bar dataKey="rate" fill="#6366f1" name="rate" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="text-xs text-gray-500 mt-2">Last calculated: {customerKPI.acquisitionCalculatedAt ? new Date(customerKPI.acquisitionCalculatedAt).toLocaleString() : '-'}</div>
                  </div>
                )}

                {customerKPI.retentionPeriods && (
                  <div className="mb-6">
                    <div className="text-lg font-semibold mb-2">Customer Retention Rate</div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-4">
                      <KPIBox label="Best Period" value={customerKPI.retentionTrends?.best_period?.replace(/_/g,' ')?.toUpperCase() ?? '—'} />
                      <KPIBox label="Benchmark Rate" value={`${customerKPI.retentionBenchmark?.rate?.toFixed(2) ?? '0.00'}%`} />
                      <KPIBox label="Improving" value={customerKPI.retentionTrends?.improving ? 'Yes' : 'No'} />
                      <KPIBox label="Health" value={customerKPI.retentionInsights?.health_status?.replace(/_/g,' ') ?? '—'} />
                      <KPIBox label="Primary Driver" value={customerKPI.retentionInsights?.primary_driver?.replace(/_/g,' ') ?? '—'} />
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={Object.entries(customerKPI.retentionPeriods).map(([key, val]) => ({
                          name: key.replace(/_/g,' ').toUpperCase(),
                          rate: val.rate,
                          retained: val.retained_customers,
                          start: val.customers_at_start,
                          viaOrders: val.breakdown.via_orders,
                          viaSubs: val.breakdown.via_subscriptions,
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: any, name: string) => {
                          if(name === 'rate') return [`${value}%`, 'Rate'];
                          if(name === 'retained') return [value, 'Retained'];
                          if(name === 'start') return [value, 'Start'];
                          if(name === 'viaOrders') return [value, 'Via Orders'];
                          if(name === 'viaSubs') return [value, 'Via Subs'];
                          return [value, name];
                        }} />
                        <Bar dataKey="rate" fill="#10b981" name="rate" />
                      </BarChart>
                    </ResponsiveContainer>
                    {customerKPI.retentionInsights?.recommendation && (
                      <div className="mt-2 text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
                        <span className="font-semibold">Recommendation: </span>
                        {customerKPI.retentionInsights.recommendation}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">Last calculated: {customerKPI.retentionCalculatedAt ? new Date(customerKPI.retentionCalculatedAt).toLocaleString() : '-'}</div>
                  </div>
                )}

                {customerKPI.churnPeriods && (
                  <div className="mb-6">
                    <div className="text-lg font-semibold mb-2">Churn Rate</div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-4">
                      <KPIBox label="Customer Churn" value={`${customerKPI.churnPrimary?.customer_churn_rate?.toFixed(2) ?? '0.00'}%`} />
                      <KPIBox label="Subscription Churn" value={`${customerKPI.churnPrimary?.subscription_churn_rate?.toFixed(2) ?? '0.00'}%`} />
                      <KPIBox label="Inactive Customers" value={customerKPI.churnPrimary?.inactive_customers ?? 0} />
                      <KPIBox label="Cancelled Subs" value={customerKPI.churnPrimary?.cancelled_subscriptions ?? 0} />
                      <KPIBox label="Churn Velocity" value={customerKPI.churnPrimary?.churn_velocity ?? 0} />
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={Object.entries(customerKPI.churnPeriods).map(([key, val]) => ({
                          name: key.replace(/_/g,' ').toUpperCase(),
                          customerChurn: val.customer_churn_rate,
                          subscriptionChurn: val.subscription_churn_rate,
                          inactive: val.inactive_customers,
                          cancelledSubs: val.cancelled_subscriptions,
                          velocity: val.churn_velocity,
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: any, name: string) => {
                          const labelMap: Record<string,string> = {
                            customerChurn: 'Customer Churn %',
                            subscriptionChurn: 'Subscription Churn %',
                            inactive: 'Inactive Customers',
                            cancelledSubs: 'Cancelled Subscriptions',
                            velocity: 'Churn Velocity',
                          };
                          if(name === 'customerChurn' || name === 'subscriptionChurn') return [`${value}%`, labelMap[name]];
                          return [value, labelMap[name] || name];
                        }} />
                        <Bar dataKey="customerChurn" fill="#ef4444" name="customerChurn" />
                        <Bar dataKey="subscriptionChurn" fill="#f59e0b" name="subscriptionChurn" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="text-xs text-gray-500 mt-2">Last calculated: {customerKPI.churnCalculatedAt ? new Date(customerKPI.churnCalculatedAt).toLocaleString() : '-'}</div>
                    {(customerKPI.churnAlerts || customerKPI.churnInsights) && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {customerKPI.churnAlerts && (
                          <div className="border rounded p-2 bg-white">
                            <div className="font-semibold mb-1">Alerts</div>
                            <ul className="space-y-0.5">
                              {Object.entries(customerKPI.churnAlerts).map(([k,v]) => (
                                <li key={k} className={v ? 'text-red-600' : 'text-gray-500'}>
                                  {k.replace(/_/g,' ')}: {v ? 'Yes' : 'No'}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {customerKPI.churnInsights && (
                          <div className="border rounded p-2 bg-white">
                            <div className="font-semibold mb-1">Insights</div>
                            <ul className="space-y-0.5">
                              <li>Primary Concern: {customerKPI.churnInsights.primary_concern.replace(/_/g,' ')}</li>
                              <li>Urgency: {customerKPI.churnInsights.urgency_level}</li>
                              <li>Trend: {customerKPI.churnInsights.trend_analysis}</li>
                              <li>Action: {customerKPI.churnInsights.recommended_action}</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {customerKPI.repeatPurchaseOverall && (
                  <div className="mb-6">
                    <div className="text-lg font-semibold mb-2">Repeat Purchase Rate</div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-4">
                      <KPIBox label="Repeat Rate" value={`${customerKPI.repeatPurchaseOverall.rate?.toFixed(2) ?? '0.00'}%`} />
                      <KPIBox label="Repeat Customers" value={customerKPI.repeatPurchaseOverall.repeat_customers} />
                      <KPIBox label="Total Customers" value={customerKPI.repeatPurchaseOverall.total_customers} />
                      <KPIBox label="Subscription Adoption" value={`${customerKPI.repeatPurchaseOverall.subscription_adoption_rate?.toFixed(2) ?? '0.00'}%`} />
                      <KPIBox label="Loyalty Score" value={customerKPI.repeatPurchaseInsights?.loyalty_score?.toFixed(2) ?? '0.00'} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      {customerKPI.repeatPurchaseSegments && (
                        <div className="border rounded p-3 bg-white">
                          <div className="text-sm font-semibold mb-2">Customer Segments</div>
                          <ul className="text-[11px] space-y-1">
                            {Object.entries(customerKPI.repeatPurchaseSegments).map(([segment,val]) => (
                              <li key={segment} className="flex justify-between">
                                <span>{segment.replace(/_/g,' ')}</span>
                                <span className="font-semibold">{val}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {customerKPI.repeatPurchaseTimeBased && (
                        <div>
                          <div className="text-sm font-semibold mb-2">Time-Based Rates</div>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                              data={Object.entries(customerKPI.repeatPurchaseTimeBased).map(([k,v]) => ({
                                name: k.replace(/_/g,' ').toUpperCase(),
                                rate: v.rate,
                                newCustomers: v.new_customers,
                                repeatCustomers: v.repeat_customers,
                              }))}
                              margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip formatter={(value: any, name: string) => {
                                const labelMap: Record<string,string> = { rate: 'Rate %', newCustomers: 'New Customers', repeatCustomers: 'Repeat Customers' };
                                if(name === 'rate') return [`${value}%`, labelMap[name]];
                                return [value, labelMap[name] || name];
                              }} />
                              <Bar dataKey="rate" fill="#3b82f6" name="rate" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                    {customerKPI.repeatPurchaseInsights && (
                      <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                        Primary Segment: <span className="font-semibold">{customerKPI.repeatPurchaseInsights.primary_segment.replace(/_/g,' ')}</span> | Engagement: {customerKPI.repeatPurchaseInsights.engagement_level}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">Last calculated: {customerKPI.repeatPurchaseCalculatedAt ? new Date(customerKPI.repeatPurchaseCalculatedAt).toLocaleString() : '-'}</div>
                  </div>
                )}

                {customerKPI.cancellationOverall && (
                  <div className="mb-6">
                    <div className="text-lg font-semibold mb-2">Subscription Cancellation Reasons</div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-4">
                      <KPIBox label="Overall Cancel Rate" value={`${customerKPI.cancellationOverall.overall_cancellation_rate?.toFixed(2) ?? '0.00'}%`} />
                      <KPIBox label="Total Cancelled" value={customerKPI.cancellationOverall.total_cancelled} />
                      <KPIBox label="Active Subs" value={customerKPI.cancellationOverall.active_subscriptions} />
                      <KPIBox label="Total Subs" value={customerKPI.cancellationOverall.total_subscriptions} />
                      <KPIBox label="Avg Duration (d)" value={customerKPI.cancellationOverall.average_duration_before_cancellation_days} />
                    </div>
                    {customerKPI.cancellationPeriods && (
                      <div className="mb-4">
                        <div className="text-sm font-semibold mb-2">Cancellation Rate by Period</div>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={Object.entries(customerKPI.cancellationPeriods).map(([k,v]) => ({
                              name: k.replace(/_/g,' ').toUpperCase(),
                              rate: v.cancellation_rate,
                              cancellations: v.total_cancellations,
                              activeSubs: v.total_active_subscriptions,
                            }))}
                            margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value: any, name: string) => {
                              const labelMap: Record<string,string> = { rate: 'Cancellation Rate %', cancellations: 'Cancellations', activeSubs: 'Active Subs' };
                              if(name === 'rate') return [`${value}%`, labelMap[name]];
                              return [value, labelMap[name] || name];
                            }} />
                            <Bar dataKey="rate" fill="#dc2626" name="rate" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {customerKPI.cancellationOverall.top_cancellation_reasons && (
                      <div className="mb-4">
                        <div className="text-sm font-semibold mb-2">Top Cancellation Reasons</div>
                        <div className="border rounded p-3 bg-white max-h-40 overflow-auto">
                          <ul className="text-[11px] space-y-1">
                            {customerKPI.cancellationOverall.top_cancellation_reasons.map((r,i) => (
                              <li key={i} className="flex justify-between">
                                <span>{r.reason}</span>
                                <span>{r.count} ({r.percentage}%)</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    {customerKPI.cancellationInsights && customerKPI.cancellationInsights.length > 0 && (
                      <div className="mb-2 text-xs bg-red-50 border border-red-200 rounded p-2 space-y-1">
                        {customerKPI.cancellationInsights.map((ins,i) => (
                          <div key={i}>• {ins}</div>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">Last calculated: {customerKPI.cancellationCalculatedAt ? new Date(customerKPI.cancellationCalculatedAt).toLocaleString() : '-'}</div>
                  </div>
                )}

                {typeof customerKPI.customerRevenueGrowthRate === 'number' && (
                  <div className="mb-6">
                    <div className="text-lg font-semibold mb-2">Customer Revenue Growth</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                      <KPIBox label="Growth Rate" value={`${customerKPI.customerRevenueGrowthRate}%`} />
                      <KPIBox label="Current Month" value={`$${customerKPI.customerCurrentMonthRevenue?.toLocaleString() ?? '0'}`} />
                      <KPIBox label="Previous Month" value={`$${customerKPI.customerPreviousMonthRevenue?.toLocaleString() ?? '0'}`} />
                      <KPIBox label="Difference" value={`$${customerKPI.customerRevenueDifference?.toLocaleString() ?? '0'}`} />
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart
                        data={[
                          { name: customerKPI.customerRevenueGrowthPeriod?.previous_month || 'Prev', revenue: customerKPI.customerPreviousMonthRevenue },
                          { name: customerKPI.customerRevenueGrowthPeriod?.current_month || 'Current', revenue: customerKPI.customerCurrentMonthRevenue },
                        ]}
                        margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: any) => [`$${value}`, 'Revenue']} />
                        <Bar dataKey="revenue" fill="#0ea5e9" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="text-xs text-gray-500 mt-2">
                      Period: {customerKPI.customerRevenueGrowthPeriod?.previous_month} → {customerKPI.customerRevenueGrowthPeriod?.current_month}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Simple KPI box component
function KPIBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg shadow p-6 flex flex-col items-center justify-center">
      <div className="text-lg font-semibold text-gray-600 mb-2">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}