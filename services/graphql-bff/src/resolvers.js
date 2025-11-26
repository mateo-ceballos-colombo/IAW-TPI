import axios from "axios";

const API_BASE = process.env.API_BASE || "http://api:3000/v1";

export const resolvers = {
  Query: {
    reservations: async (_, __, ctx) => {
      const res = await axios.get(API_BASE + "/reservations", {
        headers: { Authorization: "Bearer " + ctx.token }
      });
      return res.data.map((r) => ({
        id: r._id,
        roomId: r.roomId,
        title: r.title,
        requesterEmail: r.requesterEmail,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        status: r.status,
        createdAt: r.createdAt
      }));
    },
    reservation: async (_, { id }, ctx) => {
      const res = await axios.get(API_BASE + "/reservations/" + id, {
        headers: { Authorization: "Bearer " + ctx.token }
      });
      const r = res.data;
      return {
        id: r._id,
        roomId: r.roomId,
        title: r.title,
        requesterEmail: r.requesterEmail,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        status: r.status,
        createdAt: r.createdAt
      };
    },
    rooms: async (_, __, ctx) => {
      const res = await axios.get(API_BASE + "/rooms", {
        headers: { Authorization: "Bearer " + ctx.token }
      });
      return res.data.map((room) => ({
        id: room._id,
        name: room.name,
        description: room.description,
        capacity: room.capacity,
        location: room.location,
        createdAt: room.createdAt
      }));
    }
  },
  Mutation: {
    createReservation: async (_, { input }, ctx) => {
      const res = await axios.post(API_BASE + "/reservations", input, {
        headers: { Authorization: "Bearer " + ctx.token }
      });
      const r = res.data;
      return { id: r._id, ...r };
    },
    cancelReservation: async (_, { id }, ctx) => {
      const res = await axios.delete(API_BASE + "/reservations/" + id, {
        headers: { Authorization: "Bearer " + ctx.token }
      });
      const r = res.data;
      return { id: r._id, ...r };
    }
  }
};
