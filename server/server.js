const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const multer = require('multer');
const fs = require('fs');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const { protect: authenticateToken } = require('./middleware/authMiddleware');
const { getMessages, postMessage } = require('./controllers/chatController');
const Message = require('./models/Message');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// File upload setup
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});
const upload = multer({ storage });

const users = {};
const typingUsers = {};
const messages = [];

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on('user_join', (username) => {
    for (let id in users) {
      if (users[id].username === username) {
        delete users[id];
        break;
      }
    }

    users[socket.id] = { id: socket.id, username, online: true };
    io.emit('user_list', Object.values(users));
    io.emit('user_joined', { id: socket.id, username });
  });

  socket.on('send_message', async (data) => {
    const sender = users[socket.id]?.username || 'Anonymous';

    const isObject = typeof data.message === 'object' && data.message !== null;
    const messageText = isObject
      ? data.message.message
      : data.message || data.content || '';
    const fileUrl = isObject ? data.message.fileUrl : data.fileUrl || null;
    const fileType = isObject ? data.message.fileType : data.fileType || null;

    if (!messageText && !fileUrl) return;

    const message = {
      id: Date.now(),
      sender,
      senderId: socket.id,
      content: messageText,
      fileUrl,
      fileType,
      isPrivate: false,
      timestamp: new Date().toISOString(),
      reactions: {},
    };

    messages.push(message);

    try {
      const saved = new Message({
        sender,
        content: messageText,
        fileUrl,
        fileType,
        isPrivate: false,
      });
      await saved.save();
    } catch (err) {
      console.error('❌ MongoDB Save Error:', err.message);
    }

    io.emit('receive_message', message);
  });

  socket.on('typing', (isTyping) => {
    const username = users[socket.id]?.username;
    if (!username) return;

    if (isTyping) {
      typingUsers[socket.id] = username;
    } else {
      delete typingUsers[socket.id];
    }

    io.emit('typing_users', Object.values(typingUsers));
  });

  socket.on('private_message', ({ to, message }) => {
    const sender = users[socket.id]?.username || 'Anonymous';

    const messageData = {
      id: Date.now(),
      sender,
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
    };

    socket.to(to).emit('private_message', messageData);
    socket.emit('private_message', messageData);
  });

  socket.on('message_reaction', async ({ messageId, emoji }) => {
    const user = users[socket.id];
    if (!user || !messageId || !emoji) return;

    try {
      const msg = await Message.findOne({ id: messageId });
      if (!msg) return;

      let reactionsObj =
        msg.reactions instanceof Map
          ? Object.fromEntries(msg.reactions)
          : msg.reactions || {};

      // Remove user's previous reaction
      for (const e in reactionsObj) {
        reactionsObj[e] = reactionsObj[e].filter((u) => u !== user.username);
        if (reactionsObj[e].length === 0) delete reactionsObj[e];
      }

      // Add new emoji
      if (!reactionsObj[emoji]) reactionsObj[emoji] = [];
      reactionsObj[emoji].push(user.username);

      msg.reactions = reactionsObj;
      msg.markModified('reactions');
      await msg.save();

      io.emit('message_reaction', msg);
    } catch (err) {
      console.error('Reaction Error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      io.emit('user_left', { id: socket.id, username: user.username });
      delete users[socket.id];
      delete typingUsers[socket.id];
      io.emit('user_list', Object.values(users));
      io.emit('typing_users', Object.values(typingUsers));
    }
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Static file hosting
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.get('/api/messages', authenticateToken, getMessages);
app.post('/api/messages', authenticateToken, postMessage);

// Upload route
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${
    req.file.filename
  }`;
  res.status(200).json({ url: fileUrl });
});

app.get('/', (req, res) => {
  res.send('🟢 Socket.io Chat Server is Running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
