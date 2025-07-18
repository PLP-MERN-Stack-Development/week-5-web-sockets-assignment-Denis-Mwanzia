const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },
    receiver: { type: String },
    content: { type: String },
    fileUrl: { type: String },
    fileType: { type: String },
    isPrivate: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    reactions: {
      type: Map,
      of: [String],
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

module.exports = mongoose.model('Message', messageSchema);
