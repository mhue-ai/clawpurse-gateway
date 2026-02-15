import crypto from 'crypto';
import { EventEmitter } from 'events';

class ServiceDiscoveryService extends EventEmitter {
  private services: Map<string, ServiceInstance[]> = new Map();

  registerService(
    serviceData: {
      name: string;
      url: string;
      host: string;
      port: number;
      tags?: string[];
    }
  ): ServiceInstance {
    const serviceInstance: ServiceInstance = {
      id: crypto.randomUUID(),
      name: serviceData.name,
      url: serviceData.url,
      metadata: {
        host: serviceData.host,
        port: serviceData.port,
        status: 'healthy',
        lastHeartbeat: new Date()
      },
      tags: serviceData.tags || []
    };

    const existingInstances = this.services.get(serviceData.name) || [];
    existingInstances.push(serviceInstance);
    this.services.set(serviceData.name, existingInstances);

    this.emit('serviceRegistered', serviceInstance);
    return serviceInstance;
  }

  findServices(
    query: {
      name?: string;
      tags?: string[];
    }
  ): ServiceInstance[] {
    if (query.name) {
      const services = this.services.get(query.name) || [];
      
      if (query.tags) {
        return services.filter(service => 
          query.tags?.every(tag => service.tags?.includes(tag))
        );
      }

      return services;
    }

    return [];
  }

  performHealthCheck() {
    const now = new Date();
    
    this.services.forEach((instances, serviceName) => {
      instances.forEach(instance => {
        // Check if last heartbeat is more than 2 minutes old
        const timeSinceLastHeartbeat = 
          now.getTime() - instance.metadata.lastHeartbeat.getTime();
        
        if (timeSinceLastHeartbeat > 2 * 60 * 1000) {
          instance.metadata.status = 'unhealthy';
          this.emit('serviceUnhealthy', instance);
        }
      });
    });
  }

  generateServiceDiscoveryReport(): string {
    const reportLines = [
      '# Service Discovery Report',
      '## Registered Services',
      ,
      ...Array.from(this.services.entries()).map(([name, instances]) => 
         +
        
      )
    ];

    return reportLines.join('\n');
  }
}

interface ServiceInstance {
  id: string;
  name: string;
  url: string;
  metadata: {
    host: string;
    port: number;
    status: 'healthy' | 'unhealthy';
    lastHeartbeat: Date;
  };
  tags?: string[];
}

export default ServiceDiscoveryService;
