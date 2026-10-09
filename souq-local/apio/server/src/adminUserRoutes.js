import {
  changeUserRoleByAdmin,
  deleteUserByAdmin,
  getAdminDashboardStats,
  getUserDeletionPreview,
  getUserDetailForAdmin,
  listAdminAuditLog,
  listUsersForAdmin,
  updateUserByAdmin,
} from "./adminUsers.js";
import { findUserById } from "./auth.js";
import { handleAuthError } from "./middleware.js";
import { validateUuid } from "./validateIds.js";

function adminActor(db, req) {
  return req.userRow || findUserById(db, req.user?.id);
}

export function registerAdminUserRoutes(app, db, { requireAuth, requireSuperAdmin, adminMutationLimiter }) {
  app.get("/api/admin/stats", requireAuth, requireSuperAdmin, (_req, res) => {
    res.json(getAdminDashboardStats(db));
  });

  app.get("/api/admin/audit", requireAuth, requireSuperAdmin, (req, res) => {
    const limit = String(req.query.limit || "50").slice(0, 4);
    res.json({ entries: listAdminAuditLog(db, { limit: Number(limit) || 50 }) });
  });

  app.get("/api/admin/users", requireAuth, requireSuperAdmin, (req, res) => {
    const q = String(req.query.q || "").slice(0, 100);
    const role = String(req.query.role || "").slice(0, 32);
    const status = String(req.query.status || "").slice(0, 20);
    const sort = String(req.query.sort || "created_desc").slice(0, 32);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 25;
    res.json(listUsersForAdmin(db, { q, role, status, sort, page, limit }));
  });

  app.get("/api/admin/users/:id", requireAuth, requireSuperAdmin, (req, res) => {
    const idCheck = validateUuid(req.params.id);
    if (!idCheck.ok) return res.status(404).json({ error: "Not found" });
    const detail = getUserDetailForAdmin(db, idCheck.value);
    if (!detail) return res.status(404).json({ error: "Not found" });
    res.json(detail);
  });

  app.get("/api/admin/users/:id/deletion-preview", requireAuth, requireSuperAdmin, (req, res) => {
    const idCheck = validateUuid(req.params.id);
    if (!idCheck.ok) return res.status(404).json({ error: "Not found" });
    const preview = getUserDeletionPreview(db, idCheck.value);
    if (!preview) return res.status(404).json({ error: "Not found" });
    res.json(preview);
  });

  app.patch("/api/admin/users/:id", requireAuth, requireSuperAdmin, adminMutationLimiter, (req, res) => {
    try {
      const idCheck = validateUuid(req.params.id);
      if (!idCheck.ok) return res.status(404).json({ error: "Not found" });
      const detail = updateUserByAdmin(db, adminActor(db, req), idCheck.value, req.body || {});
      res.json(detail);
    } catch (err) {
      handleAuthError(err, res);
    }
  });

  app.post("/api/admin/users/:id/role", requireAuth, requireSuperAdmin, adminMutationLimiter, (req, res) => {
    try {
      const idCheck = validateUuid(req.params.id);
      if (!idCheck.ok) return res.status(404).json({ error: "Not found" });
      const { role, reason, ownerProfileId } = req.body || {};
      if (!role) return res.status(400).json({ error: "role is required" });
      const detail = changeUserRoleByAdmin(db, adminActor(db, req), idCheck.value, String(role), reason, {
        ownerProfileId,
      });
      res.json(detail);
    } catch (err) {
      handleAuthError(err, res);
    }
  });

  app.post("/api/admin/users/:id/delete", requireAuth, requireSuperAdmin, adminMutationLimiter, (req, res) => {
    try {
      const idCheck = validateUuid(req.params.id);
      if (!idCheck.ok) return res.status(404).json({ error: "Not found" });
      const { confirmEmail, mode } = req.body || {};
      const result = deleteUserByAdmin(db, adminActor(db, req), idCheck.value, {
        confirmEmail,
        mode: mode === "anonymize" ? "anonymize" : "hard",
      });
      res.json(result);
    } catch (err) {
      handleAuthError(err, res);
    }
  });
}
