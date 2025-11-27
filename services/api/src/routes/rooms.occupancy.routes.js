import { Router } from "express";
import { ReservationRepository } from "../repositories/reservation.repository.js";

const router = Router();

router.get("/:id/occupancy", async (req, res, next) => {
    try {
        const roomId = req.params.id;

        const occupied = await ReservationRepository.hasActiveReservation(roomId, new Date());

        res.json({ roomId, occupied });
    } catch (err) {
        next(err);
    }
});

export default router;
