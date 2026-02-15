import crypto from 'crypto';
import { EventEmitter } from 'events';

class MonitoringDashboardService extends EventEmitter {
  private metricDefinitions: Map<string, MetricDefinition> = new Map();
  private metricData: Map<string, MetricData[]> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();

  registerMetric(
    metricData: {
      name: string;
      type: 'gauge' | 'counter' | 'histogram';
      description?: string;
      unit?: string;
    }
  ): MetricDefinition {
    const metricDefinition: MetricDefinition = {
      id: crypto.randomUUID(),
      ...metricData
    };

    this.metricDefinitions.set(metricDefinition.id, metricDefinition);
    this.emit('metricRegistered', metricDefinition);

    return metricDefinition;
  }

  recordMetric(
    metricData: {
      metricId: string;
      value: number;
      labels?: Record<string, string>;
    }
  ): MetricData {
    const metric = this.metricDefinitions.get(metricData.metricId);
    
    if (!metric) {
      throw new Error();
    }

    const metricDataPoint: MetricData = {
      metricId: metricData.metricId,
      timestamp: new Date(),
      value: metricData.value,
      labels: metricData.labels
    };

    const existingData = this.metricData.get(metricData.metricId) || [];
    existingData.push(metricDataPoint);
    this.metricData.set(metricData.metricId, existingData);

    this.emit('metricDataRecorded', metricDataPoint);

    return metricDataPoint;
  }

  createDashboard(
    dashboardData: {
      name: string;
      description?: string;
      metrics: string[];
    }
  ): Dashboard {
    const dashboard: Dashboard = {
      id: crypto.randomUUID(),
      ...dashboardData,
      createdAt: new Date()
    };

    this.dashboards.set(dashboard.id, dashboard);
    this.emit('dashboardCreated', dashboard);

    return dashboard;
  }

  generateMonitoringReport(): string {
    const reportLines = [
      '# Monitoring Dashboard Report',
      '## Metric Definitions',
      ,
      '## Dashboards',
      
    ];

    return reportLines.join('\n');
  }
}

interface MetricDefinition {
  id: string;
  name: string;
  type: 'gauge' | 'counter' | 'histogram';
  description?: string;
  unit?: string;
}

interface MetricData {
  metricId: string;
  timestamp: Date;
  value: number;
  labels?: Record<string, string>;
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  metrics: string[];
  createdAt: Date;
}

export default MonitoringDashboardService;
