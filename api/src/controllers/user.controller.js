import { searchUsers } from "../services/user.service.js";

// Returns matching users for the navbar search modal.
export const searchUserList = async (req, res) => {
  const result = await searchUsers({
    currentUserId: req.user._id,
    query: req.query.q || ""
  });

  res.json({
    status: true,
    users: result.users
  });
};
