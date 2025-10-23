import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  Alert,
} from "@mui/material";
import { Add as AddIcon, Message as MessageIcon } from "@mui/icons-material";
import { api } from "../services/api";
import { Queue } from "../types/queue";
import { config } from "../config/env";

export default function QueueDashboard() {
  const navigate = useNavigate();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    loadQueues();
  }, []);

  const loadQueues = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getQueues();
      setQueues(data);
    } catch (err) {
      setError("Failed to load queues");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQueue = async () => {
    if (!newQueueName.trim()) {
      setCreateError("Queue name is required");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(newQueueName)) {
      setCreateError(
        "Queue name can only contain letters, numbers, hyphens, and underscores"
      );
      return;
    }

    try {
      setCreateError(null);
      await api.createQueue(newQueueName);
      setOpenDialog(false);
      setNewQueueName("");
      await loadQueues();
    } catch (err) {
      setCreateError("Failed to create queue");
      console.error(err);
    }
  };

  const handleQueueClick = (queueName: string) => {
    navigate(`/queue/${queueName}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            Message Queues
          </Typography>
          {config.useMockData && (
            <Chip label="Mock Mode" color="warning" size="small" />
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create Queue
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography>Loading queues...</Typography>
      ) : queues.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <MessageIcon sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No queues yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Create your first queue to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Create Queue
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {queues.map((queue) => (
            <Grid item xs={12} sm={6} md={4} key={queue.name}>
              <Card>
                <CardActionArea onClick={() => handleQueueClick(queue.name)}>
                  <CardContent>
                    <Typography variant="h5" component="h2" gutterBottom>
                      {queue.name}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 1 }}>
                      {queue.messageCount} message
                      {queue.messageCount !== 1 ? "s" : ""}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Created: {new Date(queue.createdAt).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Queue</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Queue Name"
            fullWidth
            variant="outlined"
            value={newQueueName}
            onChange={(e) => setNewQueueName(e.target.value)}
            error={!!createError}
            helperText={
              createError ||
              "Use letters, numbers, hyphens, and underscores only"
            }
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleCreateQueue();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateQueue} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
