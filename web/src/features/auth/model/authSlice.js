import { createSlice } from "@reduxjs/toolkit";

import { authApi } from "../api/authApi.js";

const initialState = {
  user: null,
  status: "idle",
  isLoggedOut: false
};

const getUserFromPayload = (payload) => payload?.user ?? payload?.data?.user ?? null;

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearUser(state) {
      state.user = null;
      state.status = "failed";
      state.isLoggedOut = true;
    },
    setUser(state, action) {
      state.user = getUserFromPayload(action.payload);
      state.status = "succeeded";
      state.isLoggedOut = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(authApi.endpoints.getMe.matchPending, (state) => {
        state.status = "loading";
      })
      .addMatcher(authApi.endpoints.getMe.matchFulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = getUserFromPayload(action.payload);
        state.isLoggedOut = false;
      })
      .addMatcher(authApi.endpoints.getMe.matchRejected, (state) => {
        state.status = "failed";
        state.user = null;
        state.isLoggedOut = true;
      })
      .addMatcher(authApi.endpoints.login.matchFulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = getUserFromPayload(action.payload);
        state.isLoggedOut = false;
      })
      .addMatcher(authApi.endpoints.register.matchFulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = getUserFromPayload(action.payload);
        state.isLoggedOut = false;
      })
      .addMatcher(authApi.endpoints.updateProfile.matchFulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = getUserFromPayload(action.payload);
        state.isLoggedOut = false;
      })
      .addMatcher(authApi.endpoints.updatePassword.matchFulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = getUserFromPayload(action.payload);
        state.isLoggedOut = false;
      })
      .addMatcher(authApi.endpoints.updateAvatar.matchFulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = getUserFromPayload(action.payload);
        state.isLoggedOut = false;
      })
      .addMatcher(authApi.endpoints.removeAvatar.matchFulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = getUserFromPayload(action.payload);
        state.isLoggedOut = false;
      })
      .addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
        state.user = null;
        state.status = "failed";
        state.isLoggedOut = true;
      })
      .addMatcher(authApi.endpoints.logoutAll.matchFulfilled, (state) => {
        state.user = null;
        state.status = "failed";
        state.isLoggedOut = true;
      });
  }
});

export const { clearUser, setUser } = authSlice.actions;

export const authReducer = authSlice.reducer;

export const selectAuth = (state) => state.auth;
export const selectAuthStatus = (state) => state.auth.status;
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsLoggedOut = (state) => state.auth.isLoggedOut;
