import React, { useState, useEffect } from "react";
import {
  Divider,
  List,
  ListItem,
  ListItemText,
  TextField,
  Box,
  Typography,
  Button,
} from "@mui/material";
import { Link } from "react-router-dom";
import fetchModel from "../../lib/fetchModelData";

import "./styles.css";

/**
 * Define UserList, a React component of Project 4.
 */
function UserList() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchModel("/user/list");
      setUsers(Array.isArray(data) ? data : []);
    };
    fetchData();
  }, []);


  useEffect(() => {
    const trimmed = searchTerm.trim();
    const handler = setTimeout(async () => {
      const endpoint = trimmed
        ? `/user/search?q=${encodeURIComponent(trimmed)}`
        : "/user/list";
      const data = await fetchModel(endpoint);
      setUsers(Array.isArray(data) ? data : []);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  return (
    <div>
      <Box sx={{ p: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Box>
      <List component="nav">
        {users.length === 0 ? (
          <Typography variant="body2" sx={{ px: 2, py: 1 }}>
            No users found.
          </Typography>
        ) : (
          users.map((item) => (
            <React.Fragment key={item._id}>
              <ListItem component={Link} to={`/users/${item._id}`}>
                <ListItemText
                  primary={`${item.first_name} ${item.last_name}`}
                  secondary={`${item.photo_count || 0} photos, ${
                    item.comment_count || 0
                  } comments`}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))
        )}
      </List>
    </div>
  );
}

export default UserList;
