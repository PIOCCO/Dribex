import { randomUUID } from "node:crypto";
import { findUserById, hashPassword, ROLES, sanitizeUser } from "./auth.js";
import { EMAIL_RE } from "./validateContent.js";
import { logAdminAction } from "./adminAudit.js";
import { normalizeAdminEmail, rejectEmailTaken } from "./adminMembers.js";
import { createMemberProfile, getMemberProfileById } from "./memberProfiles.js";
import { validateUuid } from "./validateIds.js";

const VALID_ROLES = new Set(Object.values(ROLES));
const VALID_STATUS = new Set(["ACTIVE", "DISABLED"]);
const SORTS = new Set(["created_desc", "created_asc", "email_asc", "name_asc"]);

export function countActiveSuperAdmins(db) {
  return (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM users WHERE role = ? AND status = 'ACTIVE'`,
      )
      .get(ROLES.SUPER_ADMIN)?.c || 0
  );
}

function assertNotLastSuperAdmin(db, userRow, { nextRole, nextStatus } = {}) {
  if (userRow.role !== ROLES.SUPER_ADMIN || userRow.status !== "ACTIVE") return;
  const active = countActiveSuperAdmins(db);
  if (active > 1) return;
  if (nextRole && nextRole !== ROLES.SUPER_ADMIN) {
    const err = new Error("Cannot change role of the last active super administrator");
    err.status = 403;
    err.code = "LAST_SUPER_ADMIN";
    throw err;
  }
  if (nextStatus === "DISABLED") {
    const err = new Error("Cannot suspend the last active super administrator");
    err.status = 403;
    err.code = "LAST_SUPER_ADMIN";
    throw err;
  }
}

function userStats(db, userRow) {
  const stats = {
    conversationsAsClient: 0,
    messagesSent: 0,
    publishedProjects: 0,
    totalProjects: 0,
  };
  stats.conversationsAsClient =
    db.prepare(`SELECT COUNT(*) AS c FROM conversations WHERE client_id = ?`).get(userRow.id)?.c || 0;
  stats.messagesSent =
    db.prepare(`SELECT COUNT(*) AS c FROM messages WHERE sender_id = ?`).get(userRow.id)?.c || 0;
  if (userRow.owner_profile_id) {
    stats.totalProjects =
      db
        .prepare(`SELECT COUNT(*) AS c FROM owner_project_drafts WHERE owner_profile_id = ?`)
        .get(userRow.owner_profile_id)?.c || 0;
    stats.publishedProjects =
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM owner_project_drafts WHERE owner_profile_id = ? AND status = 'published'`,
        )
        .get(userRow.owner_profile_id)?.c || 0;
  }
  return stats;
}

function rowToAdminUser(row, db) {
  if (!row) return null;
  const base = sanitizeUser(row);
  return {
    ...base,
    ownerProfileId: row.owner_profile_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    emailVerified: Boolean(row.email_verified_at),
    stats: userStats(db, row),
  };
}

export function listUsersForAdmin(
  db,
  { q = "", role = "", status = "", sort = "created_desc", page = 1, limit = 25 } = {},
) {
  const lim = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const pg = Math.max(Number(page) || 1, 1);
  const offset = (pg - 1) * lim;

  let where = "1=1";
  const params = [];
  if (role && VALID_ROLES.has(role)) {
    where += " AND u.role = ?";
    params.push(role);
  }
  if (status && VALID_STATUS.has(status)) {
    where += " AND u.status = ?";
    params.push(status);
  }
  if (q) {
    const qq = `%${String(q).trim().slice(0, 100).toLowerCase()}%`;
    where += " AND (LOWER(u.email) LIKE ? OR LOWER(u.name) LIKE ? OR u.id LIKE ?)";
    params.push(qq, qq, qq);
  }

  const order =
    sort === "created_asc"
      ? "u.created_at ASC"
      : sort === "email_asc"
        ? "u.email COLLATE NOCASE ASC"
        : sort === "name_asc"
          ? "u.name COLLATE NOCASE ASC"
          : "u.created_at DESC";

  const total =
    db.prepare(`SELECT COUNT(*) AS c FROM users u WHERE ${where}`).get(...params)?.c || 0;

  const rows = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.phone, u.role, u.status, u.owner_profile_id,
              u.auth_provider, u.email_verified_at, u.created_at, u.updated_at
       FROM users u WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
    )
    .all(...params, lim, offset);

  return {
    users: rows.map((r) => rowToAdminUser(r, db)),
    total,
    page: pg,
    limit: lim,
    pages: Math.max(1, Math.ceil(total / lim)),
  };
}

