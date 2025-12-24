import React, { useEffect, useState } from "react";
import { Typography, Paper, Button, TextField, Box } from "@mui/material";
import { Link } from "react-router-dom";
import { apiUrl } from "../../config.api";
import fetchModel from "../../lib/fetchModelData";

function ViewProfile() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    location: "",
    description: "",
    occupation: "",
  });
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

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

  const loadProfile = async () => {
    if (!currentUserId) return;
    const data = await fetchModel("/user/" + currentUserId);
    setUser(data);
  };

  const loadRequests = async () => {
    if (!currentUserId) return;
    const data = await fetchModel(`/user/${currentUserId}/requests`);
    setRequests(Array.isArray(data) ? data : []);
  };

  const loadFriends = async () => {
    if (!currentUserId) return;
    const data = await fetchModel(`/user/${currentUserId}/friends`);
    setFriends(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadProfile();
    loadRequests();
    loadFriends();
  }, [currentUserId]);

  useEffect(() => {
    if (!user) return;
    setForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      location: user.location || "",
      description: user.description || "",
      occupation: user.occupation || "",
    });
  }, [user]);

  if (!user) {
    return <Typography>Loading...</Typography>;
  }

  const handleSave = async () => {
    setSaveError("");
    setSaveSuccess("");

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setSaveError("First name and last name are required.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/user/${currentUserId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          location: form.location,
          description: form.description,
          occupation: form.occupation,
        }),
      });

      if (response.status === 200) {
        setSaveSuccess("Updated successfully.");
        setIsEditing(false);
        setUser({ ...user, ...form });
      } else {
        const data = await response.json();
        setSaveError(data.error || "Update failed.");
      }
    } catch (error) {
      setSaveError("Update failed.");
    }
  };

  const handleAccept = async (requestUserId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        apiUrl(`/user/${requestUserId}/friend-accept`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        await loadProfile();
        await loadRequests();
        await loadFriends();
      } else {
        const data = await response.json();
        setSaveError(data.error || "Accept failed.");
      }
    } catch (error) {
      setSaveError("Accept failed.");
    }
  };

  const handleReject = async (requestUserId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        apiUrl(`/user/${requestUserId}/friend-reject`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        await loadRequests();
      } else {
        const data = await response.json();
        setSaveError(data.error || "Reject failed.");
      }
    } catch (error) {
      setSaveError("Reject failed.");
    }
  };

  const handleUnfriend = async (friendId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/user/${friendId}/unfriend`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        await loadProfile();
        await loadFriends();
      } else {
        const data = await response.json();
        setSaveError(data.error || "Unfriend failed.");
      }
    } catch (error) {
      setSaveError("Unfriend failed.");
    }
  };

  return (
    <Paper style={{ padding: 16 }}>
      {isEditing ? (
        <Box>
          <Typography variant="h4" gutterBottom>
            Edit Profile
          </Typography>
          <TextField
            fullWidth
            label="First Name"
            margin="normal"
            value={form.first_name}
            onChange={(e) =>
              setForm({ ...form, first_name: e.target.value })
            }
          />
          <TextField
            fullWidth
            label="Last Name"
            margin="normal"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
          <TextField
            fullWidth
            label="Location"
            margin="normal"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <TextField
            fullWidth
            label="Description"
            margin="normal"
            multiline
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
          <TextField
            fullWidth
            label="Occupation"
            margin="normal"
            value={form.occupation}
            onChange={(e) =>
              setForm({ ...form, occupation: e.target.value })
            }
          />
          {saveError && (
            <Typography color="error" variant="body2">
              {saveError}
            </Typography>
          )}
          {saveSuccess && (
            <Typography color="primary" variant="body2">
              {saveSuccess}
            </Typography>
          )}
          <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
            <Button variant="contained" onClick={handleSave}>
              Save
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setIsEditing(false);
                setSaveError("");
                setSaveSuccess("");
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      ) : (
        <Box>
          <Typography variant="h4">
            {user.first_name} {user.last_name}
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {user.photo_count || 0} photos -{" "}
            <Link to={`/commentsOf/${user._id}`}>
              {user.comment_count || 0} comments
            </Link>
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
          <Typography variant="body1" gutterBottom>
            <strong>Friends:</strong> {user.friend_count || 0}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          </Box>
        </Box>
      )}

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Friend Requests
        </Typography>
        {requests.length === 0 ? (
          <Typography variant="body2">No pending requests.</Typography>
        ) : (
          requests.map((requestUser) => (
            <Box
              key={requestUser._id}
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
            >
              <Typography variant="body2">
                {requestUser.first_name} {requestUser.last_name}
              </Typography>
              <Button
                size="small"
                variant="contained"
                onClick={() => handleAccept(requestUser._id)}
              >
                Accept
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleReject(requestUser._id)}
              >
                Reject
              </Button>
            </Box>
          ))
        )}
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Friends
        </Typography>
        {friends.length === 0 ? (
          <Typography variant="body2">No friends yet.</Typography>
        ) : (
          friends.map((friend) => (
            <Box
              key={friend._id}
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
            >
              <Typography variant="body2">
                {friend.first_name} {friend.last_name}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleUnfriend(friend._id)}
              >
                Unfriend
              </Button>
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
}

export default ViewProfile;
