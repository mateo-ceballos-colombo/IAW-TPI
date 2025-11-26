import { Router } from "express";
import { Reservation } from "../models.js";
import { createReservation, cancelReservation } from "../services/reservation.service.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const list = await Reservation.find().lean().exec();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      startsAt: new Date(req.body.startsAt),
      endsAt: new Date(req.body.endsAt)
    };
    const created = await createReservation(body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const found = await Reservation.findById(req.params.id).lean().exec();
    if (!found) {
      return res.status(404).json({ title: "Not Found", status: 404 });
    }
    res.json(found);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const cancelled = await cancelReservation(req.params.id);
    res.json(cancelled);
  } catch (err) {
    next(err);
  }
});

export default router;
