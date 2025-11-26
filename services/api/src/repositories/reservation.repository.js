import { Reservation } from "../models.js";

export const ReservationRepository = {
  findByFilters(filters) {
    return Reservation.find(filters).lean().exec();
  },
  findById(id) {
    return Reservation.findById(id).lean().exec();
  },
  create(doc, session) {
    return Reservation.create([doc], { session }).then(r => r[0]);
  },
  updateStatus(id, status, session) {
    return Reservation.findByIdAndUpdate(
      id,
      { status },
      { new: true, session }
    ).lean().exec();
  },
  findOverlaps(roomId, startsAt, endsAt) {
    return Reservation.findOne({
      roomId,
      status: "CONFIRMED",
      startsAt: { $lt: endsAt },
      endsAt: { $gt: startsAt }
    }).lean().exec();
  }
};
