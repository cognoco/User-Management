export interface SsoService {
  getProviders(organizationId: string): Promise<any[]>;
  upsertProvider(data: any): Promise<any>;
}

class ApiSsoService implements SsoService {
  async getProviders(_organizationId: string): Promise<any[]> {
    // Mock implementation
    return [];
  }
  
  async upsertProvider(data: any): Promise<any> {
    // Mock implementation
    return {
      id: '1',
      organizationId: data.organizationId,
      providerType: data.providerType,
      providerName: data.providerName,
      config: data.config,
      isActive: true,
    };
  }
}

export function getApiSsoService(): SsoService {
  return new ApiSsoService();
}