import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@shared/components/ProtectedRoute";
import AdminLoginPage from "@shared/pages/AdminLoginPage";
import AdminLayout from "@shared/components/admin/layout/AdminLayout";
import AdminDashboardPage from "@shared/pages/admin/AdminDashboardPage";
import AdminUsersPage from "@shared/pages/admin/AdminUsersPage";
import AdminUserDetailPage from "@shared/pages/admin/AdminUserDetailPage";
import AdminMembersPage from "@shared/pages/admin/AdminMembersPage";
import AdminMemberDetailPage from "@shared/pages/admin/AdminMemberDetailPage";
import AdminProjectsPage from "@shared/pages/admin/AdminProjectsPage";
import AdminContentPage from "@shared/pages/admin/AdminContentPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLoginPage loginPath="/login" homePath="/" />} />
      <Route element={<ProtectedRoute roles={["SUPER_ADMIN"]} loginPath="/login" />}>
        <Route element={<AdminLayout adminBase="/" />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailPage />} />
          <Route path="members" element={<AdminMembersPage />} />
          <Route path="projects" element={<AdminProjectsPage />} />
          <Route path="content" element={<AdminContentPage />} />
          <Route path="members/:id" element={<AdminMemberDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
