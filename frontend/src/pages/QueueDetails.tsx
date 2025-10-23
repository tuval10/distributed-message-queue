import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  GetApp as GetAppIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { api } from "../services/api";
import { Message } from "../types/queue";
import { config } from "../config/env";

export default function QueueDetails() {
  const { queueName } = useParams<{ queueName: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [consuming, setConsuming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [queueDepth, setQueueDepth] = useState<number>(0);
  const [consumedMessage, setConsumedMessage] = useState<Message | null>(null);
  const [showConsumedDialog, setShowConsumedDialog] = useState(false);
  const [peekCount, setPeekCount] = useState<number>(20);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (queueName) {
      loadMessages();
      loadQueueDepth();
    }
  }, [queueName]);

  const loadMessages = async () => {
    if (!queueName) return;

    try {
      setLoadingMessages(true);
      const data = await api.peekMessages(queueName, peekCount);
      setMessages(data);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadQueueDepth = async () => {
    if (!queueName) return;

    try {
      const depth = await api.getQueueDepth(queueName);
      setQueueDepth(depth);
    } catch (err) {
      console.error("Failed to load queue depth:", err);
    }
  };

  const handleSendMessage = async () => {
    if (!queueName || !messageContent.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Send as plain text
      await api.enqueueMessage(queueName, messageContent.trim());
      setSuccess("Message sent successfully");
      setMessageContent("");
      await loadMessages();
      await loadQueueDepth();
    } catch (err) {
      setError("Failed to send message");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConsumeMessage = async () => {
    if (!queueName) return;

    try {
      setConsuming(true);
      setError(null);
      setSuccess(null);

      const message = await api.dequeueMessage(queueName, 5000);

      if (message) {
        setConsumedMessage(message);
        setShowConsumedDialog(true);
        await loadMessages();
        await loadQueueDepth();
      } else {
        setError("No messages available in queue");
      }
    } catch (err) {
      setError("Failed to consume message");
      console.error(err);
    } finally {
      setConsuming(false);
    }
  };

  const handleRefresh = async () => {
    await loadMessages();
    await loadQueueDepth();
  };

  const handleDeleteQueue = async () => {
    if (!queueName) return;

    try {
      setDeleting(true);
      setError(null);
      await api.deleteQueue(queueName);
      navigate("/"); // Go back to dashboard after deletion
    } catch (err) {
      setError("Failed to delete queue");
      console.error(err);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/")}
          sx={{ mb: 2 }}
        >
          Back to Queues
        </Button>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              {queueName}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Chip
                label={`${queueDepth} messages`}
                color="primary"
                size="small"
              />
              {config.useMockData && (
                <Chip label="Mock Mode" color="warning" size="small" />
              )}
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <IconButton onClick={handleRefresh} title="Refresh">
              <RefreshIcon />
            </IconButton>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Queue
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Send Message
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Enter message text (e.g. Hello World)"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            disabled={loading}
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            onClick={handleSendMessage}
            disabled={loading || !messageContent.trim()}
            sx={{ minWidth: 120 }}
          >
            Send
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">Queue Messages</Typography>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <TextField
              label="Count"
              type="number"
              size="small"
              value={peekCount}
              onChange={(e) =>
                setPeekCount(Math.max(1, parseInt(e.target.value) || 20))
              }
              inputProps={{ min: 1, max: 100 }}
              sx={{ width: 100 }}
            />
            <Button
              variant="outlined"
              startIcon={
                loadingMessages ? (
                  <CircularProgress size={20} />
                ) : (
                  <RefreshIcon />
                )
              }
              onClick={loadMessages}
              disabled={loadingMessages}
            >
              Refresh
            </Button>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Viewing messages without consuming them (peek). Showing up to{" "}
          {peekCount} messages.
        </Typography>

        {loadingMessages ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : messages.length > 0 ? (
          <List>
            {messages.map((message, index) => (
              <Box key={message.id}>
                {index > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    index === 0 && (
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={
                          consuming ? (
                            <CircularProgress size={16} />
                          ) : (
                            <GetAppIcon />
                          )
                        }
                        onClick={handleConsumeMessage}
                        disabled={consuming}
                      >
                        Pop First
                      </Button>
                    )
                  }
                >
                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Chip
                          label={`#${index + 1}`}
                          size="small"
                          color={index === 0 ? "primary" : "default"}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(message.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box
                        sx={{
                          fontFamily: "monospace",
                          fontSize: "0.85rem",
                          bgcolor: "grey.50",
                          p: 1.5,
                          borderRadius: 1,
                          mt: 1,
                          maxWidth: index === 0 ? "calc(100% - 120px)" : "100%",
                        }}
                      >
                        <pre
                          style={{
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {JSON.stringify(message.content, null, 2)}
                        </pre>
                      </Box>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        ) : (
          <Box
            sx={{
              py: 4,
              textAlign: "center",
              color: "text.secondary",
            }}
          >
            <Typography variant="body1">No messages in queue</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Send a message to get started
            </Typography>
          </Box>
        )}
      </Paper>

      <Dialog
        open={showConsumedDialog}
        onClose={() => setShowConsumedDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Message Consumed</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Message Content:
          </Typography>
          <Paper
            sx={{
              p: 2,
              bgcolor: "grey.100",
              fontFamily: "monospace",
              fontSize: "0.9rem",
            }}
          >
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {consumedMessage &&
                JSON.stringify(consumedMessage.content, null, 2)}
            </pre>
          </Paper>
          {consumedMessage && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 2, display: "block" }}
            >
              Timestamp: {new Date(consumedMessage.timestamp).toLocaleString()}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConsumedDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>Delete Queue?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the queue "{queueName}"? This will
            remove all {queueDepth} message{queueDepth !== 1 ? "s" : ""} and
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteQueue}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={
              deleting ? <CircularProgress size={16} /> : <DeleteIcon />
            }
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
