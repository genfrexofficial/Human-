import api from './api';

export const milestoneService = {
  getProjectMilestones: async (projectId) => {
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      return { success: true, count: 0, milestones: [] };
    }
    const response = await api.get(`/milestones/project/${projectId}`);
    return response.data;
  },

  createMilestone: async (milestoneData) => {
    const response = await api.post('/milestones', milestoneData);
    return response.data;
  },

  updateMilestone: async (id, milestoneData) => {
    const response = await api.put(`/milestones/${id}`, milestoneData);
    return response.data;
  },

  deleteMilestone: async (id) => {
    const response = await api.delete(`/milestones/${id}`);
    return response.data;
  }
};
