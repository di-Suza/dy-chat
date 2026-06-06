import { selectCurrentUser } from "../../auth/model/authSlice.js";
import { baseApi } from "../../../shared/api/baseApi.js";

const getConversationSortTime = (conversation) => {
  return new Date(
    conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt
  ).getTime();
};

const sortConversations = (conversations) => {
  conversations.sort((left, right) => {
    return getConversationSortTime(right) - getConversationSortTime(left);
  });
};

export const upsertConversationInList = (draft, conversation) => {
  if (!draft?.conversations || !conversation?._id) {
    return;
  }

  const index = draft.conversations.findIndex(
    (item) => item._id === conversation._id
  );

  if (index >= 0) {
    draft.conversations[index] = conversation;
  } else {
    draft.conversations.unshift(conversation);
  }

  sortConversations(draft.conversations);
};

export const removeConversationFromList = (draft, conversationId) => {
  if (!draft?.conversations) {
    return;
  }

  draft.conversations = draft.conversations.filter(
    (conversation) => conversation._id !== conversationId
  );
};

const replaceMessageById = (draft, message) => {
  if (!draft?.messages) {
    return;
  }

  const index = draft.messages.findIndex((item) => item._id === message._id);

  if (index >= 0) {
    draft.messages[index] = message;
  }
};

