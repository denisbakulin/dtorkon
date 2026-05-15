import axios from 'axios';

export const httpClient = axios.create({
  baseURL: '/',
  timeout: 5000,
  headers: {
    Accept: 'application/json',
  },
});

