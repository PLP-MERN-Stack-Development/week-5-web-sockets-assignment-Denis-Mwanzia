const Message = require('../models/Message');

// Get recent messages (global chat)
const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ isPrivate: false })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Post message (authenticated sender)
const postMessage = async (req, res) => {
  try {
    const content = req.body.content;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const message = new Message({
      sender: req.user.username,
      content,
      isPrivate: false,
    });

    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

module.exports = {
  getMessages,
  postMessage,
};