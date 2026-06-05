import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const baseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  credentials: "include"
});

