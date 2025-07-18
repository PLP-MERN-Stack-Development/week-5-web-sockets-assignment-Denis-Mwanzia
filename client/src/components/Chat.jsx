import { useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../socket/socket';
import axios from 'axios';

const reactionOptions = ['👍', '❤️', '😂', '😮', '😢'];

const Chat = () => {
  const { user, logout } = useContext(AuthContext);
  const {
    messages,
    connect,
    sendMessage,
    users,
    typingUsers,
    setTyping,
    reactToMessage,
  } = useSocket();

  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [animatingMessage, setAnimatingMessage] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const messagesEndRef = useRef(null);
  const notificationAudioRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (user) {
      connect(user.username, user.token);
    }
  }, [user]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;

    const handleScroll = () => {
      const nearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;
      setIsAtBottom(nearBottom);
      if (nearBottom) setUnreadCount(0);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    const latest = messages[messages.length - 1];

    const isOwn = latest.sender === user.username;
    if (!isOwn && !latest.system) {
      // 🔊 Play sound
      notificationAudioRef.current?.play().catch(() => {});

      // 🔔 Browser Notification (if tab not active)
      if (
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.hidden
      ) {
        new Notification(`💬 ${latest.sender}`, {
          body: latest.content || latest.message || '📎 File shared',
        });
      }

      if (!isAtBottom) setUnreadCount((prev) => prev + 1);
    }

    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() && !file) return;

    let messageData = { message: text };

    if (file) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/upload`,
          formData
        );
        const { url } = res.data;

        messageData = {
          message: text || '📎',
          fileUrl: url,
          fileType: file.type,
        };
        setFile(null);
      } catch (err) {
        console.error('File upload error:', err.message);
      } finally {
        setUploading(false);
      }
    }

    sendMessage(messageData);
    setText('');
    setTyping(false);
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    setTyping(e.target.value.length > 0);
  };

  const handleReaction = (messageId, emoji) => {
    reactToMessage(messageId, emoji);
    setAnimatingMessage(`${messageId}-${emoji}`);
    setTimeout(() => setAnimatingMessage(null), 500);
  };

  const hasUserReacted = (msg, emoji) => {
    if (!msg.reactions || !msg.reactions[emoji]) return false;
    return msg.reactions[emoji].includes(user.username);
  };

  const renderMessage = (msg) => {
    const text = msg.content || msg.message;
    const isString = typeof text === 'string';

    return (
      <>
        {isString ? (
          <p className="text-gray-800 whitespace-pre-wrap">{text}</p>
        ) : (
          <p className="text-gray-800 italic text-sm text-red-500">
            ⚠ Invalid message format
          </p>
        )}
        {msg.fileUrl &&
          (msg.fileType?.startsWith('image/') ? (
            <img
              src={msg.fileUrl}
              alt="shared"
              className="mt-2 max-w-full rounded-lg border"
            />
          ) : (
            <a
              href={msg.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-blue-600 underline"
            >
              📎 Download File
            </a>
          ))}
      </>
    );
  };

  return (
    <div className="h-screen flex bg-gray-100">
      <audio
        ref={notificationAudioRef}
        src="/sounds/notification.mp3"
        preload="auto"
      />
      {/* Sidebar */}
      <aside className="w-1/4 bg-white p-4 border-r hidden md:block">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Users Online</h2>
          <button
            onClick={logout}
            className="text-sm text-red-500 hover:underline"
          >
            Logout
          </button>
        </div>
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id || u.username} className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  u.online ? 'bg-green-500' : 'bg-gray-400'
                }`}
              ></span>
              {u.username}
            </li>
          ))}
        </ul>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col">
        <div className="p-4 bg-white shadow flex justify-between items-center">
          <h1 className="text-xl font-semibold">💬 Chat Room</h1>
          <button
            className="text-sm text-red-500 hover:underline md:hidden"
            onClick={logout}
          >
            Logout
          </button>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 pt-6 pb-3 flex flex-col items-center"
        >
          {unreadCount > 0 && !isAtBottom && (
            <div
              className="mb-3 bg-yellow-100 text-yellow-800 px-4 py-1 rounded-full text-sm shadow cursor-pointer"
              onClick={() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                setUnreadCount(0);
              }}
            >
              🔔 {unreadCount} new message{unreadCount > 1 ? 's' : ''}
            </div>
          )}

          {messages.map((msg) => {
            const isUserMessage = msg.sender === user.username;
            const isSystemMessage = msg.system;
            const isHovered = hoveredMessageId === msg.id;

            return (
              <div
                key={msg.id || msg._id}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                className={`relative group w-full max-w-md p-3 mt-4 rounded-lg ${
                  isUserMessage
                    ? 'bg-blue-100 ml-auto text-right'
                    : isSystemMessage
                    ? 'text-center text-gray-500 text-sm italic'
                    : 'bg-white mr-auto text-left'
                } shadow transition-all duration-300`}
              >
                {!isSystemMessage && (
                  <div className="text-xs text-gray-500 mb-1">
                    {msg.sender} •{' '}
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                )}

                {renderMessage(msg)}

                {/* Reactions */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex gap-2 mt-2 text-sm flex-wrap justify-center">
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <span
                        key={`${msg.id}-${emoji}`}
                        className={`bg-gray-200 px-2 py-1 rounded-full ${
                          animatingMessage === `${msg.id}-${emoji}`
                            ? 'animate-bounce'
                            : ''
                        }`}
                      >
                        {emoji} {users.length}
                      </span>
                    ))}
                  </div>
                )}

                {/* Emoji Picker (below message) */}
                {!isSystemMessage && isHovered && (
                  <div className="mt-2 flex justify-center gap-1 bg-white shadow-md p-1 rounded-full z-10 border w-fit mx-auto">
                    {reactionOptions.map((emoji) => (
                      <button
                        key={`${msg.id}-${emoji}`}
                        onClick={() => handleReaction(msg.id, emoji)}
                        className={`text-lg hover:scale-110 transition duration-150 ${
                          hasUserReacted(msg, emoji)
                            ? 'opacity-100'
                            : 'opacity-60'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-1 text-sm text-gray-500 italic">
            {typingUsers.join(', ')} typing...
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-white border-t flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={text}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="p-2 border rounded-lg"
          />
          <button
            onClick={handleSend}
            disabled={uploading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Send'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Chat;
