import React, { useState } from 'react';
import { formatRelativeTime } from '../../utils/formatters';
import Button from '../common/Button';
import { Send, MessageSquare, Trash2, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const CommentSection = ({
  comments = [],
  projectId,
  onAddComment,
  onDeleteComment
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please enter a comment.');
      return;
    }

    try {
      setLoading(true);
      await onAddComment({ project: projectId, message: message.trim() });
      setMessage('');
    } catch (err) {
      // Handled in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-card space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Project Feedback & Discussion</h3>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {comments.length} message{comments.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Comments Feed */}
      <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No comments yet. Start the conversation with your client!
          </div>
        ) : (
          comments.map((comment) => {
            const isMe = user?._id === comment.user?._id;
            const isAdminComment = comment.user?.role === 'ADMIN';

            return (
              <div
                key={comment._id}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                  isAdminComment
                    ? 'bg-indigo-50/30 border-indigo-100'
                    : 'bg-slate-50/70 border-slate-200/70'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isAdminComment
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {comment.user?.name?.charAt(0) || 'U'}
                </div>

                {/* Comment Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {comment.user?.name || 'User'}
                      </span>

                      {isAdminComment ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.2 rounded">
                          <ShieldCheck className="w-2.5 h-2.5" /> Agency Lead
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          Client
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400">
                        • {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>

                    {(isMe || user?.role === 'ADMIN') && (
                      <button
                        type="button"
                        onClick={() => onDeleteComment(comment._id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Delete Comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {comment?.file?.fileName && (
                    <p className="text-[11px] font-medium text-indigo-600 mt-1">
                      Regarding: {comment.file.fileName}
                    </p>
                  )}

                  <p className="text-xs text-slate-800 mt-1.5 leading-relaxed whitespace-pre-wrap">
                    {comment.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Post comment input box */}
      <form onSubmit={handleSubmit} className="pt-3 border-t border-slate-100">
        <div className="relative">
          <textarea
            rows={3}
            placeholder="Write a message, request an update, or leave feedback..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="block w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
          />
          <div className="mt-2 flex justify-between items-center">
            <span className="text-[11px] text-slate-400">
              {user?.role === 'ADMIN' ? 'Replying as Agency' : 'Posting as Client'}
            </span>
            <Button type="submit" size="sm" loading={loading} icon={Send}>
              Send Feedback
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CommentSection;
