const apiClient = require('./apiClient');
const logger = require('./logger');
const { GraphQLScalarType, Kind } = require('graphql');

// DateTime scalar implementation
const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO 8601 DateTime string',
  serialize(value) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
  parseValue(value) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  }
});

const resolvers = {
  DateTime: dateTimeScalar,

  Query: {
    // ==================== ROOMS ====================
    
    async rooms(_, args, context) {
      logger.info({ args }, 'Query: rooms');
      const filters = {
        name: args.name,
        minCapacity: args.minCapacity,
        maxCapacity: args.maxCapacity,
        location: args.location
      };
      return apiClient.getRooms(filters, context.token);
    },

    async room(_, { id }, context) {
      logger.info({ id }, 'Query: room');
      return apiClient.getRoom(id, context.token);
    },

    // ==================== RESERVATIONS ====================
    
    async reservations(_, args, context) {
      logger.info({ args }, 'Query: reservations');
      const filters = {
        date: args.date,
        status: args.status,
        roomId: args.roomId,
        requesterEmail: args.requesterEmail
      };
      return apiClient.getReservations(filters, context.token);
    },

    async reservation(_, { id }, context) {
      logger.info({ id }, 'Query: reservation');
      return apiClient.getReservation(id, context.token);
    }
  },

  Mutation: {
    // ==================== ROOMS ====================
    
    async createRoom(_, { input }, context) {
      logger.info({ input }, 'Mutation: createRoom');
      return apiClient.createRoom(input, context.token);
    },

    async updateRoom(_, { id, input }, context) {
      logger.info({ id, input }, 'Mutation: updateRoom');
      return apiClient.updateRoom(id, input, context.token);
    },

    async deleteRoom(_, { id }, context) {
      logger.info({ id }, 'Mutation: deleteRoom');
      await apiClient.deleteRoom(id, context.token);
      return true;
    },

    // ==================== RESERVATIONS ====================
    
    async createReservation(_, { input }, context) {
      logger.info({ input }, 'Mutation: createReservation');
      return apiClient.createReservation(input, context.token);
    },

    async updateReservation(_, { id, input }, context) {
      logger.info({ id, input }, 'Mutation: updateReservation');
      return apiClient.updateReservation(id, input, context.token);
    },

    async cancelReservation(_, { id }, context) {
      logger.info({ id }, 'Mutation: cancelReservation');
      return apiClient.cancelReservation(id, context.token);
    }
  },

  // ==================== FIELD RESOLVERS ====================
  
  Room: {
    // Mapear _id de MongoDB a id de GraphQL
    id(parent) {
      return parent._id || parent.id;
    }
  },

  Reservation: {
    // Mapear _id de MongoDB a id de GraphQL
    id(parent) {
      return parent._id || parent.id;
    },
    
    // Resolver para popular el room desde el roomId
    async room(parent, _, context) {
      if (!parent.roomId) return null;
      try {
        return await apiClient.getRoom(parent.roomId, context.token);
      } catch (error) {
        logger.error({ error, roomId: parent.roomId }, 'Error fetching room for reservation');
        return null;
      }
    }
  }
};

module.exports = resolvers;
