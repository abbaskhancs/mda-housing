/**
 * API Service for MDA Housing Frontend
 * Centralized HTTP client with authentication and error handling
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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
  };
  createdAt: string;
  updatedAt: string;
}

export interface GuardResult {
  canTransition: boolean;
  reason: string;
  metadata?: any;
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
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
          data: data
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

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
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

  // Workflow-specific methods
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

  // Application methods
  async getApplications(params?: {
    stage?: string;
    section?: string;
    limit?: number;
    offset?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<{ applications: Application[]; total: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.stage) queryParams.append('stage', params.stage);
    if (params?.section) queryParams.append('section', params.section);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);

    const queryString = queryParams.toString();
    return this.get<{ applications: Application[]; total: number }>(`/api/applications${queryString ? `?${queryString}` : ''}`);
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
}

export const apiService = new ApiService();
export default apiService;
