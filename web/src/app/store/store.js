import { configureStore } from "@reduxjs/toolkit";

import { authReducer } from "../../features/auth/model/authSlice.js";
import { chatReducer } from "../../features/chat/model/chatSlice.js";
import { baseApi } from "../../shared/api/baseApi.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    [baseApi.reducerPath]: baseApi.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware)
});
