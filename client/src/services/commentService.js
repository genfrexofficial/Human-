import api from './api';

export const commentService = {
  getProjectComments: async (projectId, fileId = null, taskId = null) => {
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      if (taskId) {
        return commentService.getTaskComments(taskId);
      }
      return { success: true, count: 0, comments: [] };
    }
    const params = new URLSearchParams();
    if (fileId) params.append('fileId', fileId);
    if (taskId) params.append('taskId', taskId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(`/comments/project/${projectId}${queryString}`);
    return response.data;
  },

  getTaskComments: async (taskId) => {
    if (!taskId || taskId === 'undefined' || taskId === 'null') {
      return { success: true, count: 0, comments: [] };
    }
    const response = await api.get(`/comments/task/${taskId}`);
    return response.data;
  },

  createComment: async (commentData) => {
    const response = await api.post('/comments', commentData);
    return response.data;
  },

  deleteComment: async (id) => {
    const response = await api.delete(`/comments/${id}`);
    return response.data;
  }
};
