import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../../app.js";
import { systemPrisma } from "@iskool/db";

const PREFIX = `TEST_${Date.now()}`;
const TEST_ADMIN_PHONE = process.env.ADMIN_PHONES?.split(",")[0]?.trim() ?? "+919999900000";
const createdTenantIds: string[] = [];

let app: Awaited<ReturnType<typeof buildApp>>;
let token: string;

before(async () => {
  app = await buildApp();

  // Ensure bootstrap admin user exists
  const adminUser = await systemPrisma.user.upsert({
    where: { phone: TEST_ADMIN_PHONE },
    update: {},
    create: { phone: TEST_ADMIN_PHONE, displayName: "Test Platform Admin" },
  });

  token = app.jwt.sign({ sub: adminUser.id });
});

after(async () => {
  // Clean up test tenants
  if (createdTenantIds.length > 0) {
    await systemPrisma.tenant.deleteMany({ where: { id: { in: createdTenantIds } } });
  }
  await app.close();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe("GET /api/v1/admin/tenants", () => {
  test("returns 401 without token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/admin/tenants" });
    assert.equal(res.statusCode, 401);
  });

  test("returns tenant list with adminName field", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/admin/tenants", headers: auth() });
    assert.equal(res.statusCode, 200);
    const body = res.json<{ items: any[] }>();
    assert.ok(Array.isArray(body.items), "items should be an array");
    // If any tenants exist, they must have adminName
    for (const t of body.items) {
      assert.ok("adminName" in t, `tenant ${t.name} missing adminName`);
      assert.ok("adminPhone" in t, `tenant ${t.name} missing adminPhone`);
    }
  });
});

describe("POST /api/v1/admin/tenants", () => {
  test("returns 400 on missing required fields", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/admin/tenants",
      headers: auth(),
      payload: { name: "" },
    });
    assert.equal(res.statusCode, 400);
  });

  test("creates school with admin membership and returns adminName", async () => {
    const payload = {
      name: `${PREFIX} School`,
      adminFirstName: "Test",
      adminLastName: "Admin",
      adminPhone: `+9199999${Date.now().toString().slice(-5)}`,
      status: "TRIAL",
    };

    const res = await app.inject({
      method: "POST", url: "/api/v1/admin/tenants",
      headers: auth(),
      payload,
    });

    assert.equal(res.statusCode, 201, res.body);
    const body = res.json<any>();
    assert.equal(body.adminName, "Test Admin");
    assert.equal(body.adminPhone, payload.adminPhone);
    assert.ok(body.id, "response should include id");
    createdTenantIds.push(body.id);

    // Verify membership was created
    const membership = await systemPrisma.membership.findFirst({
      where: { tenantId: body.id, role: "SCHOOL_ADMIN" },
      include: { user: true },
    });
    assert.ok(membership, "SCHOOL_ADMIN membership should exist");
    assert.equal(membership!.user.displayName, "Test Admin");
  });

  test("adminName appears in GET list after creation", async () => {
    const phone = `+9199998${Date.now().toString().slice(-5)}`;
    const createRes = await app.inject({
      method: "POST", url: "/api/v1/admin/tenants",
      headers: auth(),
      payload: { name: `${PREFIX} Listed`, adminFirstName: "Listed", adminLastName: "School", adminPhone: phone, status: "TRIAL" },
    });
    assert.equal(createRes.statusCode, 201);
    const created = createRes.json<any>();
    createdTenantIds.push(created.id);

    const listRes = await app.inject({ method: "GET", url: "/api/v1/admin/tenants", headers: auth() });
    const list = listRes.json<{ items: any[] }>();
    const found = list.items.find((t: any) => t.id === created.id);
    assert.ok(found, "created school should appear in list");
    assert.equal(found.adminName, "Listed School", "adminName should not be N/A");
    assert.notEqual(found.adminName, "N/A");
  });
});

