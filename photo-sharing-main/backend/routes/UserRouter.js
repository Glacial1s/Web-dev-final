const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../db/userModel");
const router = express.Router();
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildUsersWithStats = async (users, friendIds = []) => {
  const Photo = require("../db/photoModel");
  const allPhotos = await Photo.find({})
    .select("user_id comments")
    .exec();
  const photoCountByUser = {};
  const commentCountByUser = {};

  allPhotos.forEach((photo) => {
    const photoUserId = photo.user_id?.toString();
    if (photoUserId) {
      photoCountByUser[photoUserId] =
        (photoCountByUser[photoUserId] || 0) + 1;
    }
    photo.comments?.forEach((comment) => {
      const commentUserId = comment.user_id?.toString();
      if (commentUserId) {
        commentCountByUser[commentUserId] =
          (commentCountByUser[commentUserId] || 0) + 1;
      }
    });
  });

  return users.map((user) => {
    const userId = user._id.toString();
    return {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      photo_count: photoCountByUser[userId] || 0,
      comment_count: commentCountByUser[userId] || 0,
      is_friend: friendIds.some((friendId) => friendId.toString() === userId),
    };
  });
};

// Authentication middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user_id = decoded.user_id;
    req.login_name = decoded.login_name;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// GET /user/list - Return list of users for navigation sidebar
