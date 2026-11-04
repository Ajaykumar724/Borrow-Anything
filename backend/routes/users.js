import { Router } from "express";
import { dbService } from "../services/dbService.js";

const router = Router();

function demoProfile(user, rentals = []) {
  const phoneVerified = Boolean(user.phoneVerified ?? user.verificationStatus === "verified");
  const idVerified = Boolean(user.idVerified ?? user.verificationStatus === "verified");
  const completedRentals = rentals.filter((rental) =>
    rental.renterId === user.id && rental.status === "Returned"
  ).length;
  const joined = new Date(user.joinedAt || Date.now());
  const tenurePoints = Number.isFinite(joined.getTime())
    ? Math.max(0, Math.min(10, Math.floor((Date.now() - joined.getTime()) / (365 * 24 * 60 * 60 * 1000) * 2)))
    : 0;
  const score = user.verificationStatus === "suspended"
    ? 35
    : Math.min(100, 50 + (phoneVerified ? 12 : 0) + (idVerified ? 12 : 0) + tenurePoints + Math.min(completedRentals, 4) * 4);
  return {
    ...user,
    phoneVerified,
    idVerified,
    trustScore: score,
    trustScoreLabel: "Demo estimate",
    trustScoreBasis: { phoneDemo: phoneVerified, idDemo: idVerified, tenurePoints, completedRentals: Math.min(completedRentals, 4) },
    trustBadges: [
      ...(phoneVerified ? ["Demo phone verified"] : []),
      ...(idVerified ? ["Demo ID verified"] : [])
    ]
  };
}

router.get("/", async (_req, res, next) => {
  try {
    const [users, rentals] = await Promise.all([dbService.getAll("users"), dbService.getAll("rentals")]);
    res.json(users.map((user) => demoProfile(user, rentals)));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const user = await dbService.getById("users", req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const [items, rentals] = await Promise.all([
      dbService.getAll("items"),
      dbService.getAll("rentals")
    ]);
    res.json({
      ...demoProfile(user, rentals),
      itemCount: items.filter((item) => item.ownerId === user.id).length,
      rentalCount: rentals.filter((rental) => rental.renterId === user.id).length
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/verification-demo", async (req, res, next) => {
  try {
    const user = await dbService.getById("users", req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { method } = req.body ?? {};
    if (!["phone", "id"].includes(method)) {
      return res.status(400).json({ error: "Choose phone or id for the demo verification" });
    }
    if (user.verificationStatus === "suspended") {
      return res.status(403).json({ error: "Suspended users cannot change demo verification status" });
    }
    const phoneVerified = Boolean(user.phoneVerified ?? user.verificationStatus === "verified") || method === "phone";
    const idVerified = Boolean(user.idVerified ?? user.verificationStatus === "verified") || method === "id";
    const updated = await dbService.update("users", user.id, {
      phoneVerified, idVerified,
      verificationStatus: phoneVerified && idVerified ? "verified" : "unverified",
      verificationDemoUpdatedAt: new Date().toISOString()
    });
    req.log?.("user.demo_verification_updated", { userId: user.id, method });
    const rentals = await dbService.getAll("rentals");
    res.json(demoProfile(updated, rentals));
  } catch (error) {
    next(error);
  }
});

export default router;
