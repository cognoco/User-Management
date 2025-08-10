/**
 * Pure Resource Relationship Service Factory
 */

import type { ResourceRelationshipService } from '@/core/resource-relationship/interfaces';
import type { IResourceRelationshipDataProvider } from '@/core/resource-relationship';
import { DefaultResourceRelationshipService } from './default-resource-relationship.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface ResourceRelationshipServiceDependencies {
  adapterRegistry: AdapterRegistry;
  provider?: IResourceRelationshipDataProvider;
}

export function createResourceRelationshipService(deps: ResourceRelationshipServiceDependencies): ResourceRelationshipService {
  const { adapterRegistry, provider } = deps;
  const rrProvider = provider || adapterRegistry.getAdapter<IResourceRelationshipDataProvider>('resourceRelationship');
  return new DefaultResourceRelationshipService(rrProvider);
}