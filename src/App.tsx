import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/contexts/auth-context"
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
import DeliveryZonesPage from "./pages/dashboard/delivery-zones/DeliveryZonesPage"
import MetricsPage from "./pages/dashboard/metrics/MetricsPage"
import MealsPage from "./pages/dashboard/meals/MealsPage"
import PreferencesPage from "./pages/dashboard/preferences/PreferencesPage"


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHomePage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="delivery-zones" element={<DeliveryZonesPage />} />
            <Route path="posts" element={<PostsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="metrics" element={<MetricsPage />} />
            <Route path="recipes" element={<RecipesPage />} />
            <Route path="meals" element={<MealsPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="preferences" element={<PreferencesPage />} />
          </Route>
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  )
}

export default App

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import DashboardPage from "./DashboardPage";
import ProductsPage from "./ProductsPage";
import UsersPage from "./UsersPage";
import ReportsPage from "./ReportsPage";
import SubscriptionsPage from "./SubscriptionsPage";
import LoginPage from "./LoginPage";
import CouponsPage from "./CouponsPage";
import DeliveryZonesPage from "./DeliveryZonesPage";
import MealsPage from "./MealsPage";
import MetricsPage from "./MetricsPage";
import OrdersPage from "./OrdersPage";
import PostsPage from "./PostsPage";
import PreferencesPage from "./PreferencesPage";
import RecipesPage from "./RecipesPage";

const App: React.FC = () => (
  <Router>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="delivery-zones" element={<DeliveryZonesPage />} />
        <Route path="meals" element={<MealsPage />} />
        <Route path="metrics" element={<MetricsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="posts" element={<PostsPage />} />
        <Route path="preferences" element={<PreferencesPage />} />
        <Route path="recipes" element={<RecipesPage />} />
      </Route>
    </Routes>
  </Router>
);

export default App;
