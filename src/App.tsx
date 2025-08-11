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
