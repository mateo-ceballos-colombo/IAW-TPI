import { Router } from "express";
import { Room } from "../models.js";
import { ReservationRepository } from "../repositories/reservation.repository.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const rooms = await Room.find().lean().exec();
    res.json(rooms);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id).lean().exec();
    if (!room) {
      return res.status(404).json({ title: "Not Found", status: 404 });
    }
    res.json(room);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/occupancy", async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id).lean().exec();
    if (!room) {
      return res.status(404).json({ title: "Not Found", status: 404 });
    }

    const occupied = await ReservationRepository.hasActiveReservation(
      req.params.id,
      new Date()
    );

    res.json({ roomId: req.params.id, occupied });
  } catch (err) {
    next(err);
  }
});

export default router;
