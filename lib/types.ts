// Shop Types
export interface User {
  id: number
  name: string
  email: string
  status: "active" | "blocked"
  created_at: string
  updated_at: string
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  stock: number
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}

export interface Order {
  id: number
  user_id: number
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  total: number
  created_at: string
  updated_at: string
}

export interface Coupon {
  id: number
  code: string
  type: "percentage" | "fixed"
  value: number
  min_amount?: number
  max_uses?: number
  used_count: number
  expires_at?: string
  created_at: string
}

// Community Types
export interface Post {
  id: number
  user_id: number
  title: string
  content: string
  status: "published" | "hidden" | "deleted"
  is_pinned: boolean
  is_highlighted: boolean
  likes_count: number
  created_at: string
  updated_at: string
}

export interface PostReport {
  id: number
  post_id: number
  user_id: number
  reason: string
  status: "pending" | "resolved" | "dismissed"
  created_at: string
}

// Subscription Types
export interface Recipe {
  id: number
  name: string
  description: string
  ingredients: string[]
  instructions: string[]
  prep_time: number
  cook_time: number
  servings: number
  created_at: string
}

export interface Meal {
  id: number
  name: string
  description: string
  recipes: Recipe[]
  calories: number
  created_at: string
}

export interface Subscription {
  id: number
  user_id: number
  plan_name: string
  status: "active" | "paused" | "cancelled"
  start_date: string
  end_date?: string
  created_at: string
}
