import api from './api';

export const taskService = {
  getProjectTasks: async (projectId, params = {}) => {
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      return { success: true, count: 0, tasks: [] };
    }
    const response = await api.get(`/tasks/project/${projectId}`, { params });
    return response.data;
  },

  getMyTasks: async (params = {}) => {
    const response = await api.get('/tasks/my-tasks', { params });
    return response.data;
  },

  getTaskById: async (id) => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  updateTask: async (id, taskData) => {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  startTask: async (id) => {
    const response = await api.post(`/tasks/${id}/start`);
    return response.data;
  },

  updateProgress: async (id, progress) => {
    const response = await api.post(`/tasks/${id}/progress`, { progress });
    return response.data;
  },

  submitReview: async (id) => {
    const response = await api.post(`/tasks/${id}/submit-review`);
    return response.data;
  },

  completeTask: async (id) => {
    const response = await api.post(`/tasks/${id}/complete`);
    return response.data;
  },

  blockTask: async (id, reason) => {
    const response = await api.post(`/tasks/${id}/block`, { reason });
    return response.data;
  },

  deleteTask: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  }
};
