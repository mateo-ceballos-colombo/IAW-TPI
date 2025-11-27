const axios = require('axios');
const logger = require('./logger');

class ApiClient {
  constructor() {
    this.baseURL = process.env.API_URL || 'http://api-reservas:3001';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor para logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug({ 
          method: config.method,
          url: config.url,
          hasAuth: !!config.headers.Authorization
        }, 'API Request');
        return config;
      },
      (error) => {
        logger.error({ err: error }, 'API Request Error');
        return Promise.reject(error);
      }
    );

    // Response interceptor para logging y error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug({ 
          status: response.status,
          url: response.config.url
        }, 'API Response');
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error({
            status: error.response.status,
            url: error.config?.url,
            data: error.response.data
          }, 'API Error Response');
          
          // Propagar el error de la API con el mensaje original
          const apiError = new Error(
            error.response.data?.title || 
            error.response.data?.message || 
            'Error en la API'
          );
          apiError.status = error.response.status;
          apiError.details = error.response.data;
          throw apiError;
        } else if (error.request) {
          logger.error({ err: error }, 'API No Response');
          throw new Error('No se pudo conectar con la API de reservas');
        } else {
          logger.error({ err: error }, 'API Request Setup Error');
          throw error;
        }
      }
    );
  }

  /**
   * Realiza un request con token relay
   */
  async request(config, token) {
    const requestConfig = {
      ...config,
      headers: {
        ...config.headers,
        ...(token && { Authorization: `Bearer ${token}` }) // Token Relay
      }
    };

    const response = await this.client.request(requestConfig);
    return response.data;
  }

  // ==================== ROOMS ====================

  async getRooms(filters = {}, token) {
    const params = new URLSearchParams();
    if (filters.name) params.append('name', filters.name);
    if (filters.minCapacity) params.append('minCapacity', filters.minCapacity);
    if (filters.maxCapacity) params.append('maxCapacity', filters.maxCapacity);
    if (filters.location) params.append('location', filters.location);

    return this.request({
      method: 'GET',
      url: `/rooms?${params.toString()}`
    }, token);
  }

  async getRoom(id, token) {
    return this.request({
      method: 'GET',
      url: `/rooms/${id}`
    }, token);
  }

  async createRoom(data, token) {
    return this.request({
      method: 'POST',
      url: '/rooms',
      data
    }, token);
  }

  async updateRoom(id, data, token) {
    return this.request({
      method: 'PUT',
      url: `/rooms/${id}`,
      data
    }, token);
  }

  async deleteRoom(id, token) {
    await this.request({
      method: 'DELETE',
      url: `/rooms/${id}`
    }, token);
    return true;
  }

  // ==================== RESERVATIONS ====================

  async getReservations(filters = {}, token) {
    const params = new URLSearchParams();
    if (filters.date) params.append('date', filters.date);
    if (filters.status) params.append('status', filters.status);
    if (filters.roomId) params.append('roomId', filters.roomId);
    if (filters.requesterEmail) params.append('requesterEmail', filters.requesterEmail);

    return this.request({
      method: 'GET',
      url: `/reservations?${params.toString()}`
    }, token);
  }

  async getReservation(id, token) {
    return this.request({
      method: 'GET',
      url: `/reservations/${id}`
    }, token);
  }

  async createReservation(data, token) {
    return this.request({
      method: 'POST',
      url: '/reservations',
      data
    }, token);
  }

  async updateReservation(id, data, token) {
    return this.request({
      method: 'PUT',
      url: `/reservations/${id}`,
      data
    }, token);
  }

  async cancelReservation(id, token) {
    return this.request({
      method: 'DELETE',
      url: `/reservations/${id}`
    }, token);
  }
}

module.exports = new ApiClient();
