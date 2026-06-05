import { User } from "../models/User.js";
import { serializeUser } from "../utils/serializeUser.js";

const defaultSearchLimit = 12;

// Escapes search input before using it inside MongoDB regex filters.
const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Searches users by name/email while excluding the authenticated user.
export const searchUsers = async ({ currentUserId, query }) => {
  const searchTerm = query.trim();

  if (!searchTerm) {
    return {
      users: []
    };
  }

  const searchRegex = new RegExp(escapeRegExp(searchTerm), "i");
  const users = await User.find({
    _id: {
      $ne: currentUserId
    },
    $or: [
      {
        name: searchRegex
      },
      {
        email: searchRegex
      }
    ]
  })
    .select("name email avatar isOnline lastSeen createdAt updatedAt")
    .sort({
      name: 1
    })
    .limit(defaultSearchLimit);

  return {
    users: users.map((user) => serializeUser(user))
  };
};