describe("PATCH /api/v1/admin/tenants/:id", () => {
  test("updates school name", async () => {
    // Create a school to update
    const createRes = await app.inject({
      method: "POST", url: "/api/v1/admin/tenants",
      headers: auth(),
      payload: { name: `${PREFIX} ToUpdate`, adminFirstName: "U", adminLastName: "Admin", adminPhone: `+9199997${Date.now().toString().slice(-5)}`, status: "TRIAL" },
    });
    const { id } = createRes.json<any>();
    createdTenantIds.push(id);

    const res = await app.inject({
      method: "PATCH", url: `/api/v1/admin/tenants/${id}`,
      headers: auth(),
      payload: { name: `${PREFIX} Updated` },
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json<any>().name, `${PREFIX} Updated`);
  });

  test("GET after PATCH reflects updated name", async () => {
    const createRes = await app.inject({
      method: "POST", url: "/api/v1/admin/tenants",
      headers: auth(),
      payload: { name: `${PREFIX} BeforeUpdate`, adminFirstName: "X", adminLastName: "Y", adminPhone: `+9199991${Date.now().toString().slice(-5)}`, status: "TRIAL" },
    });
    const { id } = createRes.json<any>();
    createdTenantIds.push(id);

    await app.inject({ method: "PATCH", url: `/api/v1/admin/tenants/${id}`, headers: auth(), payload: { name: `${PREFIX} AfterUpdate`, status: "ACTIVE" } });

    const listRes = await app.inject({ method: "GET", url: "/api/v1/admin/tenants", headers: auth() });
    const found = listRes.json<{ items: any[] }>().items.find((t: any) => t.id === id);
    assert.ok(found, "tenant should exist in list");
    assert.equal(found.name, `${PREFIX} AfterUpdate`, "name should be updated");
    assert.equal(found.status, "ACTIVE", "status should be updated");
  });

  test("returns 404 for non-existent tenant", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/admin/tenants/nonexistent-id",
      headers: auth(),
      payload: { name: "Whatever" },
    });
    assert.equal(res.statusCode, 404);
  });
});

describe("DELETE /api/v1/admin/tenants/:id", () => {
  test("soft deletes tenant and removes from list", async () => {
    const createRes = await app.inject({
      method: "POST", url: "/api/v1/admin/tenants",
      headers: auth(),
      payload: { name: `${PREFIX} ToDelete`, adminFirstName: "D", adminLastName: "Admin", adminPhone: `+9199996${Date.now().toString().slice(-5)}`, status: "TRIAL" },
    });
    const { id } = createRes.json<any>();
    createdTenantIds.push(id);

    const delRes = await app.inject({ method: "DELETE", url: `/api/v1/admin/tenants/${id}`, headers: auth() });
    assert.equal(delRes.statusCode, 204);

    // Should no longer appear in list
    const listRes = await app.inject({ method: "GET", url: "/api/v1/admin/tenants", headers: auth() });
    const list = listRes.json<{ items: any[] }>();
    assert.ok(!list.items.some((t: any) => t.id === id), "deleted school should not appear in list");

    // But deletedAt should be set in DB
    const tenant = await (systemPrisma as any).tenant.findUnique({ where: { id } });
    assert.ok(tenant.deletedAt, "deletedAt should be set");
  });
});

describe("PATCH /api/v1/admin/tenants/:id/admin-phone", () => {
  test("updates admin phone and reflects in list", async () => {
    const origPhone = `+9199995${Date.now().toString().slice(-5)}`;
    const createRes = await app.inject({
      method: "POST", url: "/api/v1/admin/tenants",
      headers: auth(),
      payload: { name: `${PREFIX} PhoneEdit`, adminFirstName: "Phone", adminLastName: "Test", adminPhone: origPhone, status: "TRIAL" },
    });
    const { id } = createRes.json<any>();
    createdTenantIds.push(id);

    const newPhone = `+9199994${Date.now().toString().slice(-5)}`;
    const patchRes = await app.inject({
      method: "PATCH", url: `/api/v1/admin/tenants/${id}/admin-phone`,
      headers: auth(),
      payload: { adminPhone: newPhone },
    });
    assert.equal(patchRes.statusCode, 200, patchRes.body);
    assert.equal(patchRes.json<any>().adminPhone, newPhone);

    // Verify in list
    const listRes = await app.inject({ method: "GET", url: "/api/v1/admin/tenants", headers: auth() });
    const found = listRes.json<{ items: any[] }>().items.find((t: any) => t.id === id);
    assert.equal(found?.adminPhone, newPhone);
  });

  test("returns 409 if phone already in use by another user", async () => {
    // Use origPhone of another user
    const phone1 = `+9199993${Date.now().toString().slice(-5)}`;
    const phone2 = `+9199992${Date.now().toString().slice(-5)}`;

    // Create two schools with different admin phones
    const r1 = await app.inject({ method: "POST", url: "/api/v1/admin/tenants", headers: auth(), payload: { name: `${PREFIX} Conflict1`, adminFirstName: "C", adminLastName: "One", adminPhone: phone1, status: "TRIAL" } });
    const r2 = await app.inject({ method: "POST", url: "/api/v1/admin/tenants", headers: auth(), payload: { name: `${PREFIX} Conflict2`, adminFirstName: "C", adminLastName: "Two", adminPhone: phone2, status: "TRIAL" } });
    createdTenantIds.push(r1.json<any>().id, r2.json<any>().id);

    // Try to update school2's admin phone to school1's admin phone
    const res = await app.inject({
      method: "PATCH", url: `/api/v1/admin/tenants/${r2.json<any>().id}/admin-phone`,
      headers: auth(),
      payload: { adminPhone: phone1 },
    });
    assert.equal(res.statusCode, 409);
  });
});
