/**
 * Offline admin user management regression tests.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROLES, createUser, hashPassword, findUserById } from "../src/auth.js";
import { openDb, migrate } from "../src/db.js";
import {
  changeUserRoleByAdmin,
  countActiveSuperAdmins,
  deleteUserByAdmin,
  listUsersForAdmin,
  updateUserByAdmin,
} from "../src/adminUsers.js";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "apio-users-"));
process.env.DATABASE_PATH = path.join(tmp, "test.sqlite");

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

const admin = createUser(db, {
  email: "admin@test.local",
  passwordHash: hashPassword("password12345"),
  name: "Admin",
  role: ROLES.SUPER_ADMIN,
  status: "ACTIVE",
  authProvider: "local",
  emailVerifiedAt: new Date().toISOString(),
});

createUser(db, {
  email: "client@test.local",
  passwordHash: hashPassword("password12345"),
  name: "Client",
  role: ROLES.CLIENT,
  status: "ACTIVE",
  authProvider: "local",
});

const list = listUsersForAdmin(db, { page: 1, limit: 10 });
assert("lists all roles", list.total >= 2 && list.users.some((u) => u.role === "CLIENT"));

let selfSuspendBlocked = false;
try {
  updateUserByAdmin(db, admin, admin.id, { status: "DISABLED" });
} catch (e) {
  selfSuspendBlocked = e.status === 400;
}
assert("cannot suspend own admin account", selfSuspendBlocked);

const client = list.users.find((u) => u.role === "CLIENT");
updateUserByAdmin(db, admin, client.id, { status: "DISABLED", suspendReason: "test" });
const disabled = findUserById(db, client.id);
assert("suspend client", disabled.status === "DISABLED");

assert("super admin count", countActiveSuperAdmins(db) === 1);

console.log("admin users regression passed");
