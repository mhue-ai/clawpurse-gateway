
import crypto from "crypto";
import { EventEmitter } from "events";

class WorkflowOrchestrationService extends EventEmitter {
  private workflows: Map<string, WorkflowDefinition> = new Map();

  createWorkflow(
    workflowData: {
      name: string;
      description: string;
      type: "sequential" | "parallel" | "event-driven";
    }
  ): WorkflowDefinition {
    const workflow: WorkflowDefinition = {
      id: crypto.randomUUID(),
      ...workflowData,
      status: "draft",
      createdAt: new Date()
    };

    this.workflows.set(workflow.id, workflow);
    this.emit("workflowCreated", workflow);

    return workflow;
  }
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  type: "sequential" | "parallel" | "event-driven";
  status: "draft" | "active" | "completed";
  createdAt: Date;
}

export default WorkflowOrchestrationService;