const replaceMessageInList = (draft, tempId, message) => {
  if (!draft?.messages) {
    return;
  }

  const index = draft.messages.findIndex(
    (item) => item._id === tempId || item.clientTempId === tempId
  );

  if (index >= 0) {
    draft.messages[index] = message;
    return;
  }

  if (!draft.messages.some((item) => item._id === message._id)) {
    draft.messages.push(message);
  }
};

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query({
      query: () => ({
        url: "/conversations",
        method: "GET"
      }),
      providesTags: ["Conversation"]
    }),
    startDirectConversation: builder.mutation({
      query: (participantId) => ({
        url: "/conversations/direct",
        method: "POST",
        body: {
          participantId
        }
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          dispatch(
            chatApi.util.updateQueryData("getConversations", undefined, (draft) => {
              upsertConversationInList(draft, data.conversation);
            })
          );
        } catch (_error) {
          // Mutation error is surfaced by the generated hook state.
        }
      },
      invalidatesTags: ["Conversation"]
    }),
    createGroupConversation: builder.mutation({
      query: (formData) => ({
        url: "/conversations/groups",
        method: "POST",
        body: formData
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          dispatch(
            chatApi.util.updateQueryData("getConversations", undefined, (draft) => {
              upsertConversationInList(draft, data.conversation);
            })
          );
        } catch (_error) {
          // Mutation error is surfaced by the generated hook state.
        }
      },
      invalidatesTags: ["Conversation"]
    }),
    getMessages: builder.query({
      query: (conversationId) => ({
        url: `/conversations/${conversationId}/messages`,
        method: "GET"
      }),
      providesTags: (_result, _error, conversationId) => [
        {
          id: conversationId,
          type: "Message"
        }
      ]
    }),
    markConversationSeen: builder.mutation({
      query: (conversationId) => ({
        url: `/conversations/${conversationId}/seen`,
        method: "POST"
      }),
      async onQueryStarted(conversationId, { dispatch, getState, queryFulfilled }) {
        const user = selectCurrentUser(getState());
        const now = new Date().toISOString();
        const conversationPatch = dispatch(
          chatApi.util.updateQueryData("getConversations", undefined, (draft) => {
            const conversation = draft.conversations?.find(
              (item) => item._id === conversationId
            );

            if (conversation) {
              conversation.unreadCount = 0;
            }
          })
        );
        const messagePatch = dispatch(
          chatApi.util.updateQueryData("getMessages", conversationId, (draft) => {
            draft.messages?.forEach((message) => {
              const senderId = message.sender?._id || message.sender;
              const hasRead = message.readBy?.some(
                (receipt) => receipt.user === user?._id
              );

              if (senderId !== user?._id && !hasRead) {
                message.readBy = [
                  ...(message.readBy || []),
                  {
                    readAt: now,
                    user: user?._id
                  }
                ];
              }
            });
          })
        );

        try {
          await queryFulfilled;
        } catch (_error) {
          conversationPatch.undo();
          messagePatch.undo();
        }
      },
      invalidatesTags: ["Conversation"]
    }),
    sendMessage: builder.mutation({
      query: (payload) => ({
        url: "/messages",
        method: "POST",
        body: payload
      }),
      async onQueryStarted(payload, { dispatch, getState, queryFulfilled }) {
        const user = selectCurrentUser(getState());
        const createdAt = new Date().toISOString();
        const clientTempId = payload.clientTempId;
        const optimisticMessage = {
          _id: clientTempId,
          body: payload.body,
          clientTempId,
          conversation: payload.conversationId,
          createdAt,
          optimistic: true,
          readBy: [
            {
              readAt: createdAt,
              user: user?._id
            }
          ],
          sender: user,
          type: payload.type || "text",
          updatedAt: createdAt
        };
        const messagePatch = dispatch(
          chatApi.util.updateQueryData(
            "getMessages",
            payload.conversationId,
            (draft) => {
              if (!draft.messages) {
                draft.messages = [];
              }

              draft.messages.push(optimisticMessage);
            }
          )
        );
        const conversationPatch = dispatch(
          chatApi.util.updateQueryData("getConversations", undefined, (draft) => {
            const conversation = draft.conversations?.find(
              (item) => item._id === payload.conversationId
            );

            if (!conversation) {
              return;
            }

            conversation.lastMessage = optimisticMessage;
            conversation.lastMessageAt = createdAt;
            conversation.lastMessagePreview = payload.body;
            conversation.lastMessageSender = user?._id;
            conversation.unreadCount = 0;
            sortConversations(draft.conversations);
          })
        );

        try {
          const { data } = await queryFulfilled;

          dispatch(
            chatApi.util.updateQueryData(
              "getMessages",
              payload.conversationId,
              (draft) => {
                replaceMessageInList(draft, clientTempId, data.message);
              }
            )
          );
          dispatch(
            chatApi.util.updateQueryData("getConversations", undefined, (draft) => {
              upsertConversationInList(draft, data.conversation);
            })
          );
        } catch (_error) {
          messagePatch.undo();
          conversationPatch.undo();
        }
      }
    }),
    leaveGroupConversation: builder.mutation({
      query: (conversationId) => ({
        url: `/conversations/${conversationId}/leave`,
        method: "POST"
      }),
      async onQueryStarted(conversationId, { dispatch, queryFulfilled }) {
        const conversationPatch = dispatch(
          chatApi.util.updateQueryData("getConversations", undefined, (draft) => {
            removeConversationFromList(draft, conversationId);
          })
        );

        try {
          await queryFulfilled;
        } catch (_error) {
          conversationPatch.undo();
        }
      },
      invalidatesTags: ["Conversation"]
    }),
    updateGroupConversation: builder.mutation({
      query: ({ conversationId, formData }) => ({
        url: `/conversations/${conversationId}/group`,
        method: "PATCH",
        body: formData
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          dispatch(
            chatApi.util.updateQueryData("getConversations", undefined, (draft) => {
              upsertConversationInList(draft, data.conversation);
            })
          );
        } catch (_error) {
          // Mutation error is surfaced by the generated hook state.
        }
      }
    }),
    addGroupMembers: builder.mutation({
      query: ({ conversationId, participantIds }) => ({
        url: `/conversations/${conversationId}/members`,
        method: "POST",
        body: {
          participantIds
        }
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          dispatch(
            chatApi.util.updateQueryData("getConversations", undefined, (draft) => {
              upsertConversationInList(draft, data.conversation);
            })
          );
        } catch (_error) {
          // Mutation error is surfaced by the generated hook state.
        }
      }
    }),
    removeGroupMember: builder.mutation({
      query: ({ conversationId, memberId }) => ({
        url: `/conversations/${conversationId}/members/${memberId}`,
        method: "DELETE"
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          dispatch(
            chatApi.util.updateQueryData("getConversations", undefined, (draft) => {
              upsertConversationInList(draft, data.conversation);
            })
          );
        } catch (_error) {
          // Mutation error is surfaced by the generated hook state.
        }
      }
    }),
    deleteGroupConversation: builder.mutation({
      query: (conversationId) => ({
        url: `/conversations/${conversationId}/group`,
        method: "DELETE"
      }),
      async onQueryStarted(conversationId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          chatApi.util.updateQueryData("getConversations", undefined, (draft) => {
            removeConversationFromList(draft, conversationId);
          })
        );

        try {
          await queryFulfilled;
        } catch (_error) {
          patch.undo();
        }
      }
    }),
    deleteMessage: builder.mutation({
      query: (messageId) => ({
        url: `/messages/${messageId}`,
        method: "DELETE"
      }),
      async onQueryStarted(messageId, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const conversationId = data.message?.conversation;

          if (conversationId) {
            dispatch(
              chatApi.util.updateQueryData("getMessages", conversationId, (draft) => {
                replaceMessageById(draft, data.message);
              })
            );
          }
        } catch (_error) {
          // Mutation error is surfaced by the generated hook state.
        }
      }
    })
  })
});

export const {
  useAddGroupMembersMutation,
  useCreateGroupConversationMutation,
  useDeleteGroupConversationMutation,
  useDeleteMessageMutation,
  useGetConversationsQuery,
  useGetMessagesQuery,
  useLeaveGroupConversationMutation,
  useMarkConversationSeenMutation,
  useRemoveGroupMemberMutation,
  useSendMessageMutation,
  useStartDirectConversationMutation,
  useUpdateGroupConversationMutation
} = chatApi;
