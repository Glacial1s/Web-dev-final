import React, { useState, useEffect } from "react";
import { Typography, Paper, Button, Box } from "@mui/material";
import { Link, useParams } from "react-router-dom";
import fetchModel from "../../lib/fetchModelData";
import { apiUrl } from "../../config.api";

import "./styles.css";

/**
 * Define UserDetail, a React component of Project 4.
 */
function UserDetail() {
  const { userId } = useParams();
  const [user, setUser] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchModel("/user/" + userId);
      setUser(data);
    };
    fetchData();
  }, [userId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCurrentUserId(null);
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setCurrentUserId(payload.user_id);
    } catch (error) {
      setCurrentUserId(null);
    }
  }, []);

  if (!user) {
    return <Typography>User not found!</Typography>;
  }

  const handleSendRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/user/${userId}/friend-request`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        setUser((prev) => ({
          ...prev,
          has_pending_request: data.requested,
        }));
      } else {
        const data = await response.json();
        setSaveError(data.error || "Friend request failed.");
      }
    } catch (error) {
      setSaveError("Friend request failed.");
    }
  };

  const handleUnfriend = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/user/${userId}/unfriend`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        setUser((prev) => ({
          ...prev,
          is_friend: data.is_friend,
          friend_count: data.friend_count,
        }));
      } else {
        const data = await response.json();
        setSaveError(data.error || "Unfriend failed.");
      }
    } catch (error) {
      setSaveError("Unfriend failed.");
    }
  };

  const isOwner = currentUserId && currentUserId === userId;
  const isFriend = !!user.is_friend;
  const hasIncomingRequest = !!user.has_incoming_request;
  const hasPendingRequest = !!user.has_pending_request;

  return (
    <Paper style={{ padding: 16 }}>
      <Box>
        <Typography variant="h4">
          {user.first_name} {user.last_name}
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {user.photo_count || 0} photos ???{" "}
          <Link to={`/commentsOf/${user._id}`}>
            {user.comment_count || 0} comments
          </Link>
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Friends:</strong> {user.friend_count || 0}
        </Typography>
        <Typography variant="body1">
          <strong>Location:</strong> {user.location}
        </Typography>
        <Typography variant="body1">
          <strong>Description:</strong> {user.description}
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Occupation:</strong> {user.occupation}
        </Typography>

        {saveError && (
          <Typography color="error" variant="body2">
            {saveError}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to={`/photos/${user._id}`}
          >
            View Photos
          </Button>
          {isOwner && (
            <Button variant="outlined" component={Link} to="/profile">
              View Profile
            </Button>
          )}
          {!isOwner && !isFriend && !hasIncomingRequest && (
            <Button variant="outlined" onClick={handleSendRequest}>
              {hasPendingRequest ? "Cancel Request" : "Add Friend"}
            </Button>
          )}
          {!isOwner && isFriend && (
            <Button variant="outlined" onClick={handleUnfriend}>
              Unfriend
            </Button>
          )}
          {!isOwner && hasIncomingRequest && !isFriend && (
            <Typography variant="body2" sx={{ alignSelf: "center" }}>
              Request pending - manage in View Profile
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

export default UserDetail;
