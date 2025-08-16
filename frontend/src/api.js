// src/api.js
import axios from "axios";

export const API_URL = "https://lupi-backend.onrender.com/api"; // cambia con tu URL en Render

const api = axios.create({
  baseURL: API_URL,
});

export default api;