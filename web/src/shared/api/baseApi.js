import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQueryWithAuthGuard } from "./baseQueryWithAuthGuard.js";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuthGuard,
  tagTypes: ["Auth", "Conversation", "Message", "User"],
  endpoints: () => ({})
});
