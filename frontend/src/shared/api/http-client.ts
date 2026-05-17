import axios from 'axios';

export const httpClient = axios.create({
  baseURL: '/',
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});
