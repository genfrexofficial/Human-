import api from './api';

export const fileService = {
  getProjectFiles: async (projectId, category = null, taskId = null) => {
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      if (taskId) {
        return fileService.getTaskFiles(taskId);
      }
      return { success: true, count: 0, files: [] };
    }
    const params = {};
    if (category) params.category = category;
    if (taskId) params.taskId = taskId;
    const response = await api.get(`/files/project/${projectId}`, { params });
    return response.data;
  },

  getTaskFiles: async (taskId) => {
    if (!taskId || taskId === 'undefined' || taskId === 'null') {
      return { success: true, count: 0, files: [] };
    }
    const response = await api.get(`/files/task/${taskId}`);
    return response.data;
  },

  browseFiles: async (params = {}) => {
    const response = await api.get('/files/browse', { params });
    return response.data;
  },

  uploadFile: async (payload) => {
    const isFormData = payload instanceof FormData;
    const response = await api.post('/files/upload', payload, isFormData ? {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    } : {});
    return response.data;
  },

  uploadConfidential: async (formData) => {
    const response = await api.post('/files/upload-confidential', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  replaceFile: async (id, formData) => {
    const response = await api.put(`/files/${id}/replace`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  getDownloadUrl: async (id) => {
    const response = await api.get(`/files/${id}/download?json=true`);
    return response.data;
  },

  downloadBlob: async (id, fileName) => {
    try {
      const response = await api.get(`/files/${id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'file');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      return true;
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) {
            err.message = json.message;
            if (err.response) err.response.data = json;
          }
        } catch (_) {}
      }
      throw err;
    }
  },

  viewBlob: async (id) => {
    const response = await api.get(`/files/${id}/view`, {
      responseType: 'blob'
    });
    const contentType = response.headers['content-type'] || 'application/pdf';
    const blob = new Blob([response.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    return true;
  },

  getStorageStats: async () => {
    const response = await api.get('/files/storage-stats');
    return response.data;
  },

  deleteFile: async (id) => {
    const response = await api.delete(`/files/${id}`);
    return response.data;
  },

  reviewDeliverable: async (id, status, reason = '') => {
    const response = await api.put(`/files/${id}/review`, { status, reason });
    return response.data;
  }
};
