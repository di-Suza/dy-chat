import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  activeConversationId: null,
  typingByConversation: {}
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    clearTypingUser(state, action) {
      const { conversationId, userId } = action.payload;

      if (!state.typingByConversation[conversationId]) {
        return;
      }

      delete state.typingByConversation[conversationId][userId];
    },
    setActiveConversationId(state, action) {
      state.activeConversationId = action.payload;
    },
    setTypingUser(state, action) {
      const { conversationId, user } = action.payload;

      if (!state.typingByConversation[conversationId]) {
        state.typingByConversation[conversationId] = {};
      }

      state.typingByConversation[conversationId][user._id] = user;
    }
  }
});

export const { clearTypingUser, setActiveConversationId, setTypingUser } =
  chatSlice.actions;

export const chatReducer = chatSlice.reducer;

export const selectActiveConversationId = (state) =>
  state.chat.activeConversationId;

export const selectTypingUsersByConversation = (state) =>
  state.chat.typingByConversation;
