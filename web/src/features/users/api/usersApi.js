import { baseApi } from "../../../shared/api/baseApi.js";

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    searchUsers: builder.query({
      query: (query) => ({
        url: "/users/search",
        method: "GET",
        params: {
          q: query
        }
      }),
      providesTags: ["User"]
    })
  })
});

export const { useSearchUsersQuery } = usersApi;
