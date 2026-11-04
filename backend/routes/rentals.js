import { Router } from "express";
import { randomUUID } from "node:crypto";
import { dbService } from "../services/dbService.js";

const router = Router();
const DAY = 24 * 60 * 60 * 1000;
const allowedStatuses = new Set(["Pending", "Approved", "Active", "Returned", "Disputed", "Declined"]);
const occupyingStatuses = new Set(["Pending", "Approved", "Active", "Disputed"]);

function isDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function checkout(item, startDate, endDate) {
  const days = Math.ceil((new Date(`${endDate}T00:00:00.000Z`) - new Date(`${startDate}T00:00:00.000Z`)) / DAY);
  const subtotal = Number((item.dailyRate * days).toFixed(2));
  const platformFee = Number((subtotal * 0.1).toFixed(2));
  return {
    days, dailyRate: item.dailyRate, subtotal, deposit: item.deposit,
    platformFee, commission: platformFee,
    total: Number((subtotal + item.deposit + platformFee).toFixed(2)),
    escrowEstimate: true, paymentCollected: false
  };
}

async function findConflict(itemId, startDate, endDate) {
  const existing = await dbService.getAll("rentals");
  return existing.some((rental) =>
    rental.itemId === itemId && occupyingStatuses.has(rental.status) &&
    startDate < rental.endDate && endDate > rental.startDate
  );
}

router.get("/", async (req, res, next) => {
  try {
    const [rentals, items, users, disputes] = await Promise.all([
      dbService.getAll("rentals"), dbService.getAll("items"), dbService.getAll("users"), dbService.getAll("disputes")
    ]);
    const filtered = rentals
      .filter((rental) => !req.query.userId || rental.renterId === req.query.userId || rental.ownerId === req.query.userId)
      .map((rental) => ({
        ...rental,
        item: items.find((item) => item.id === rental.itemId) ?? null,
        renter: users.find((user) => user.id === rental.renterId) ?? null,
        owner: users.find((user) => user.id === rental.ownerId) ?? null,
        dispute: disputes.find((dispute) => dispute.rentalId === rental.id) ?? null
      }));
    res.json(filtered);
  } catch (error) {
    next(error);
  }
});