router.get("/list", requireAuth, async (request, response) => {
  try {
    const currentUser = await User.findById(request.user_id)
      .select("friends")
      .exec();
    const friendIds = currentUser?.friends || [];
    const users = await User.find({}).select("_id first_name last_name").exec();
    const usersWithStats = await buildUsersWithStats(users, friendIds);

    response.status(200).json(usersWithStats);
  } catch (error) {
    console.error("Error fetching user list:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

// GET /user/search?q=... - Search users by name or login
router.get("/search", requireAuth, async (request, response) => {
  const query = (request.query.q || "").trim();
  if (!query) {
    return response.status(200).json([]);
  }

  try {
    const currentUser = await User.findById(request.user_id)
      .select("friends")
      .exec();
    const friendIds = currentUser?.friends || [];
    const regex = new RegExp(escapeRegExp(query), "i");
    const users = await User.find({
      $or: [{ first_name: regex }, { last_name: regex }, { login_name: regex }],
    })
      .select("_id first_name last_name")
      .exec();
    const usersWithStats = await buildUsersWithStats(users, friendIds);

    response.status(200).json(usersWithStats);
  } catch (error) {
    console.error("Error searching users:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

// POST /user/:id/friend-request - Send or cancel friend request
router.post("/:id/friend-request", requireAuth, async (request, response) => {
  const targetId = request.params.id;
  const userId = request.user_id;

  if (targetId === userId) {
    return response.status(400).json({ error: "Cannot friend yourself" });
  }

  try {
    const [currentUser, targetUser] = await Promise.all([
      User.findById(userId).exec(),
      User.findById(targetId).exec(),
    ]);

    if (!currentUser || !targetUser) {
      return response.status(400).json({ error: "User not found" });
    }

    currentUser.friends = currentUser.friends || [];
    targetUser.friends = targetUser.friends || [];
    currentUser.friend_requests_sent = currentUser.friend_requests_sent || [];
    currentUser.friend_requests_received =
      currentUser.friend_requests_received || [];
    targetUser.friend_requests_sent = targetUser.friend_requests_sent || [];
    targetUser.friend_requests_received =
      targetUser.friend_requests_received || [];

    const isFriend = currentUser.friends.some(
      (friendId) => friendId.toString() === targetId
    );
    if (isFriend) {
      return response.status(400).json({ error: "Already friends" });
    }

    const alreadyRequested = currentUser.friend_requests_sent.some(
      (requestId) => requestId.toString() === targetId
    );

    if (alreadyRequested) {
      currentUser.friend_requests_sent =
        currentUser.friend_requests_sent.filter(
          (requestId) => requestId.toString() !== targetId
        );
      targetUser.friend_requests_received =
        targetUser.friend_requests_received.filter(
          (requestId) => requestId.toString() !== userId
        );
    } else {
      currentUser.friend_requests_sent.push(targetId);
      targetUser.friend_requests_received.push(userId);
    }

    await Promise.all([currentUser.save(), targetUser.save()]);

    return response.status(200).json({
      requested: !alreadyRequested,
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return response.status(400).json({ error: "Error sending friend request" });
  }
});

// POST /user/:id/friend-accept - Accept friend request
router.post("/:id/friend-accept", requireAuth, async (request, response) => {
  const targetId = request.params.id;
  const userId = request.user_id;

  if (targetId === userId) {
    return response.status(400).json({ error: "Invalid user" });
  }

  try {
    const [currentUser, targetUser] = await Promise.all([
      User.findById(userId).exec(),
      User.findById(targetId).exec(),
    ]);

    if (!currentUser || !targetUser) {
      return response.status(400).json({ error: "User not found" });
    }

    currentUser.friends = currentUser.friends || [];
    targetUser.friends = targetUser.friends || [];
    currentUser.friend_requests_received =
      currentUser.friend_requests_received || [];
    targetUser.friend_requests_sent = targetUser.friend_requests_sent || [];

    const hasIncoming = currentUser.friend_requests_received.some(
      (requestId) => requestId.toString() === targetId
    );
    if (!hasIncoming) {
      return response.status(400).json({ error: "No pending request" });
    }

    currentUser.friend_requests_received =
      currentUser.friend_requests_received.filter(
        (requestId) => requestId.toString() !== targetId
      );
    targetUser.friend_requests_sent = targetUser.friend_requests_sent.filter(
      (requestId) => requestId.toString() !== userId
    );

    if (
      !currentUser.friends.some(
        (friendId) => friendId.toString() === targetId
      )
    ) {
      currentUser.friends.push(targetId);
    }
    if (
      !targetUser.friends.some((friendId) => friendId.toString() === userId)
    ) {
      targetUser.friends.push(userId);
    }

    await Promise.all([currentUser.save(), targetUser.save()]);

    return response.status(200).json({
      is_friend: true,
      friend_count: targetUser.friends.length,
    });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return response.status(400).json({ error: "Error accepting request" });
  }
});

// POST /user/:id/friend-reject - Reject friend request
router.post("/:id/friend-reject", requireAuth, async (request, response) => {
  const targetId = request.params.id;
  const userId = request.user_id;

  if (targetId === userId) {
    return response.status(400).json({ error: "Invalid user" });
  }

  try {
    const [currentUser, targetUser] = await Promise.all([
      User.findById(userId).exec(),
      User.findById(targetId).exec(),
    ]);

    if (!currentUser || !targetUser) {
      return response.status(400).json({ error: "User not found" });
    }

    currentUser.friend_requests_received =
      currentUser.friend_requests_received || [];
    targetUser.friend_requests_sent = targetUser.friend_requests_sent || [];

    currentUser.friend_requests_received =
      currentUser.friend_requests_received.filter(
        (requestId) => requestId.toString() !== targetId
      );
    targetUser.friend_requests_sent = targetUser.friend_requests_sent.filter(
      (requestId) => requestId.toString() !== userId
    );

    await Promise.all([currentUser.save(), targetUser.save()]);

    return response.status(200).json({ rejected: true });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return response.status(400).json({ error: "Error rejecting request" });
  }
});

// POST /user/:id/unfriend - Remove friend
router.post("/:id/unfriend", requireAuth, async (request, response) => {
  const targetId = request.params.id;
  const userId = request.user_id;

  if (targetId === userId) {
    return response.status(400).json({ error: "Invalid user" });
  }

  try {
    const [currentUser, targetUser] = await Promise.all([
      User.findById(userId).exec(),
      User.findById(targetId).exec(),
    ]);

    if (!currentUser || !targetUser) {
      return response.status(400).json({ error: "User not found" });
    }

    currentUser.friends = currentUser.friends || [];
    targetUser.friends = targetUser.friends || [];

    currentUser.friends = currentUser.friends.filter(
      (friendId) => friendId.toString() !== targetId
    );
    targetUser.friends = targetUser.friends.filter(
      (friendId) => friendId.toString() !== userId
    );

    await Promise.all([currentUser.save(), targetUser.save()]);

    return response.status(200).json({
      is_friend: false,
      friend_count: targetUser.friends.length,
    });
  } catch (error) {
    console.error("Error removing friend:", error);
    return response.status(400).json({ error: "Error removing friend" });
  }
});

// GET /user/:id/requests - List incoming friend requests (self only)
router.get("/:id/requests", requireAuth, async (request, response) => {
  const userId = request.params.id;

  if (userId !== request.user_id) {
    return response.status(403).json({ error: "Forbidden" });
  }

  try {
    const user = await User.findById(userId)
      .select("friend_requests_received")
      .exec();
    if (!user) {
      return response.status(400).json({ error: "User not found" });
    }

    const requestIds = user.friend_requests_received || [];
    if (requestIds.length === 0) {
      return response.status(200).json([]);
    }

    const users = await User.find({ _id: { $in: requestIds } })
      .select("_id first_name last_name")
      .exec();

    return response.status(200).json(users);
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    return response.status(400).json({ error: "Error fetching requests" });
  }
});

// GET /user/:id/friends - List friends (self only)
router.get("/:id/friends", requireAuth, async (request, response) => {
  const userId = request.params.id;

  if (userId !== request.user_id) {
    return response.status(403).json({ error: "Forbidden" });
  }

  try {
    const user = await User.findById(userId).select("friends").exec();
    if (!user) {
      return response.status(400).json({ error: "User not found" });
    }

    const friendIds = user.friends || [];
    if (friendIds.length === 0) {
      return response.status(200).json([]);
    }

    const friends = await User.find({ _id: { $in: friendIds } })
      .select("_id first_name last_name")
      .exec();

    return response.status(200).json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    return response.status(400).json({ error: "Error fetching friends" });
  }
});

// GET /user/:id - Return detailed information of a specific user
router.get("/:id", requireAuth, async (request, response) => {
  const userId = request.params.id;

  try {
    const Photo = require("../db/photoModel");
    const user = await User.findById(userId).select("-password");

    if (!user) {
      response.status(400).json({ error: "User not found" });
      return;
    }

    const photos = await Photo.find({ user_id: userId }).exec();
    const photoCount = photos.length;

    let commentCount = 0;
    const allPhotos = await Photo.find({}).exec();
    allPhotos.forEach((photo) => {
      photo.comments.forEach((comment) => {
        if (comment.user_id.toString() === userId) {
          commentCount++;
        }
      });
    });

    const userWithStats = {
      ...user.toObject(),
      photo_count: photoCount,
      comment_count: commentCount,
      friend_count: (user.friends || []).length,
      is_friend: (user.friends || []).some(
        (friendId) => friendId.toString() === request.user_id
      ),
      has_incoming_request: (user.friend_requests_sent || []).some(
        (requestId) => requestId.toString() === request.user_id
      ),
      has_pending_request: (user.friend_requests_received || []).some(
        (requestId) => requestId.toString() === request.user_id
      ),
    };

    response.status(200).json(userWithStats);
  } catch (error) {
    console.error("Error fetching user:", error);
    response.status(400).json({ error: "Invalid user ID" });
  }
});

// PUT /user/:id - Update user profile (self only)
router.put("/:id", requireAuth, async (request, response) => {
  const userId = request.params.id;

  if (userId !== request.user_id) {
    return response.status(403).json({ error: "Forbidden" });
  }

  const { first_name, last_name, location, description, occupation } =
    request.body;

  if (!first_name || !last_name) {
    return response.status(400).json({
      error: "first_name and last_name are required",
    });
  }

  if (first_name.trim() === "" || last_name.trim() === "") {
    return response.status(400).json({
      error: "first_name and last_name must be non-empty",
    });
  }

  try {
    const user = await User.findById(userId).exec();
    if (!user) {
      return response.status(400).json({ error: "User not found" });
    }

    user.first_name = first_name.trim();
    user.last_name = last_name.trim();
    user.location = location || "";
    user.description = description || "";
    user.occupation = occupation || "";

    await user.save();

    response.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    response.status(400).json({ error: "Error updating user" });
  }
});

// POST /user - Register a new user
router.post("/", async (request, response) => {
  const {
    login_name,
    password,
    first_name,
    last_name,
    location,
    description,
    occupation,
  } = request.body;

  // Validate required fields
  if (!login_name || !password || !first_name || !last_name) {
    return response.status(400).json({
      error: "login_name, password, first_name, and last_name are required",
    });
  }

  // Check if fields are non-empty strings
  if (
    login_name.trim() === "" ||
    password.trim() === "" ||
    first_name.trim() === "" ||
    last_name.trim() === ""
  ) {
    return response.status(400).json({
      error:
        "login_name, password, first_name, and last_name must be non-empty",
    });
  }

  try {
    // Check if login_name already exists
    const existingUser = await User.findOne({ login_name }).exec();
    if (existingUser) {
      return response.status(400).json({ error: "login_name already exists" });
    }

    // Create new user (in production, hash the password with bcrypt)
    const newUser = new User({
      login_name,
      password,
      first_name,
      last_name,
      location: location || "",
      description: description || "",
      occupation: occupation || "",
      friends: [],
      friend_requests_received: [],
      friend_requests_sent: [],
    });

    await newUser.save();

    // Return login_name as required by tests
    response.status(200).json({ login_name: newUser.login_name });
  } catch (error) {
    console.error("Error creating user:", error);
    response.status(400).json({ error: "Error creating user" });
  }
});

module.exports = router;