export function getUserDetailForAdmin(db, userId) {
  const idCheck = validateUuid(userId);
  if (!idCheck.ok) return null;
  const row = findUserById(db, idCheck.value);
  if (!row) return null;
  const profile =
    row.owner_profile_id ? getMemberProfileById(db, row.owner_profile_id) : null;
  const recentActivity = row.owner_profile_id
    ? db
        .prepare(
          `SELECT id, action, detail, created_at AS createdAt FROM owner_activity_log
           WHERE owner_profile_id = ? ORDER BY created_at DESC LIMIT 20`,
        )
        .all(row.owner_profile_id)
    : [];
  return {
    user: rowToAdminUser(row, db),
    profile,
    recentActivity,
  };
}

export function updateUserByAdmin(db, adminUser, userId, body) {
  const idCheck = validateUuid(userId);
  if (!idCheck.ok) {
    const err = new Error("Not found");
    err.status = 404;
    throw err;
  }
  const row = findUserById(db, idCheck.value);
  if (!row) {
    const err = new Error("Not found");
    err.status = 404;
    throw err;
  }

  const { name, phone, status, password, email, suspendReason } = body || {};
  const nextStatus = status !== undefined ? String(status) : undefined;
  if (nextStatus !== undefined && !VALID_STATUS.has(nextStatus)) {
    const err = new Error("Invalid status");
    err.status = 400;
    throw err;
  }

  if (adminUser.id === row.id && nextStatus === "DISABLED") {
    const err = new Error("Cannot suspend your own account");
    err.status = 400;
    throw err;
  }

  assertNotLastSuperAdmin(db, row, { nextStatus });

  const sets = [];
  const vals = [];
  const before = { name: row.name, phone: row.phone, status: row.status, email: row.email };

  if (name !== undefined) {
    const n = String(name).trim().slice(0, 200);
    if (!n) {
      const err = new Error("Name is required");
      err.status = 400;
      throw err;
    }
    sets.push("name = ?");
    vals.push(n);
  }
  if (phone !== undefined) {
    sets.push("phone = ?");
    vals.push(phone ? String(phone).slice(0, 32) : null);
  }
  if (email !== undefined) {
    const em = normalizeAdminEmail(email);
    if (!EMAIL_RE.test(em)) {
      const err = new Error("Invalid email");
      err.status = 400;
      throw err;
    }
    rejectEmailTaken(db, em, { excludeUserId: row.id });
    sets.push("email = ?");
    vals.push(em);
  }
  if (nextStatus !== undefined) {
    sets.push("status = ?");
    vals.push(nextStatus);
  }
  if (password !== undefined && String(password).length > 0) {
    if (String(password).length < 8) {
      const err = new Error("Password must be at least 8 characters");
      err.status = 400;
      throw err;
    }
    sets.push("password_hash = ?");
    vals.push(hashPassword(password));
  }

  if (!sets.length) return getUserDetailForAdmin(db, row.id);

  sets.push("updated_at = ?");
  vals.push(new Date().toISOString(), row.id);
  db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...vals);

  const updated = findUserById(db, row.id);
  const action =
    nextStatus === "DISABLED"
      ? "user_suspended"
      : nextStatus === "ACTIVE" && row.status === "DISABLED"
        ? "user_reactivated"
        : "user_updated";
  logAdminAction(db, {
    adminUserId: adminUser.id,
    action,
    targetType: "user",
    targetId: row.id,
    detail: JSON.stringify({
      before,
      after: { name: updated.name, phone: updated.phone, status: updated.status, email: updated.email },
      reason: suspendReason ? String(suspendReason).slice(0, 500) : undefined,
    }),
  });

  return getUserDetailForAdmin(db, row.id);
}

