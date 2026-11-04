import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temp = await mkdtemp(join(tmpdir(), "borrow-anything-"));
process.env.DATA_FILE = join(temp, "data.json");
process.env.NODE_ENV = "test";
const { createDbService } = await import("../services/dbService.js");
const fixture = {
  users: [
    { id: "owner", name: "Owner Demo", location: "Brooklyn", verificationStatus: "verified", joinedAt: "2024-01-01T00:00:00.000Z" },
    { id: "renter", name: "Renter Demo", location: "Brooklyn", verificationStatus: "unverified", joinedAt: "2025-01-01T00:00:00.000Z" },
    { id: "second-renter", name: "Second Renter", location: "Brooklyn", verificationStatus: "unverified", joinedAt: "2025-01-01T00:00:00.000Z" }
  ],
  items: [
    { id: "camera", ownerId: "owner", title: "Camera kit", category: "Electronics", description: "A compact demo camera", dailyRate: 40, deposit: 100, replacementValue: 800, location: "Brooklyn, NY", imageUrl: "", specifications: [], status: "available", createdAt: "2025-01-01T00:00:00.000Z" },
    { id: "drill", ownerId: "owner", title: "Drill set", category: "Tools", description: "A weekend tool set", dailyRate: 18, deposit: 120, replacementValue: 280, location: "Brooklyn, NY", imageUrl: "", specifications: [], status: "available", createdAt: "2025-01-01T00:00:00.000Z" }
  ],
  rentals: [],
  disputes: []
};
await writeFile(process.env.DATA_FILE, JSON.stringify(fixture), "utf8");
const { default: app } = await import("../server.js");
let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((resolveListen) => server.once("listening", resolveListen));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  server.close();
  await rm(temp, { recursive: true, force: true });
});

async function post(path, body) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

test("repository exposes isolated CRUD operations", async () => {
  const file = join(temp, "repository.json");
  await writeFile(file, JSON.stringify({ things: [{ id: "one", value: 1 }] }), "utf8");
  const db = createDbService(file);
  assert.equal((await db.getAll("things")).length, 1);
  assert.equal((await db.getById("things", "one")).value, 1);
  await Promise.all([
    db.create("things", { id: "two", value: 2 }),
    db.create("things", { id: "three", value: 3 })
  ]);
  assert.equal((await db.update("things", "two", { value: 4 })).value, 4);
  assert.equal((await db.delete("things", "three")).id, "three");
  assert.equal(await db.getById("things", "missing"), null);
  assert.deepEqual((await db.getAll("things")).map((thing) => thing.id).sort(), ["one", "two"]);
  const stored = JSON.parse(await readFile(file, "utf8"));
  assert.equal(stored.things.length, 2);
});

test("health, profiles, demo trust score and listing reads work", async () => {
  const [health, people, item] = await Promise.all([
    fetch(`${base}/health`), fetch(`${base}/users`), fetch(`${base}/items/camera`)
  ]);
  assert.equal((await health.json()).status, "ok");
  const owner = (await people.json()).find((user) => user.id === "owner");
  assert.equal(owner.trustScoreLabel, "Demo estimate");
  assert.deepEqual(owner.trustBadges, ["Demo phone verified", "Demo ID verified"]);
  assert.equal((await item.json()).owner.name, "Owner Demo");
});

test("marketplace validates filters and checks requested date availability", async () => {
  const occupied = await post("/rentals", {
    itemId: "drill", renterId: "renter", startDate: "2027-01-10", endDate: "2027-01-12"
  });
  assert.equal(occupied.status, 201);
  const available = await fetch(`${base}/items?category=Tools&location=Brooklyn&maxPrice=20&startDate=2027-01-10&endDate=2027-01-12`);
  assert.deepEqual(await available.json(), []);
  const otherDates = await fetch(`${base}/items?category=Tools&startDate=2027-01-12&endDate=2027-01-14`);
  assert.equal((await otherDates.json())[0].id, "drill");
  const invalid = await fetch(`${base}/items?maxPrice=-1`);
  assert.equal(invalid.status, 400);
});

test("listing validation accepts safe owner-created listings", async () => {
  const response = await post("/items", {
    ownerId: "owner", title: "Folding table", category: "Home", description: "A sturdy table for gatherings.",
    dailyRate: 12, deposit: 35, replacementValue: 100, location: "Brooklyn, NY", specifications: ["Seats four"]
  });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).title, "Folding table");
  const bad = await post("/items", {
    ownerId: "owner", title: "Bad URL", category: "Home", description: "Bad", dailyRate: 12,
    deposit: 0, replacementValue: 100, location: "Brooklyn", imageUrl: "javascript:alert(1)"
  });
  assert.equal(bad.status, 400);
});

