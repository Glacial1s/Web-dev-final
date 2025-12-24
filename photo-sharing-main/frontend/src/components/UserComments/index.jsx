import React from "react";
import { useEffect, useState } from "react";
import { Box, TextField, Typography, Paper } from "@mui/material";
import { Link, useParams } from "react-router-dom";
import fetchModel from "../../lib/fetchModelData";
import { serverUrl } from "../../config.api";

const UserComments = () => {
  const { userId } = useParams();
  const [comments, setComments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchModel("/photo/commentsOf/" + userId);
      setComments(Array.isArray(data) ? data : []);
    };
    fetchData();
  }, [userId]);

  useEffect(() => {
    const trimmed = searchTerm.trim();
    const handler = setTimeout(async () => {
      const endpoint = trimmed
        ? `/photo/commentsOf/${userId}?q=${encodeURIComponent(trimmed)}`
        : `/photo/commentsOf/${userId}`;
      const data = await fetchModel(endpoint);
      setComments(Array.isArray(data) ? data : []);
    }, 300);

    return () => clearTimeout(handler);
  }, [userId, searchTerm]);

  return (
    <div>
      <Box sx={{ p: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search comments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Box>
      {comments.length === 0 ? (
        <Typography variant="body2" sx={{ px: 2, py: 1 }}>
          No comments found.
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 2 }}>
          {comments.map((comment) => (
            <Paper
              key={comment._id}
              sx={{
                p: 2,
                border: "1px solid #e0e0e0",
                borderRadius: 2,
              }}
            >
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  {comment.comment}
                </Typography>
              </Box>
              <Box sx={{ pt: 1, borderTop: "1px solid #eeeeee" }}>
                {comment.photo_file_name && (
                  <Typography variant="caption" display="block" gutterBottom>
                    On post:{" "}
                    <Link to={`/photos/${comment.photo_user_id}`}>
                      {comment.photo_file_name}
                    </Link>
                  </Typography>
                )}
                {comment.photo_file_name && (
                  <img
                    src={serverUrl(`/images/${comment.photo_file_name}`)}
                    alt="Commented post"
                    style={{ maxWidth: "200px", display: "block" }}
                  />
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </div>
  );
};

export default UserComments;
