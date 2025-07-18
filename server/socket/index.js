const Message = require('../models/Message');

const users = {};
const typingUsers = {};

const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    socket.on('user_join', (username) => {
      users[socket.id] = { username, id: socket.id };
      io.emit('user_list', Object.values(users));
      io.emit('user_joined', { username, id: socket.id });
    });

    socket.on('send_message', async (data) => {
      const message = {
        sender: users[socket.id]?.username || 'Anonymous',
        content: data.content,
        timestamp: new Date(),
        isPrivate: false,
      };
      await new Message(message).save();
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

    socket.on('private_message', async ({ to, message }) => {
      const msgData = {
        sender: users[socket.id]?.username || 'Anonymous',
        content: message,
        isPrivate: true,
        receiver: users[to]?.username || '',
        timestamp: new Date(),
      };
      await new Message(msgData).save();
      socket.to(to).emit('private_message', msgData);
      socket.emit('private_message', msgData);
    });

    socket.on('disconnect', () => {
      const username = users[socket.id]?.username;
      delete users[socket.id];
      delete typingUsers[socket.id];
      io.emit('user_list', Object.values(users));
      io.emit('user_left', { username, id: socket.id });
    });
  });
};

module.exports = { initSocket };
