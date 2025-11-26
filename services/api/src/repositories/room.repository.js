import { Room } from "../models.js";

export const RoomRepository = {
  findById(id) {
    return Room.findById(id).lean().exec();
  }
};
