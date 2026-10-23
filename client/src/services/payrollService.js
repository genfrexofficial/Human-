import api from './api';

export const payrollService = {
  // Salary Structure APIs
  getAllSalaryStructures: async () => {
    const response = await api.get('/salary-structures/all');
    return response.data;
  },

  getSalaryStructureByUser: async (userId) => {
    const response = await api.get(`/salary-structures/user/${userId}`);
    return response.data;
  },

  upsertSalaryStructure: async (userId, data) => {
    const response = await api.put(`/salary-structures/user/${userId}`, data);
    return response.data;
  },

  getMySalaryStructure: async () => {
    const response = await api.get('/salary-structures/my-structure');
    return response.data;
  },

  // Payroll Lifecycle APIs
  generateMonthlyPayroll: async (params) => {
    const response = await api.post('/payrolls/generate', params);
    return response.data;
  },

  getPayrolls: async (params = {}) => {
    const response = await api.get('/payrolls/all', { params });
    return response.data;
  },

  getPayrollStats: async (params = {}) => {
    const response = await api.get('/payrolls/stats', { params });
    return response.data;
  },

  getPayrollById: async (id) => {
    const response = await api.get(`/payrolls/slip/${id}`);
    return response.data;
  },

  updatePayrollSlip: async (id, data) => {
    const response = await api.put(`/payrolls/slip/${id}`, data);
    return response.data;
  },

  submitForApproval: async (ids) => {
    const response = await api.post('/payrolls/submit-approval', { ids });
    return response.data;
  },

  approvePayroll: async (ids) => {
    const response = await api.post('/payrolls/approve', { ids });
    return response.data;
  },

  recordPayment: async (id, paymentData) => {
    const response = await api.post(`/payrolls/record-payment/${id}`, paymentData);
    return response.data;
  },

  bulkRecordPayment: async (data) => {
    const response = await api.post('/payrolls/bulk-record-payment', data);
    return response.data;
  },

  getMyPayrolls: async () => {
    const response = await api.get('/payrolls/my-payrolls');
    return response.data;
  },

  deletePayroll: async (id) => {
    const response = await api.delete(`/payrolls/slip/${id}`);
    return response.data;
  },

  downloadPayslipPDF: async (id, filename = 'GENFREX_Payment_Voucher.pdf') => {
    const response = await api.get(`/payrolls/slip/${id}/download-pdf`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