function ensureOwnerProfileForUser(db, row, { linkProfileId } = {}) {
  if (row.owner_profile_id) return row.owner_profile_id;
  const linked = linkProfileId ? String(linkProfileId).trim() : "";
  if (linked) {
    if (!getMemberProfileById(db, linked)) {
      const err = new Error("Member profile not found");
      err.status = 404;
      err.code = "OWNER_PROFILE_NOT_FOUND";
      throw err;
    }
    const taken = db
      .prepare(`SELECT id FROM users WHERE owner_profile_id = ? AND id != ? LIMIT 1`)
      .get(linked, row.id);
    if (taken) {
      const err = new Error("This member profile is already linked to another account");
      err.status = 409;
      err.code = "OWNER_PROFILE_TAKEN";
      throw err;
    }
    return linked;
  }
  const profile = createMemberProfile(db, {
    nameFr: row.name,
    nameAr: row.name,
    agencyFr: row.name,
    agencyAr: row.name,
    phone: row.phone,
    email: row.email,
    contactName: row.name,
    contactPhone: row.phone,
    contactEmail: row.email,
    verified: true,
  });
  return profile.id;
}

export function changeUserRoleByAdmin(db, adminUser, userId, newRole, reason, options = {}) {
  const idCheck = validateUuid(userId);
  if (!idCheck.ok) {
    const err = new Error("Not found");
    err.status = 404;
    throw err;
  }
  if (!VALID_ROLES.has(newRole)) {
    const err = new Error("Invalid role");
    err.status = 400;
    throw err;
  }
  const row = findUserById(db, idCheck.value);
  if (!row) {
    const err = new Error("Not found");
    err.status = 404;
    throw err;
  }
  if (adminUser.id === row.id && newRole !== ROLES.SUPER_ADMIN) {
    const err = new Error("Cannot change your own role");
    err.status = 400;
    throw err;
  }
  assertNotLastSuperAdmin(db, row, { nextRole: newRole });

  const oldRole = row.role;
  if (oldRole === newRole) return getUserDetailForAdmin(db, row.id);

  let ownerProfileId = row.owner_profile_id;
  if (newRole === ROLES.CLIENT) {
    ownerProfileId = null;
  }
  let createdProfileId = null;
  if (newRole === ROLES.REAL_ESTATE_OWNER && !ownerProfileId) {
    ownerProfileId = ensureOwnerProfileForUser(db, row, {
      linkProfileId: options.ownerProfileId,
    });
    if (!row.owner_profile_id) createdProfileId = ownerProfileId;
  }
  if (newRole === ROLES.SUPER_ADMIN && oldRole !== ROLES.SUPER_ADMIN) {
    const err = new Error("Promoting users to super administrator is not allowed from this endpoint");
    err.status = 403;
    throw err;
  }

  const now = new Date().toISOString();
  const verifyEmail =
    newRole === ROLES.REAL_ESTATE_OWNER && !row.email_verified_at ? now : null;
  if (verifyEmail) {
    db.prepare(
      `UPDATE users SET role = ?, owner_profile_id = ?, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?`,
    ).run(newRole, ownerProfileId, verifyEmail, now, row.id);
  } else {
    db.prepare(`UPDATE users SET role = ?, owner_profile_id = ?, updated_at = ? WHERE id = ?`).run(
      newRole,
      ownerProfileId,
      now,
      row.id,
    );
  }

  logAdminAction(db, {
    adminUserId: adminUser.id,
    action: "user_role_changed",
    targetType: "user",
    targetId: row.id,
    detail: JSON.stringify({
      from: oldRole,
      to: newRole,
      ownerProfileId,
      createdProfileId,
      reason: reason ? String(reason).slice(0, 500) : undefined,
    }),
  });

  return getUserDetailForAdmin(db, row.id);
}

export function getUserDeletionPreview(db, userId) {
  const idCheck = validateUuid(userId);
  if (!idCheck.ok) return null;
  const row = findUserById(db, idCheck.value);
  if (!row) return null;
  const stats = userStats(db, row);
  return {
    user: rowToAdminUser(row, db),
    willRemove: {
      authTokens: db.prepare(`SELECT COUNT(*) AS c FROM auth_tokens WHERE user_id = ?`).get(row.id)?.c || 0,
      messagesSent: stats.messagesSent,
      conversationsAsClient: stats.conversationsAsClient,
    },
    willRetain: {
      ownerProfile: Boolean(row.owner_profile_id),
      ownerProjects: stats.totalProjects,
      note:
        row.role === ROLES.REAL_ESTATE_OWNER
          ? "Member profile and listing drafts remain in the database; only the login account is removed unless you anonymize."
          : undefined,
    },
  };
}

