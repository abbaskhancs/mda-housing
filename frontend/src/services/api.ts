/**
 * API Service for MDA Housing Frontend
 * Centralized HTTP client with authentication and error handling
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ErrorDetails {
  code?: string;
  guard?: string;
  reason?: string;
  metadata?: any;
  statusCode?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  errorDetails?: ErrorDetails;
}

export interface GuardResult {
  canTransition: boolean;
  reason: string;
  metadata?: any;
}

export interface WorkflowTransition {
  id: string;
  fromStageId: string;
  toStageId: string;
  guardName: string;
  fromStage: {
    id: string;
    code: string;
    name: string;
  };
  toStage: {
    id: string;
    code: string;
    name: string;
  };
  guardResult?: GuardResult;
  canTransition?: boolean;
  reason?: string;
  metadata?: any;
}

export interface Application {
  id: string;
  applicationNumber: string;
  currentStageId: string;
  currentStage: {
    id: string;
    code: string;
    name: string;
  };
  sellerId: string;
  buyerId: string;
  plotId: string;
  seller: {
    id: string;
    name: string;
    cnic: string;
  };
  buyer: {
    id: string;
    name: string;
    cnic: string;
  };
  plot: {
    id: string;
    plotNumber: string;
    sector: string;
    size: string;
    currentOwner?: {
      id: string;
      name: string;
      cnic: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}



class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();

      if (!response.ok) {
        // Parse error details for better error handling
        const errorDetails: ErrorDetails = {
          statusCode: response.status,
          code: data.code,
          ...(data.details && {
            guard: data.details.guard,
            reason: data.details.reason,
            metadata: data.details.metadata
          })
        };

        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
          data: data,
          errorDetails
        };
      }

      return {
        success: true,
        data: data,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async get<T>(endpoint: string, params?: any, responseType: 'json' | 'blob' = 'json'): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (responseType === 'blob') {
        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status}`
          };
        }
        const blob = await response.blob();
        return {
          success: true,
          data: blob as T
        };
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: data ? JSON.stringify(data) : undefined
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: data ? JSON.stringify(data) : undefined
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  async request<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.get<T>(`/api${endpoint}`);
  }

  // Workflow-specific methods
  async getWorkflowStages(): Promise<ApiResponse<{ stages: Array<{ id: string; code: string; name: string; sortOrder: number }> }>> {
    return this.request('/workflow/stages');
  }

  async getWorkflowStatuses(): Promise<ApiResponse<{ statuses: Array<{ id: string; code: string; name: string; sortOrder: number }> }>> {
    return this.request('/workflow/statuses');
  }

  async getWorkflowTransitions(fromStage: string, applicationId?: string): Promise<ApiResponse<WorkflowTransition[]>> {
    const params = new URLSearchParams();
    if (applicationId) {
      params.append('applicationId', applicationId);
      params.append('dryRun', 'true');
    }
    
    const queryString = params.toString();
    const endpoint = `/api/workflow/transitions/${fromStage}${queryString ? `?${queryString}` : ''}`;
    
    return this.get<WorkflowTransition[]>(endpoint);
  }

  async transitionApplication(applicationId: string, toStageId: string, remarks?: string): Promise<ApiResponse<any>> {
    return this.post(`/api/workflow/applications/${applicationId}/transition`, {
      toStageId,
      remarks
    });
  }

  async testGuard(applicationId: string, toStageId: string): Promise<ApiResponse<{ guardResult: GuardResult }>> {
    return this.post(`/api/workflow/applications/${applicationId}/guard-test`, {
      toStageId
    });
  }

  // Search methods
  async searchApplications(query: string, limit?: number): Promise<ApiResponse<{ applications: Application[]; total: number; searchTerm: string }>> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', query);
    if (limit) queryParams.append('limit', limit.toString());

    return this.request(`/applications/search?${queryParams.toString()}`);
  }

  // Application methods
  async getApplications(params?: {
    stage?: string;
    stages?: string[];
    section?: string;
    limit?: number;
    offset?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    assignedToMe?: boolean;
    includeDetails?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<{ applications: Application[]; total: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.stage) queryParams.append('stage', params.stage);
    if (params?.stages) {
      params.stages.forEach(stage => queryParams.append('stages', stage));
    }
    if (params?.section) queryParams.append('section', params.section);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params?.assignedToMe) queryParams.append('assignedToMe', 'true');
    if (params?.includeDetails) queryParams.append('includeDetails', 'true');
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    return this.get<{ applications: Application[]; total: number }>(`/api/applications${queryString ? `?${queryString}` : ''}`);
  }

  async getBCAPendingApplications(params?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<{ applications: Application[] }>> {
    const queryParams = new URLSearchParams();
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    return this.get<{ applications: Application[] }>(`/api/applications/bca/pending${queryString ? `?${queryString}` : ''}`);
  }

  async getHousingPendingApplications(params?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<{ applications: Application[] }>> {
    const queryParams = new URLSearchParams();
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    return this.get<{ applications: Application[] }>(`/api/applications/housing/pending${queryString ? `?${queryString}` : ''}`);
  }

  async getApplication(id: string): Promise<ApiResponse<Application>> {
    return this.get<Application>(`/api/applications/${id}`);
  }

  // Clearance methods
  async createClearance(applicationId: string, sectionId: string, statusId: string, remarks?: string, signedPdfUrl?: string): Promise<ApiResponse<any>> {
    return this.post(`/api/applications/${applicationId}/clearances`, {
      sectionId,
      statusId,
      remarks,
      signedPdfUrl
    });
  }

  async createBulkClearances(applicationIds: string[], sectionId: string, statusId: string, remarks?: string): Promise<ApiResponse<any>> {
    return this.post('/api/applications/bulk/clearances', {
      applications: applicationIds,
      sectionId,
      statusId,
      remarks
    });
  }

  // BCA Console methods
  async getBCAPendingApplications(): Promise<ApiResponse<{ applications: Application[] }>> {
    return this.get<{ applications: Application[] }>('/api/applications/bca/pending');
  }

  async generateBCAClearancePDF(applicationId: string): Promise<ApiResponse<{ signedUrl: string; documentId: string }>> {
    return this.post(`/api/applications/${applicationId}/bca/generate-pdf`, {});
  }

  // Housing Console methods
  async getHousingPendingApplications(): Promise<ApiResponse<{ applications: Application[] }>> {
    return this.get<{ applications: Application[] }>('/api/applications/housing/pending');
  }

  async generateHousingClearancePDF(applicationId: string): Promise<ApiResponse<{ signedUrl: string; documentId: string }>> {
    return this.post(`/api/applications/${applicationId}/housing/generate-pdf`, {});
  }

  // OWO Console methods
  async getOWOBCAHousingReviewApplications(): Promise<ApiResponse<{ applications: Application[] }>> {
    return this.get<{ applications: Application[] }>('/api/applications/owo/bca-housing-review');
  }

  // Accounts methods
  async getAccountsBreakdown(applicationId: string): Promise<ApiResponse<any>> {
    return this.get(`/api/applications/${applicationId}/accounts`);
  }

  async updateAccountsBreakdown(applicationId: string, feeHeads: any): Promise<ApiResponse<any>> {
    return this.post(`/api/applications/${applicationId}/accounts`, feeHeads);
  }

  async generateChallan(applicationId: string): Promise<ApiResponse<any>> {
    return this.post(`/api/applications/${applicationId}/accounts/generate-challan`, {});
  }

  async downloadChallan(applicationId: string): Promise<ApiResponse<any>> {
    return this.get(`/api/applications/${applicationId}/accounts/challan-pdf`, {}, 'blob');
  }

  async verifyPayment(applicationId: string, challanNumber: string, paidAmount: number, remarks?: string): Promise<ApiResponse<any>> {
    return this.post(`/api/applications/${applicationId}/accounts/verify-payment`, {
      challanNumber,
      paidAmount,
      remarks
    });
  }

  // Transfer Deed methods
  async createDeedDraft(applicationId: string, witness1Id: string, witness2Id: string, deedContent?: string): Promise<ApiResponse<any>> {
    return this.post(`/api/applications/${applicationId}/transfer-deed/draft`, {
      witness1Id,
      witness2Id,
      deedContent
    });
  }

  async updateDeedDraft(applicationId: string, witness1Id?: string, witness2Id?: string, deedContent?: string): Promise<ApiResponse<any>> {
    return this.put(`/api/applications/${applicationId}/transfer-deed/draft`, {
      witness1Id,
      witness2Id,
      deedContent
    });
  }

  async finalizeDeed(applicationId: string, witness1Signature: string, witness2Signature: string): Promise<ApiResponse<any>> {
    return this.post(`/api/applications/${applicationId}/transfer-deed/finalize`, {
      witness1Signature,
      witness2Signature
    });
  }

  async getTransferDeed(applicationId: string): Promise<ApiResponse<any>> {
    return this.get(`/api/applications/${applicationId}/transfer-deed`);
  }

  // Registers export methods
  async exportRegistersPDF(params: any = {}): Promise<Response> {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key]) {
        queryParams.append(key, params[key]);
      }
    });

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return fetch(`${API_BASE_URL}/api/applications/registers/export-pdf?${queryParams}`, {
      method: 'GET',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
  }

  // Export case packet as zip
  async exportCasePacket(applicationId: string): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return fetch(`${API_BASE_URL}/api/applications/${applicationId}/packet`, {
      method: 'GET',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
  }

  // Insert demo data (admin only)
  async insertDemoData(): Promise<ApiResponse<{ applications: any[]; count: number }>> {
    return this.post('/api/applications/demo/insert-data', {});
  }
}

export const apiService = new ApiService();
export default apiService;
