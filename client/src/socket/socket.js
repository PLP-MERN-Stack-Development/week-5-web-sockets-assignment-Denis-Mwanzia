import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  const connect = async (username, token) => {
    if (!socket.connected) {
      socket.connect();

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (Array.isArray(data)) {
          setMessages(data);
        } else {
          console.error('Invalid message format:', data);
        }
      } catch (err) {
        console.error('❌ Failed to fetch messages:', err.message);
      }

      socket.emit('user_join', username);
    }
  };

  const disconnect = () => socket.disconnect();

  const sendMessage = (message) => {
    socket.emit('send_message', { message });
  };

  const sendPrivateMessage = (to, message) => {
    socket.emit('private_message', { to, message });
  };

  const setTyping = (isTyping) => {
    socket.emit('typing', isTyping);
  };

  const reactToMessage = (messageId, emoji) => {
    socket.emit('message_reaction', { messageId, emoji });
  };

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('receive_message', (msg) => {
      setLastMessage(msg);
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('private_message', (msg) => {
      setLastMessage(msg);
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('user_list', (list) => {
      const unique = list.filter(
        (v, i, a) => a.findIndex((t) => t.username === v.username) === i
      );
      setUsers(unique.filter((u) => u.online));
    });

    socket.on('user_joined', (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} joined the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    socket.on('user_left', (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} left the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setUsers((prev) => prev.filter((u) => u.username !== user.username));
    });

    socket.on('typing_users', setTypingUsers);

    socket.on('message_reaction', (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
      );
    });

    return () => socket.removeAllListeners();
  }, []);

  return {
    socket,
    isConnected,
    lastMessage,
    messages,
    users,
    typingUsers,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    reactToMessage,
  };
};

export default socket;
