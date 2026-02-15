import crypto from 'crypto';
import { EventEmitter } from 'events';

class SalesForcePlanningService extends EventEmitter {
  private opportunities: Map<string, SalesOpportunity> = new Map();
  private territories: Map<string, SalesTerritory> = new Map();

  createOpportunity(
    opportunityData: {
      name: string;
      customer: string;
      potentialValue: number;
      probability: number;
      stage: SalesStage;
    }
  ): SalesOpportunity {
    const opportunity: SalesOpportunity = {
      id: crypto.randomUUID(),
      ...opportunityData,
      createdAt: new Date(),
      status: 'prospecting'
    };

    this.opportunities.set(opportunity.id, opportunity);
    this.emit('opportunityCreated', opportunity);

    return opportunity;
  }

  assignTerritory(
    territoryData: {
      name: string;
      region: string;
      salesRepresentatives: string[];
    }
  ): SalesTerritory {
    const territory: SalesTerritory = {
      id: crypto.randomUUID(),
      ...territoryData,
      createdAt: new Date()
    };

    this.territories.set(territory.id, territory);
    this.emit('territoryAssigned', territory);

    return territory;
  }

  updateOpportunityStage(
    opportunityId: string, 
    newStage: SalesStage
  ): SalesOpportunity {
    const opportunity = this.opportunities.get(opportunityId);
    
    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    opportunity.stage = newStage;
    opportunity.updatedAt = new Date();

    this.emit('opportunityStageUpdated', opportunity);

    return opportunity;
  }

  generateSalesReport(): string {
    const reportLines = [
      '# Sales Force Planning Report',
      '## Opportunities',
      ,
      ,
      '## Territories',
      
    ];

    return reportLines.join('\n');
  }
}

type SalesStage = 
  | 'prospecting' 
  | 'qualification' 
  | 'proposal' 
  | 'negotiation' 
  | 'closed_won' 
  | 'closed_lost';

interface SalesOpportunity {
  id: string;
  name: string;
  customer: string;
  potentialValue: number;
  probability: number;
  stage: SalesStage;
  status: 'prospecting' | 'active' | 'closed';
  createdAt: Date;
  updatedAt?: Date;
}

interface SalesTerritory {
  id: string;
  name: string;
  region: string;
  salesRepresentatives: string[];
  createdAt: Date;
}

export default SalesForcePlanningService;
