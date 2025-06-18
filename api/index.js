// === Imports and Configuration ===
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const User = require("./models/User");
const bcrypt = require("bcrypt");
const ws = require("ws");

dotenv.config();

const app = express();
const jwtSecret = process.env.JWT_SECRET;

// === MongoDB Connection ===
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// === Middleware ===
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// === Routes ===

app.get("/", (req, res) => {
  res.send("🚀 Server is running");
});

app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await User.create({
      username,
      password: hashedPassword,
    });

    jwt.sign({ userId: createdUser._id }, jwtSecret, (err, token) => {
      if (err) {
        console.error("JWT Error:", err);
        return res.status(500).json({ error: "Token creation failed" });
      }
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
        })
        .status(201)
        .json({
          message: "User registered successfully",
          user: {
            id: createdUser._id,
            username: createdUser.username,
          },
        });
    });
  } catch (err) {
    console.error("❌ Registration Error:", err);
    res
      .status(500)
      .json({ error: "Registration failed", details: err.message });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

  jwt.sign({ userId: user._id }, jwtSecret, (err, token) => {
    if (err) {
      console.error("JWT Error:", err);
      return res.status(500).json({ error: "Token creation failed" });
    }
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      })
      .json({
        user: {
          id: user._id,
          username: user.username,
        },
      });
  });
});

app.get("/profile", (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, jwtSecret, async (err, decoded) => {
    if (err) {
      console.error("JWT Error:", err);
      return res.status(403).json({ error: "Invalid token" });
    }

    try {
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ id: user._id, username: user.username });
    } catch (error) {
      console.error("Database Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});

app.post("/logout", (req, res) => {
  res
    .clearCookie("token")
    .status(200)
    .json({ message: "Logged out successfully" });
});

app.get("/people", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, jwtSecret, async (err, decoded) => {
    if (err) {
      console.error("JWT Error:", err);
      return res.status(403).json({ error: "Invalid token" });
    }

    try {
      const users = await User.find(
        { _id: { $ne: decoded.userId } },
        { _id: 1, username: 1 }
      );
      res.json(users);
    } catch (err) {
      console.error("❌ Error fetching people:", err);
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });
});

const Message = require("./models/Message");

app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, jwtSecret, async (err, decoded) => {
    if (err) {
      console.error("JWT Error:", err);
      return res.status(403).json({ error: "Invalid token" });
    }

    const myUserId = decoded.userId;

    const messages = await Message.find({
      $or: [
        { sender: myUserId, recipient: userId },
        { sender: userId, recipient: myUserId },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  });
});

// === Start HTTP Server ===
const server = app.listen(4040, () => {
  console.log("✅ Server running on http://localhost:4040");
});

// === WebSocket Server ===
const wss = new ws.WebSocketServer({ noServer: true });

const connectedUsers = new Map();

function notifyOnlineUsers() {
  const online = [...connectedUsers.entries()].map(([userId, conn]) => ({
    userId,
    username: conn.username,
  }));
  const message = JSON.stringify({ type: "online-users", online });
  for (const [, conn] of connectedUsers) {
    conn.send(message);
  }
}

function logConnectedUsers() {
  const usernames = Array.from(connectedUsers.values()).map(
    (conn) => conn.username
  );
  console.log("🟢 Connected users:", usernames);
}

// ✅ ONE global interval for pinging clients
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      ws.terminate();
    } else {
      ws.isAlive = false;
      ws.ping();
    }
  });
}, 30000);

wss.on("connection", (connection, req) => {
  connection.isAlive = true;

  connection.on("pong", () => {
    connection.isAlive = true;
  });

  const cookies = req.headers.cookie;
  const token = cookies?.split("; ").find((c) => c.startsWith("token="))?.split("=")[1];
  if (!token) return;

  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) {
      console.error("JWT Error:", err);
      return;
    }

    try {
      const user = await User.findById(userData.userId);
      if (!user) return;

      connection.username = user.username;
      connection.userId = user._id.toString();

      const existingConn = connectedUsers.get(connection.userId);
      if (!existingConn) {
        connectedUsers.set(connection.userId, connection);
        logConnectedUsers();
        notifyOnlineUsers();
      } else {
        connectedUsers.set(connection.userId, connection);
      }
    } catch (dbErr) {
      console.error("DB Error:", dbErr);
    }
  });

  connection.on("message", async (message) => {
  let messageData;
  try {
    messageData = JSON.parse(message.toString());
  } catch (e) {
    return;
  }

  const { recipient, text, file } = messageData;

  // ⛔ Prevent sending empty messages (both text and file missing)
  const trimmedText = typeof text === "string" ? text.trim() : "";
  if (!recipient || (!trimmedText && !file)) return;

  const messageDoc = await Message.create({
    sender: connection.userId,
    recipient,
    text: trimmedText,
    file,
  });

  const outMsg = {
    type: "message",
    text: trimmedText,
    sender: connection.userId,
    recipient,
    _id: messageDoc._id,
    createdAt: messageDoc.createdAt,
  };

  const recipientConn = connectedUsers.get(recipient);
  if (recipientConn) {
    recipientConn.send(JSON.stringify(outMsg));
  }
});

  connection.on("close", () => {
    if (connection.userId && connectedUsers.get(connection.userId) === connection) {
      connectedUsers.delete(connection.userId);
      logConnectedUsers();
      notifyOnlineUsers();
    }
  });
});

// WebSocket upgrade
server.on("upgrade", (req, socket, head) => {
  if (req.url === "/ws") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});
