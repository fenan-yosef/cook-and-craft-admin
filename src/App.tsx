import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProductsPage from "./ProductsPage";
import UsersPage from "./UsersPage";
import ReportsPage from "./ReportsPage";
import SubscriptionsPage from "./SubscriptionsPage";
import LoginPage from "./LoginPage";
import DashboardLayout from "./DashboardLayout";
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
      <Route element={<DashboardLayout />}>
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/preferences" element={<PreferencesPage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/delivery-zones" element={<DeliveryZonesPage />} />
        <Route path="/coupons" element={<CouponsPage />} />
        <Route path="/" element={<Navigate to="/products" replace />} />
      </Route>
    </Routes>
  </Router>
);

export default App;
