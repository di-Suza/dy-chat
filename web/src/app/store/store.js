import { configureStore } from "@reduxjs/toolkit";

import { authReducer } from "../../features/auth/model/authSlice.js";
import { baseApi } from "../../shared/api/baseApi.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware)
});

