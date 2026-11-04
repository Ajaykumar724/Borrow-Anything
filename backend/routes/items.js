import { Router } from "express";
import { randomUUID } from "node:crypto";
import { dbService } from "../services/dbService.js";

const router = Router();
const categories = ["Electronics", "Tools", "Outdoors", "Home", "Sports", "Other"];
const occupyingStatuses = new Set(["Pending", "Approved", "Active", "Disputed"]);

function isDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

router.get("/", async (req, res, next) => {
  try {
    const [items, users, rentals] = await Promise.all([
      dbService.getAll("items"),
      dbService.getAll("users"),
      dbService.getAll("rentals")
    ]);
    const query = String(req.query.q ?? "").trim().toLowerCase();
    const category = String(req.query.category ?? "");
    const location = String(req.query.location ?? "").trim().toLowerCase();
    const maxPrice = req.query.maxPrice === undefined || req.query.maxPrice === "" ? Infinity : Number(req.query.maxPrice);
    const startDate = req.query.startDate ?? req.query.availabilityStart;
    const endDate = req.query.endDate ?? req.query.availabilityEnd;
    if ((!Number.isFinite(maxPrice) && maxPrice !== Infinity) || maxPrice < 0) {
      return res.status(400).json({ error: "maxPrice must be a non-negative number" });
    }
    if (category && category !== "All items" && !categories.includes(category)) {
      return res.status(400).json({ error: "Choose a valid category" });
    }
    if ((startDate || endDate) && (!isDateOnly(startDate) || !isDateOnly(endDate) || startDate >= endDate)) {
      return res.status(400).json({ error: "Provide a valid availability date range with endDate after startDate" });
    }
    const results = items
      .filter((item) => item.status === "available")
      .filter((item) => !query || `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(query))
      .filter((item) => !category || category === "All items" || item.category === category)
      .filter((item) => !location || String(item.location || "").toLowerCase().includes(location))
      .filter((item) => item.dailyRate <= maxPrice)
      .filter((item) => !startDate || !rentals.some((rental) =>
        rental.itemId === item.id && occupyingStatuses.has(rental.status) &&
        startDate < rental.endDate && endDate > rental.startDate
      ))
      .map((item) => ({
        ...item,
        owner: users.find((user) => user.id === item.ownerId) ?? null,
        rentalCount: rentals.filter((rental) => rental.itemId === item.id).length
      }));
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const item = await dbService.getById("items", req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    const [owner, rentals] = await Promise.all([
      dbService.getById("users", item.ownerId),
      dbService.getAll("rentals")
    ]);
    res.json({ ...item, owner, rentalCount: rentals.filter((rental) => rental.itemId === item.id).length });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
    const { ownerId, title, category, description, dailyRate, deposit, replacementValue, location, imageUrl, specifications } = body;
    if (!ownerId || !String(title ?? "").trim() || !String(description ?? "").trim() || !String(location ?? "").trim()) {
      return res.status(400).json({ error: "Owner, title, description, and location are required" });
    }
    if (String(title).trim().length > 100 || String(description).trim().length > 2000 || String(location).trim().length > 120) {
      return res.status(400).json({ error: "Listing text exceeds the allowed length" });
    }
    const [owner, rate, bond, value] = await Promise.all([
      dbService.getById("users", ownerId),
      Promise.resolve(Number(dailyRate)),
      Promise.resolve(Number(deposit)),
      Promise.resolve(Number(replacementValue))
    ]);
    if (!owner) return res.status(404).json({ error: "Owner not found" });
    if (owner.verificationStatus === "suspended") return res.status(403).json({ error: "Suspended users cannot list items" });
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(bond) || bond < 0 || !Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ error: "Enter a valid daily rate, deposit, and replacement value" });
    }
    if (!categories.includes(category)) return res.status(400).json({ error: "Choose a valid category" });
    if (imageUrl && (typeof imageUrl !== "string" || imageUrl.length > 1000 || !/^https?:\/\//i.test(imageUrl))) {
      return res.status(400).json({ error: "Photo URL must be a valid http(s) URL" });
    }
    if (specifications !== undefined && (!Array.isArray(specifications) || specifications.length > 20 || specifications.some((spec) => typeof spec !== "string" || spec.length > 120))) {
      return res.status(400).json({ error: "Specifications must be a list of short text entries" });
    }
    const item = {
      id: `i-${randomUUID()}`, ownerId, title: String(title).trim(), category,
      description: String(description).trim(), dailyRate: rate, deposit: bond,
      replacementValue: value, location: String(location).trim(),
      imageUrl: String(imageUrl ?? "").trim(), specifications: specifications ?? [],
      status: "available", createdAt: new Date().toISOString()
    };
    await dbService.create("items", item);
    res.status(201).json({ ...item, owner });
  } catch (error) {
    next(error);
  }
});

export default router;