export function deleteUserByAdmin(db, adminUser, userId, { confirmEmail, mode = "hard" } = {}) {
  const idCheck = validateUuid(userId);
  if (!idCheck.ok) {
    const err = new Error("Not found");
    err.status = 404;
    throw err;
  }
  const row = findUserById(db, idCheck.value);
  if (!row) {
    const err = new Error("Not found");
    err.status = 404;
    throw err;
  }
  if (adminUser.id === row.id) {
    const err = new Error("Cannot delete your own account");
    err.status = 400;
    throw err;
  }
  assertNotLastSuperAdmin(db, row, { nextStatus: "DISABLED" });

  const expected = normalizeAdminEmail(confirmEmail);
  if (!expected || expected !== normalizeAdminEmail(row.email)) {
    const err = new Error("Confirmation email does not match");
    err.status = 400;
    err.code = "CONFIRM_EMAIL";
    throw err;
  }

  const preview = getUserDeletionPreview(db, row.id);

  if (mode === "anonymize") {
    const anonEmail = `deleted-${randomUUID().slice(0, 8)}@anonymized.apio.local`;
    db.prepare(
      `UPDATE users SET email = ?, name = ?, phone = NULL, password_hash = NULL,
       google_subject = NULL, status = 'DISABLED', updated_at = ? WHERE id = ?`,
    ).run(anonEmail, "Deleted user", new Date().toISOString(), row.id);
    db.prepare(`DELETE FROM auth_tokens WHERE user_id = ?`).run(row.id);
    logAdminAction(db, {
      adminUserId: adminUser.id,
      action: "user_anonymized",
      targetType: "user",
      targetId: row.id,
      detail: JSON.stringify({ previousEmail: row.email }),
    });
    return { ok: true, mode: "anonymize", preview };
  }

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM messages WHERE sender_id = ?`).run(row.id);
    db.prepare(`DELETE FROM conversations WHERE client_id = ?`).run(row.id);
    db.prepare(`DELETE FROM auth_tokens WHERE user_id = ?`).run(row.id);
    if (row.role === ROLES.REAL_ESTATE_OWNER) {
      db.prepare(`DELETE FROM users WHERE id = ? AND role = 'REAL_ESTATE_OWNER'`).run(row.id);
    } else {
      db.prepare(`DELETE FROM users WHERE id = ?`).run(row.id);
    }
  });
  tx();

  logAdminAction(db, {
    adminUserId: adminUser.id,
    action: "user_deleted",
    targetType: "user",
    targetId: row.id,
    detail: JSON.stringify({ email: row.email, role: row.role, preview }),
  });

  return { ok: true, mode: "hard", preview };
}

export function listAdminAuditLog(db, { limit = 50 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
  return db
    .prepare(
      `SELECT a.id, a.action, a.target_type AS targetType, a.target_id AS targetId, a.detail,
              a.created_at AS createdAt, u.email AS adminEmail, u.name AS adminName
       FROM admin_audit_log a
       LEFT JOIN users u ON u.id = a.admin_user_id
       ORDER BY a.created_at DESC LIMIT ?`,
    )
    .all(lim);
}

export function getAdminDashboardStats(db) {
  const byRole = db.prepare(`SELECT role, COUNT(*) AS count FROM users GROUP BY role`).all();
  const byStatus = db.prepare(`SELECT status, COUNT(*) AS count FROM users GROUP BY status`).all();
  const totalUsers = db.prepare(`SELECT COUNT(*) AS c FROM users`).get().c;
  const projectStats = db
    .prepare(`SELECT status, COUNT(*) AS count FROM owner_project_drafts GROUP BY status`)
    .all();
  const recentUsers = db
    .prepare(
      `SELECT id, email, name, role, status, created_at AS createdAt FROM users
       ORDER BY created_at DESC LIMIT 8`,
    )
    .all();
  const recentAudit = listAdminAuditLog(db, { limit: 12 });
  return {
    totalUsers,
    byRole,
    byStatus,
    projectStats,
    recentUsers,
    recentAudit,
  };
}
