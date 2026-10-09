/**
 * Offline session resolution tests (role/status from DB, not JWT claims).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "apio-sess-"));
process.env.DATABASE_PATH = path.join(tmp, "test.sqlite");
process.env.JWT_SECRET = "test-secret-at-least-thirty-two-chars!!";
process.env.APIO_ADMIN_JWT_SECRET = "admin-test-secret-thirty-two-chars-min!!";

const jwt = (await import("jsonwebtoken")).default;
const { ROLES, createUser, hashPassword, signToken } = await import("../src/auth.js");
const { openDb, migrate } = await import("../src/db.js");
const { resolveUserFromPublicToken } = await import("../src/middleware.js");
const { resolveAdminUserFromToken, signAdminToken } = await import("../src/adminAuth.js");

const db = openDb();
migrate(db);

function assert(name, cond) {
  if (!cond) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`OK  ${name}`);
}

const client = createUser(db, {
  email: "client-sess@test.local",
  passwordHash: hashPassword("password12345"),
  name: "Client",
  role: ROLES.CLIENT,
  status: "ACTIVE",
  authProvider: "local",
  emailVerifiedAt: new Date().toISOString(),
});

const admin = createUser(db, {
  email: "admin-sess@test.local",
  passwordHash: hashPassword("password12345"),
  name: "Admin",
  role: ROLES.SUPER_ADMIN,
  status: "ACTIVE",
  authProvider: "local",
  emailVerifiedAt: new Date().toISOString(),
});

const legit = signToken(client);
let session = resolveUserFromPublicToken(db, legit);
assert("valid token resolves client", session.user?.role === ROLES.CLIENT);

const forged = jwt.sign(
  { sub: client.id, role: ROLES.SUPER_ADMIN, email: client.email },
  process.env.JWT_SECRET,
  { expiresIn: "1h", algorithm: "HS256" },
);
session = resolveUserFromPublicToken(db, forged);
assert("forged JWT role ignored (still CLIENT)", session.user?.role === ROLES.CLIENT);

db.prepare(`UPDATE users SET status = 'DISABLED' WHERE id = ?`).run(client.id);
session = resolveUserFromPublicToken(db, legit);
assert("suspended user rejected", session.user === null && session.invalid === true);

db.prepare(`UPDATE users SET status = 'ACTIVE', role = ? WHERE id = ?`).run(
  ROLES.REAL_ESTATE_OWNER,
  client.id,
);
session = resolveUserFromPublicToken(db, legit);
assert("role change reflected without re-login", session.user?.role === ROLES.REAL_ESTATE_OWNER);

const adminTok = signAdminToken(admin);
let adminSession = resolveAdminUserFromToken(db, adminTok);
assert("admin token resolves super admin", adminSession.user?.role === ROLES.SUPER_ADMIN);

db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(ROLES.CLIENT, admin.id);
adminSession = resolveAdminUserFromToken(db, adminTok);
assert("demoted admin token invalidated", adminSession.user === null && adminSession.invalid === true);

console.log("auth session offline tests passed");
