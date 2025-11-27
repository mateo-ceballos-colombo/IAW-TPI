const { gql } = require('apollo-server');

const typeDefs = gql`
  scalar DateTime

  type Query {
    # Rooms
    rooms(
      name: String
      minCapacity: Int
      maxCapacity: Int
      location: String
    ): [Room!]!
    room(id: ID!): Room

    # Reservations
    reservations(
      date: String
      status: ReservationStatus
      roomId: ID
      requesterEmail: String
    ): [Reservation!]!
    reservation(id: ID!): Reservation
  }

  type Mutation {
    # Rooms
    createRoom(input: RoomInput!): Room!
    updateRoom(id: ID!, input: RoomUpdateInput!): Room!
    deleteRoom(id: ID!): Boolean!

    # Reservations
    createReservation(input: ReservationInput!): Reservation!
    updateReservation(id: ID!, input: ReservationUpdateInput!): Reservation!
    cancelReservation(id: ID!): Reservation!
  }

  type Room {
    id: ID!
    name: String!
    description: String
    capacity: Int!
    location: String
    createdAt: DateTime!
  }

  input RoomInput {
    name: String!
    description: String
    capacity: Int!
    location: String
  }

  input RoomUpdateInput {
    name: String
    description: String
    capacity: Int
    location: String
  }

  type Reservation {
    id: ID!
    roomId: ID!
    room: Room
    title: String!
    requesterEmail: String!
    startsAt: DateTime!
    endsAt: DateTime!
    status: ReservationStatus!
    participantsQuantity: Int!
    createdAt: DateTime!
  }

  input ReservationInput {
    roomId: ID!
    title: String!
    requesterEmail: String!
    startsAt: DateTime!
    endsAt: DateTime!
    participantsQuantity: Int!
  }

  input ReservationUpdateInput {
    roomId: ID
    title: String
    startsAt: DateTime
    endsAt: DateTime
    participantsQuantity: Int
  }

  enum ReservationStatus {
    CONFIRMED
    CANCELLED
  }
`;

module.exports = typeDefs;
