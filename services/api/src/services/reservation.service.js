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
  
  reservationsCancelled.inc();
  
  await publishEvent("reservation.cancelled", {
    reservationId: id,
    roomId: updated.roomId
  });
  return updated;
}

export async function occupyReservation(id, now = new Date()) {
  const reservation = await ReservationRepository.findById(id);
  if (!reservation) {
    throw { status: 404, title: "Not Found", detail: "Reservation not found" };
  }

  // Si ya está cancelada, no se puede ocupar
  if (reservation.status === "CANCELLED") {
    throw {
      status: 409,
      title: "Conflict",
      detail: "Reservation is already cancelled"
    };
  }

  // Si ya está ocupada la devolvemos tal cual
  if (reservation.status === "OCCUPIED") {
    return reservation; 
  }

  // Validar ventana de tiempo para poder ocupar
  const toleranceMinutes = 10;
  const startsAt = new Date(reservation.startsAt);
  const endsAt   = new Date(reservation.endsAt);
  const nowDate  = new Date(now);

  const earliest = new Date(startsAt.getTime() - toleranceMinutes * 60 * 1000);

  // Solo se puede ocupar si:
  // now >= (startsAt - 10 min)  AND  now <= endsAt
  if (nowDate < earliest || nowDate > endsAt) {
    throw {
      status: 400,
      title: "Bad Request",
      detail: "Reservation cannot be occupied at this time"
    };
  }

  const updated = await ReservationRepository.updateStatus(id, "OCCUPIED");
  return updated;
}
