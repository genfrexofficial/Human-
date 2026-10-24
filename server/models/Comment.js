const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    message: {
      type: String,
      required: [true, 'Message cannot be empty'],
      trim: true
    },
    isInternal: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

commentSchema.index({ project: 1, isInternal: 1 });
commentSchema.index({ task: 1, isInternal: 1 });
commentSchema.index({ file: 1 });

module.exports = mongoose.model('Comment', commentSchema);
