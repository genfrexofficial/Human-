export const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(dateString);
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const formatBytes = formatFileSize;

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || amount === '') return '₹0';
  const num = Number(amount);
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

/**
 * Format working minutes or attendance record into clean "X hrs Y mins" (Hour : minutes)
 */
export const formatWorkingHours = (recordOrHours) => {
  if (recordOrHours === undefined || recordOrHours === null || recordOrHours === '') {
    return '0 hrs 00 mins';
  }

  // If passed an attendance record or summary object
  if (typeof recordOrHours === 'object') {
    if (recordOrHours.displayHours) return recordOrHours.displayHours;
    if (recordOrHours.timeFormat) return `${recordOrHours.timeFormat} hrs`;

    let mins = recordOrHours.totalMinutes;
    if (typeof mins !== 'number') {
      if (typeof recordOrHours.totalHours === 'number') {
        mins = Math.round(recordOrHours.totalHours * 60);
      } else {
        mins = 0;
      }
    }
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const mm = m.toString().padStart(2, '0');
    return `${h} hrs ${mm} mins`;
  }

  // If passed totalHours as number (float like 7.5 or 0.25)
  if (typeof recordOrHours === 'number') {
    const mins = Math.max(0, Math.round(recordOrHours * 60));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const mm = m.toString().padStart(2, '0');
    return `${h} hrs ${mm} mins`;
  }

  return String(recordOrHours);
};
