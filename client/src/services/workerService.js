import api from './api';

export const EmployeeService = {
  getEmployees: async () => {
    const res = await api.get('/users/Employees');
    return res.data;
  },

  getEmployeeById: async (id) => {
    const res = await api.get(`/users/Employees/${id}`);
    return res.data;
  },

  createEmployee: async (EmployeeData) => {
    const res = await api.post('/users/Employees', EmployeeData);
    return res.data;
  }
};