test("server-calculated quote itemizes rate, refundable deposit and 10% fee", async () => {
  const response = await post("/rentals/quote", {
    itemId: "camera", startDate: "2027-02-01", endDate: "2027-02-04"
  });
  assert.equal(response.status, 200);
  const quote = await response.json();
  assert.equal(quote.days, 3);
  assert.equal(quote.subtotal, 120);
  assert.equal(quote.deposit, 100);
  assert.equal(quote.platformFee, 12);
  assert.equal(quote.total, 232);
  assert.equal(quote.paymentCollected, false);
});

test("booking rejects overlapping dates and calculates checkout consistently", async () => {
  const response = await post("/rentals", {
    itemId: "camera", renterId: "renter", startDate: "2027-03-10", endDate: "2027-03-12"
  });
  assert.equal(response.status, 201);
  const rental = await response.json();
  assert.equal(rental.days, 2);
  assert.equal(rental.subtotal, 80);
  assert.equal(rental.deposit, 100);
  assert.equal(rental.platformFee, 8);
  assert.equal(rental.total, 188);
  const overlap = await post("/rentals", {
    itemId: "camera", renterId: "second-renter", startDate: "2027-03-11", endDate: "2027-03-13"
  });
  assert.equal(overlap.status, 409);
  const malformed = await post("/rentals", {
    itemId: "camera", renterId: "renter", startDate: "2027-02-30", endDate: "2027-03-01"
  });
  assert.equal(malformed.status, 400);
});

test("only owner may transition bookings and lifecycle timestamps are saved", async () => {
  const booking = await post("/rentals", {
    itemId: "drill", renterId: "second-renter", startDate: "2027-04-15", endDate: "2027-04-17"
  });
  const rental = await booking.json();
  const denied = await fetch(`${base}/rentals/${rental.id}/status`, {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "Approved", actorId: "second-renter" })
  });
  assert.equal(denied.status, 403);
  const approved = await fetch(`${base}/rentals/${rental.id}/status`, {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "Approved", actorId: "owner" })
  });
  assert.equal((await approved.json()).status, "Approved");
  const active = await fetch(`${base}/rentals/${rental.id}/status`, {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "Active", actorId: "owner" })
  });
  assert.ok((await active.json()).pickedUpAt);
});

test("incident report suspends renter, locks open bookings, and timestamps demo legal review", async () => {
  const reportedBooking = await post("/rentals", {
    itemId: "camera", renterId: "renter", startDate: "2027-05-10", endDate: "2027-05-12"
  });
  const otherOpenBooking = await post("/rentals", {
    itemId: "drill", renterId: "renter", startDate: "2027-05-10", endDate: "2027-05-12"
  });
  const [reported, other] = await Promise.all([reportedBooking.json(), otherOpenBooking.json()]);
  const response = await post(`/rentals/${reported.id}/report`, {
    actorId: "owner", reason: "not_returned", details: "Demo test report"
  });
  assert.equal(response.status, 201);
  const { dispute } = await response.json();
  assert.equal(dispute.legalReviewRequired, true);
  assert.equal(dispute.legalReviewStatus, "pending");
  assert.ok(dispute.legalNoticeGeneratedAt);
  assert.equal(dispute.legalNoticeDemo, true);
  assert.equal((await (await fetch(`${base}/users/renter`)).json()).verificationStatus, "suspended");
  const bookings = await (await fetch(`${base}/rentals?userId=renter`)).json();
  assert.equal(bookings.find((entry) => entry.id === reported.id).status, "Disputed");
  assert.equal(bookings.find((entry) => entry.id === other.id).locked, true);
  const deniedBooking = await post("/rentals", {
    itemId: "drill", renterId: "renter", startDate: "2027-05-20", endDate: "2027-05-21"
  });
  assert.equal(deniedBooking.status, 403);
  const deniedTransition = await fetch(`${base}/rentals/${other.id}/status`, {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "Approved", actorId: "owner" })
  });
  assert.equal(deniedTransition.status, 409);
});

test("demo verification never requires private documents and responds with simulation disclosure", async () => {
  const response = await fetch(`${base}/users/second-renter/verification-demo`, {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ method: "phone" })
  });
  assert.equal(response.status, 200);
  const profile = await response.json();
  assert.equal(profile.phoneVerified, true);
  assert.equal(profile.idVerified, false);
  assert.ok(profile.trustScore <= 100);
  const invalid = await fetch(`${base}/users/second-renter/verification-demo`, {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ method: "passport", document: "not-accepted" })
  });
  assert.equal(invalid.status, 400);
});

test("errors include correlation id without exposing internal details", async () => {
  const response = await fetch(`${base}/missing`, { headers: { "x-request-id": "demo-correlation-1" } });
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("x-request-id"), "demo-correlation-1");
  assert.equal(body.requestId, "demo-correlation-1");
  assert.equal(body.error, "Route not found");
});
