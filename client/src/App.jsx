import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./admin/AdminLayout.jsx";
import { AdminAnalyticsPage } from "./admin/pages/AdminAnalyticsPage.jsx";
import { AdminImagesPage } from "./admin/pages/AdminImagesPage.jsx";
import { AdminOverviewPage } from "./admin/pages/AdminOverviewPage.jsx";
import { AdminSubscriptionsPage } from "./admin/pages/AdminSubscriptionsPage.jsx";
import { AdminUsersPage } from "./admin/pages/AdminUsersPage.jsx";
import { AppLayout } from "./components/AppLayout.jsx";
import { AuthPage } from "./pages/AuthPage.jsx";
import { BillingPage } from "./pages/BillingPage.jsx";
import { ChatPage } from "./pages/ChatPage.jsx";
import { GalleryPage } from "./pages/GalleryPage.jsx";
import { ImagesPage } from "./pages/ImagesPage.jsx";
import { InfoPage } from "./pages/InfoPage.jsx";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";
import { VerifyEmailPage } from "./pages/VerifyEmailPage.jsx";
import { useAuth } from "./state/AuthContext.jsx";

function Protected({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-paper text-ink dark:bg-ink dark:text-paper">Loading Theo</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function AdminOnly({ children }) {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function UserOnly({ children }) {
  const { user } = useAuth();

  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/about" element={<InfoPage page="about" />} />
      <Route path="/security" element={<InfoPage page="security" />} />
      <Route path="/terms" element={<InfoPage page="terms" />} />
      <Route path="/privacy" element={<InfoPage page="privacy" />} />
      <Route path="/contact" element={<InfoPage page="contact" />} />
      <Route path="/docs" element={<InfoPage page="docs" />} />
      <Route path="/status" element={<InfoPage page="status" />} />
      <Route path="/examples" element={<InfoPage page="examples" />} />
      <Route path="/changelog" element={<InfoPage page="changelog" />} />
      <Route path="/support" element={<InfoPage page="support" />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/admin"
        element={
          <Protected>
            <AdminOnly>
              <AdminLayout />
            </AdminOnly>
          </Protected>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="images" element={<AdminImagesPage />} />
        <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
      </Route>
      <Route
        path="/"
        element={
          <Protected>
            <UserOnly>
              <AppLayout />
            </UserOnly>
          </Protected>
        }
      >
        <Route index element={<ChatPage />} />
        <Route path="images" element={<ImagesPage />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
