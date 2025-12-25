import AddonsPage from "@/pages/dashboard/addons/AddonsPage"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/contexts/auth-context"
import WalletsPage from "@/pages/dashboard/wallets/WalletsPage"
import ShopRedemptionPage from "@/pages/dashboard/wallets/ShopRedemptionPage"
import { Toaster } from "@/components/ui/toaster"
import RecipesPage from "@/pages/dashboard/recipes/RecipesPage"
import ReportsPage from "@/pages/dashboard/reports/ReportsPage"
import SubscriptionsPage from "@/pages/dashboard/subscriptions/SubscriptionsPage"
import UsersPage from "@/pages/dashboard/users/UsersPage"
import LoginPage from "./pages/LoginPage"
import DashboardLayout from "./layouts/DashboardLayout"
import DashboardHomePage from "./pages/dashboard/DashboardHomePage"
import OrdersPage from "./pages/dashboard/orders/OrdersPage"
import ProductsPage from "./pages/dashboard/products/ProductsPage"
import CouponsPage from "./pages/dashboard/coupons/CouponsPage"
import PostsPage from "./pages/dashboard/posts/PostsPage"
import PollsPage from "./pages/dashboard/posts/PollsPage"
import DeliveryZonesPage from "./pages/dashboard/delivery-zones/DeliveryZonesPage"
import MetricsPage from "./pages/dashboard/metrics/MetricsPage"
import MealsPage from "./pages/dashboard/meals/MealsPage"
import PreferencesPage from "./pages/dashboard/questions/QuestionsPage"
import SubscriptionIntervalsPage from "./pages/dashboard/subscription_intervals/SubscriptionIntervalsPage"
import SubscriptionTypesPage from "./pages/dashboard/subscription_types/SubscriptionTypesPage"
import SubscriptionAndMealSelections from "./pages/dashboard/subscription_and_meal_selection/SubscriptionAndMealSelections"
import QuestionsPage from "./pages/dashboard/questions/QuestionsPage"
import AnswersPage from "./pages/dashboard/answers/AnswersPage"
import UserAnswersPage from "./pages/dashboard/users_answers/UserAnswersPage"
import ContactUsPage from "./pages/dashboard/contact-us/ContactUsPage"
import ConversionRulesPage from "./pages/dashboard/conversion-rules/ConversionRulesPage"
import RewardsPage from "./pages/dashboard/rewards/RewardsPage"
import CategoriesPage from "./pages/dashboard/categories/CategoriesPage"
import NotificationsPage from "./pages/dashboard/notifications/NotificationsPage"
import CommunityNotifications from "@/pages/dashboard/community-notifications/CommunityNotifications"

function IndexRedirect() {
  const { user, token, isLoading } = useAuth()

  if (isLoading) return null

  if (user || token) {
    return <Navigate to="/dashboard" replace />
  }

  return <Navigate to="/login" replace />
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<IndexRedirect />} />
          <Route
            path="/login"
            element={
              <AuthGuard requireAuth={false}>
                <LoginPage />
              </AuthGuard>
            }
          />
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <DashboardLayout />
              </AuthGuard>
            }
          >
            <Route index element={<DashboardHomePage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="delivery-zones" element={<DeliveryZonesPage />} />
            <Route path="posts" element={<PostsPage />} />
            <Route path="posts/polls" element={<PollsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="metrics" element={<MetricsPage />} />
            <Route path="recipes" element={<RecipesPage />} />
            <Route path="meals" element={<MealsPage />} />
            <Route path="answers" element={<AnswersPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="questions" element={<QuestionsPage />} />
            <Route path="preferences" element={<PreferencesPage />} />
            <Route path="user-answers" element={<UserAnswersPage />} />
            <Route path="contact-us-messages" element={<ContactUsPage />} />
            <Route path="addons" element={<AddonsPage />} />
            <Route path="wallets" element={<WalletsPage />} />
            <Route path="shop-redemptions" element={<ShopRedemptionPage />} />
            <Route path="subscription-intervals" element={<SubscriptionIntervalsPage />} />
            <Route path="subscription-types" element={<SubscriptionTypesPage />} />
            <Route path="subscription-meal-selections" element={<SubscriptionAndMealSelections />} />
            <Route path="conversion-rules" element={<ConversionRulesPage />} />
            <Route path="rewards" element={<RewardsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="community-notifications" element={<CommunityNotifications />} />
          </Route>
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  )
}

export default App

