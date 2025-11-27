import { ReservationRepository } from "../repositories/reservation.repository.js";
import { RoomRepository } from "../repositories/room.repository.js";
import { publishEvent } from "../events/eventPublisher.js";
import { reservationsTotal, reservationsCancelled } from "../metrics.js";

export async function createReservation(input) {
  // 1) Validar que la sala exista
  const room = await RoomRepository.findById(input.roomId);
  if (!room) {
    throw { status: 400, title: "Bad Request", detail: "Room not found" };
  }

  // 2) Validar solapamientos
  const overlap = await ReservationRepository.findOverlaps(
    input.roomId,
    input.startsAt,
    input.endsAt
  );
  if (overlap) {
    throw { status: 409, title: "Overlap", detail: "Room already booked" };
  }

  // 3) Crear la reserva
  const reservation = await ReservationRepository.create({
    ...input,
    status: "CONFIRMED",
    createdAt: new Date().toISOString()
  });

  // 4) Incrementar métrica
  reservationsTotal.inc({ status: "CONFIRMED" });

  // 5) Publicar evento asíncrono
  await publishEvent("reservation.created", {
    reservationId: reservation._id.toString(),
    roomId: reservation.roomId,
    requesterEmail: reservation.requesterEmail,
    startsAt: reservation.startsAt,
    endsAt: reservation.endsAt
  });

  return reservation;
}

export async function cancelReservation(id) {
  const existing = await ReservationRepository.findById(id);
  if (!existing) {
    throw { status: 404, title: "Not Found" };
  }
  if (existing.status === "CANCELLED") return existing;

  const updated = await ReservationRepository.updateStatus(id, "CANCELLED");
  
  // Incrementar métrica
  reservationsCancelled.inc();
  
  await publishEvent("reservation.cancelled", {
    reservationId: id,
    roomId: updated.roomId
  });
  return updated;
}
