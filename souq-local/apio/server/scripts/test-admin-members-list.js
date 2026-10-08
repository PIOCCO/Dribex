/**
 * Offline regression: admin member list returns all owners and honors filters.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "apio-members-list-"));
process.env.DATABASE_PATH = path.join(tmp, "test.sqlite");

const { openDb, migrate } = await import("../src/db.js");
const { listMembersForAdmin } = await import("../src/adminMembers.js");
const { createUser, hashPassword, ROLES } = await import("../src/auth.js");
const { createMemberProfile } = await import("../src/memberProfiles.js");
const { createMemberWithAccount } = await import("../src/adminMembers.js");

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

function seedOwner(email, name, companyFr) {
  const profile = createMemberProfile(db, {
    nameFr: name,
    agencyFr: companyFr,
    verified: true,
  });
  createUser(db, {
    email,
    passwordHash: hashPassword("password12345"),
    name,
    role: ROLES.REAL_ESTATE_OWNER,
    status: "ACTIVE",
    ownerProfileId: profile.id,
    authProvider: "local",
    emailVerifiedAt: new Date().toISOString(),
  });
}

seedOwner("alpha@example.com", "Alpha Contact", "Alpha Agency");
seedOwner("beta@example.com", "Beta Contact", "Beta Homes");
seedOwner("gamma@example.com", "Gamma Contact", "Gamma Immo");

const all = listMembersForAdmin(db, {});
assert("lists all owners", all.members.length === 3 && all.total === 3);

const byCompany = listMembersForAdmin(db, { q: "beta" });
assert("search matches company", byCompany.members.length === 1 && byCompany.total === 3);

const activeOnly = listMembersForAdmin(db, { status: "ACTIVE" });
assert("status filter keeps total", activeOnly.members.length === 3 && activeOnly.total === 3);

createUser(db, {
  email: "client@example.com",
  passwordHash: hashPassword("password12345"),
  name: "Site Client",
  role: ROLES.CLIENT,
  status: "ACTIVE",
  authProvider: "local",
  emailVerifiedAt: new Date().toISOString(),
});

const adminUser = createUser(db, {
  email: "admin@example.com",
  passwordHash: hashPassword("password12345"),
  name: "Admin",
  role: ROLES.SUPER_ADMIN,
  status: "ACTIVE",
  authProvider: "local",
});

let clientBlockOk = false;
try {
  await createMemberWithAccount(db, adminUser, {
    email: "client@example.com",
    password: "password12345",
    name: "Should Fail",
    companyFr: "X",
  });
} catch (e) {
  clientBlockOk = e.status === 409 && e.code === "EMAIL_TAKEN" && e.existingRole === "CLIENT";
}
assert("409 when email belongs to CLIENT (not shown in member list)", clientBlockOk);

console.log("admin members list regression passed");
