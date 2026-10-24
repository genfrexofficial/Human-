import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, FileText, CheckCircle2, MessageSquare, AlertCircle, Layers } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { formatRelativeTime } from '../../utils/formatters';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { isAdmin, isEmployee } = useAuth();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'TASK':
        return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'FILE':
        return <FileText className="w-4 h-4 text-amber-500" />;
      case 'APPROVAL':
        return <Check className="w-4 h-4 text-emerald-500" />;
      case 'FEEDBACK':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'PROJECT':
        return <Layers className="w-4 h-4 text-indigo-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
      return;
    }
    if (notification.project?._id) {
      if (isAdmin) {
        navigate(`/admin/projects/${notification.project._id}`);
      } else if (isEmployee) {
        navigate('/Employee/tasks');
      } else {
        navigate(`/client/projects/${notification.project._id}`);
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-xl bg-white shadow-floating border border-slate-200/80 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-900">Notifications</h4>
              {unreadCount > 0 && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-3 p-3.5 text-left cursor-pointer transition-colors ${notification.isRead ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/40 hover:bg-indigo-50/70'
                    }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-white shadow-subtle border border-slate-200/60 shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${notification.isRead ? 'text-slate-700' : 'text-slate-900 font-medium'} leading-relaxed line-clamp-2`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {notification.project?.name && (
                        <span className="text-[10px] text-indigo-600 font-medium truncate max-w-[120px]">
                          {notification.project.name}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
