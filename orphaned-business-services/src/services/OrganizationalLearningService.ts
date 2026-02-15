
import crypto from "crypto";
import { EventEmitter } from "events";

class OrganizationalLearningService extends EventEmitter {
  private learningContents: Map<string, LearningContent> = new Map();

  createLearningContent(
    contentData: {
      title: string;
      type: "course" | "training" | "workshop";
      category: string;
      difficulty: "beginner" | "intermediate" | "advanced";
    }
  ): LearningContent {
    const content: LearningContent = {
      id: crypto.randomUUID(),
      ...contentData,
      createdAt: new Date()
    };

    this.learningContents.set(content.id, content);
    this.emit("learningContentCreated", content);

    return content;
  }
}

interface LearningContent {
  id: string;
  title: string;
  type: "course" | "training" | "workshop";
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  createdAt: Date;
}

export default OrganizationalLearningService;

