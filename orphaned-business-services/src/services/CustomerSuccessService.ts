import crypto from 'crypto';
import { EventEmitter } from 'events';

class CustomerSuccessService extends EventEmitter {
  private customerProfiles: Map<string, CustomerProfile> = new Map();
  private supportTickets: Map<string, SupportTicket> = new Map();
  private feedbackEntries: Map<string, CustomerFeedback> = new Map();

  onboardCustomer(
    customerData: {
      name: string;
      email: string;
      company?: string;
      type: CustomerType;
    }
  ): CustomerProfile {
    const customer: CustomerProfile = {
      id: crypto.randomUUID(),
      ...customerData,
      status: 'active',
      onboardedAt: new Date(),
      healthScore: 100
    };

    this.customerProfiles.set(customer.id, customer);
    this.emit('customerOnboarded', customer);

    return customer;
  }

  createSupportTicket(
    ticketData: {
      customerId: string;
      category: SupportCategory;
      description: string;
      priority: SupportPriority;
    }
  ): SupportTicket {
    const customer = this.customerProfiles.get(ticketData.customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    const ticket: SupportTicket = {
      id: crypto.randomUUID(),
      ...ticketData,
      status: 'open',
      createdAt: new Date()
    };

    this.supportTickets.set(ticket.id, ticket);
    this.emit('supportTicketCreated', ticket);

    // Adjust customer health score based on ticket
    this.updateCustomerHealthScore(customer.id, -10);

    return ticket;
  }

  recordCustomerFeedback(
    feedbackData: {
      customerId: string;
      score: number;
      comments?: string;
    }
  ): CustomerFeedback {
    const customer = this.customerProfiles.get(feedbackData.customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    const feedback: CustomerFeedback = {
      id: crypto.randomUUID(),
      ...feedbackData,
      submittedAt: new Date()
    };

    this.feedbackEntries.set(feedback.id, feedback);
    this.emit('customerFeedbackReceived', feedback);

    // Adjust customer health score based on feedback
    this.updateCustomerHealthScore(
      customer.id, 
      feedbackData.score >= 8 ? 5 : -5
    );

    return feedback;
  }

  private updateCustomerHealthScore(
    customerId: string, 
    adjustment: number
  ) {
    const customer = this.customerProfiles.get(customerId);
    
    if (customer) {
      customer.healthScore = Math.max(
        0, 
        Math.min(100, customer.healthScore + adjustment)
      );
    }
  }

  generateCustomerSuccessReport(): string {
    const reportLines = [
      '# Customer Success Report',
      '## Customer Profiles',
      ,
      '## Support Tickets',
      ,
      ,
      '## Customer Feedback',
      
    ];

    return reportLines.join('\n');
  }
}

type CustomerType = 
  | 'free' 
  | 'individual' 
  | 'small_business' 
  | 'enterprise';

type SupportCategory = 
  | 'technical' 
  | 'billing' 
  | 'account' 
  | 'feature_request';

type SupportPriority = 'low' | 'medium' | 'high' | 'critical';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  company?: string;
  type: CustomerType;
  status: 'active' | 'inactive' | 'churned';
  onboardedAt: Date;
  healthScore: number;
}

interface SupportTicket {
  id: string;
  customerId: string;
  category: SupportCategory;
  description: string;
  priority: SupportPriority;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: Date;
}

interface CustomerFeedback {
  id: string;
  customerId: string;
  score: number;
  comments?: string;
  submittedAt: Date;
}

export default CustomerSuccessService;
