import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

// New interface for the actual API data structure
interface RawPostMetric {
  id: number;
  post_id: number;
  created_at: string;
  views_cnt: number;
  shares_cnt: number;
  likes_cnt: number;
  favourites_cnt: number;
  reports_cnt: number;
}

// Updated interface for the chart data
interface ChartData {
  name: string;
  views: number;
  likes: number;
  shares: number;
  favourites: number;
}

const API_BASE_URL = "https://cook-craft.dhcb.io/api";

export default function MetricsPage() {
  const { token } = useAuth();
  const [metricsData, setMetricsData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMetrics();
  }, [token]);

  const fetchMetrics = async () => {
    if (!token) {
      setLoading(false);
      toast({
        title: "Authentication Error",
        description: "Missing authentication token.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      // Removed post_id query parameter to fetch all post metrics
      const response = await fetch(`${API_BASE_URL}/post_metrics`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch metrics");
      }

      const rawResponse = await response.json();
      const rawData: RawPostMetric[] = rawResponse.data || [];

      // Transform the raw data for the BarChart
      const transformedData: ChartData[] = rawData.map((item) => ({
        name: `Post #${item.post_id}`, // Using post ID as the name
        views: item.views_cnt,
        likes: item.likes_cnt,
        shares: item.shares_cnt,
        favourites: item.favourites_cnt,
      }));

      setMetricsData(transformedData);
    } catch (error) {
      console.error("Fetch metrics error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch metrics.",
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
              <CardTitle>Post Engagement</CardTitle>
              <CardDescription>Engagement metrics for all posts</CardDescription>
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
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Metrics</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Post Engagement</CardTitle>
            <CardDescription>Engagement metrics for all posts</CardDescription>
          </CardHeader>
          <CardContent>
            {metricsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metricsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="views" fill="#4d7c0f" name="Views" />
                  <Bar dataKey="likes" fill="#8884d8" name="Likes" />
                  <Bar dataKey="shares" fill="#82ca9d" name="Shares" />
                  <Bar dataKey="favourites" fill="#ffc658" name="Favourites" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">No metrics data available.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}