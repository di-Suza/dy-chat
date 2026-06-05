import { baseApi } from "../../../shared/api/baseApi.js";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials
      }),
      invalidatesTags: ["Auth"]
    }),
    register: builder.mutation({
      query: (payload) => ({
        url: "/auth/register",
        method: "POST",
        body: payload
      }),
      invalidatesTags: ["Auth"]
    }),
    getMe: builder.query({
      query: () => ({
        url: "/auth/me",
        method: "GET"
      }),
      providesTags: ["Auth"]
    }),
    updateProfile: builder.mutation({
      query: (payload) => ({
        url: "/auth/profile",
        method: "PATCH",
        body: payload
      }),
      invalidatesTags: ["Auth"]
    }),
    updatePassword: builder.mutation({
      query: (payload) => ({
        url: "/auth/password",
        method: "PATCH",
        body: payload
      }),
      invalidatesTags: ["Auth"]
    }),
    updateAvatar: builder.mutation({
      query: (payload) => ({
        url: "/auth/avatar",
        method: "PATCH",
        body: payload
      }),
      invalidatesTags: ["Auth"]
    }),
    removeAvatar: builder.mutation({
      query: () => ({
        url: "/auth/avatar",
        method: "DELETE"
      }),
      invalidatesTags: ["Auth"]
    }),
    logout: builder.mutation({
      query: () => ({
        url: "/auth/logout",
        method: "POST"
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(baseApi.util.resetApiState());
        }
      },
      invalidatesTags: ["Auth"]
    }),
    logoutAll: builder.mutation({
      query: () => ({
        url: "/auth/logout-all",
        method: "POST"
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(baseApi.util.resetApiState());
        }
      },
      invalidatesTags: ["Auth"]
    })
  })
});

export const {
  useGetMeQuery,
  useLoginMutation,
  useLogoutAllMutation,
  useLogoutMutation,
  useRemoveAvatarMutation,
  useRegisterMutation,
  useUpdateAvatarMutation,
  useUpdatePasswordMutation,
  useUpdateProfileMutation
} = authApi;