router.post("/quote", async (req, res, next) => {
  try {
    const { itemId, startDate, endDate } = req.body ?? {};
    if (!itemId || !isDateOnly(startDate) || !isDateOnly(endDate) || startDate >= endDate) {
      return res.status(400).json({ error: "Item and a valid date range are required" });
    }
    const item = await dbService.getById("items", itemId);
    if (!item || item.status !== "available") return res.status(404).json({ error: "This item is not available" });
    if (await findConflict(itemId, startDate, endDate)) return res.status(409).json({ error: "Those dates overlap another request" });
    res.json({ itemId, startDate, endDate, ...checkout(item, startDate, endDate) });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { itemId, renterId, startDate, endDate } = req.body ?? {};
    if (!itemId || !renterId || !isDateOnly(startDate) || !isDateOnly(endDate) || startDate >= endDate) {
      return res.status(400).json({ error: "Item, renter, and a valid date range are required" });
    }
    const [item, renter] = await Promise.all([
      dbService.getById("items", itemId), dbService.getById("users", renterId)
    ]);
    if (!item || item.status !== "available") return res.status(404).json({ error: "This item is not available" });
    if (!renter) return res.status(404).json({ error: "Renter not found" });
    if (renter.verificationStatus === "suspended") return res.status(403).json({ error: "Suspended users cannot request rentals" });
    if (item.ownerId === renterId) return res.status(400).json({ error: "You cannot rent your own item" });
    if (await findConflict(itemId, startDate, endDate)) return res.status(409).json({ error: "Those dates overlap another request" });

    const rental = {
      id: `r-${randomUUID()}`, itemId, renterId, ownerId: item.ownerId,
      startDate, endDate, ...checkout(item, startDate, endDate),
      status: "Pending", locked: false, createdAt: new Date().toISOString()
    };
    await dbService.create("rentals", rental);
    req.log?.("rental.created", { rentalId: rental.id, itemId, renterId });
    res.status(201).json({ ...rental, item, renter });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status, actorId } = req.body ?? {};
    if (!allowedStatuses.has(status)) return res.status(400).json({ error: "Invalid rental status" });
    const rental = await dbService.getById("rentals", req.params.id);
    if (!rental) return res.status(404).json({ error: "Rental not found" });
    if (!actorId || actorId !== rental.ownerId) return res.status(403).json({ error: "Only the owner can update rental status" });
    if (rental.locked || rental.status === "Disputed") return res.status(409).json({ error: "This booking is locked for incident review" });
    const transitions = {
      Pending: ["Approved", "Declined"],
      Approved: ["Active", "Returned"],
      Active: ["Returned"],
      Returned: [],
      Disputed: [],
      Declined: []
    };
    if (!transitions[rental.status]?.includes(status)) {
      return res.status(409).json({ error: `Cannot change ${rental.status} to ${status}` });
    }
    const now = new Date().toISOString();
    const updates = { status, updatedAt: now };
    if (status === "Active") updates.pickedUpAt = now;
    if (status === "Returned") updates.returnedAt = now;
    const updated = await dbService.update("rentals", rental.id, updates);
    req.log?.("rental.status_changed", { rentalId: rental.id, status });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/report", async (req, res, next) => {
  try {
    const rental = await dbService.getById("rentals", req.params.id);
    if (!rental) return res.status(404).json({ error: "Rental not found" });
    const { actorId, reason, details = "" } = req.body ?? {};
    if (!actorId || actorId !== rental.ownerId) return res.status(403).json({ error: "Only the owner can submit this report" });
    if (!["not_returned", "stolen"].includes(reason)) return res.status(400).json({ error: "Choose not_returned or stolen" });
    if (typeof details !== "string" || details.length > 2000) return res.status(400).json({ error: "Report notes must be 2,000 characters or fewer" });
    if (["Returned", "Declined", "Disputed"].includes(rental.status)) {
      return res.status(409).json({ error: "This rental cannot be reported in its current state" });
    }
    const now = new Date().toISOString();
    const dispute = {
      id: `d-${randomUUID()}`, rentalId: rental.id, itemId: rental.itemId,
      ownerId: rental.ownerId, renterId: rental.renterId, reason,
      details: details.trim(), status: "Under review",
      renterFlagged: true, legalReviewRequired: true, legalReviewStatus: "pending",
      legalNoticeGeneratedAt: now, legalNoticeDemo: true,
      createdAt: now
    };
    await dbService.create("disputes", dispute);
    // Lock the reported booking and any other still-open bookings for this renter.
    const rentals = await dbService.getAll("rentals");
    await Promise.all(rentals.filter((entry) =>
      entry.renterId === rental.renterId && occupyingStatuses.has(entry.status)
    ).map((entry) => dbService.update("rentals", entry.id, {
      ...(entry.id === rental.id ? { status: "Disputed", disputeId: dispute.id } : {}),
      locked: true, updatedAt: now
    })));
    await Promise.all([
      dbService.update("users", rental.renterId, {
        verificationStatus: "suspended",
        suspensionReason: `Reported ${reason.replace("_", " ")} — dispute ${dispute.id}`,
        suspendedAt: now
      }),
      dbService.update("items", rental.itemId, { status: "under_review" })
    ]);
    req.log?.("rental.incident_reported", { rentalId: rental.id, disputeId: dispute.id, reason });
    res.status(201).json({
      dispute,
      notice: "Demo legal-review record only. This is not a legal notice or legal advice.",
      renter: { id: rental.renterId, verificationStatus: "suspended" }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/disputes/all", async (_req, res, next) => {
  try {
    const [disputes, rentals, items, users] = await Promise.all([
      dbService.getAll("disputes"), dbService.getAll("rentals"), dbService.getAll("items"), dbService.getAll("users")
    ]);
    res.json(disputes.map((dispute) => ({
      ...dispute,
      rental: rentals.find((rental) => rental.id === dispute.rentalId) ?? null,
      item: items.find((item) => item.id === dispute.itemId) ?? null,
      owner: users.find((user) => user.id === dispute.ownerId) ?? null,
      renter: users.find((user) => user.id === dispute.renterId) ?? null
    })));
  } catch (error) {
    next(error);
  }
});

export default router;
