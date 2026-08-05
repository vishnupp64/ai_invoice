import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./state/auth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import UploadInvoicePage from "./pages/UploadInvoicePage";
import InvoiceDetailsPage from "./pages/InvoiceDetailsPage";
import EditInvoicePage from "./pages/EditInvoicePage";
import ProfilePage from "./pages/ProfilePage";
import AppShell from "./components/layout/AppShell";

function Protected({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={token ? <Navigate to="/" replace /> : <RegisterPage />} />

      <Route
        path="/"
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="upload" element={<UploadInvoicePage />} />
        <Route path="invoices/:id" element={<InvoiceDetailsPage />} />
        <Route path="invoices/:id/edit" element={<EditInvoicePage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

