
export enum TicketPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum KnowledgeLevel {
  BASIC = 1,
  INTERMEDIATE = 2,
  ADVANCED = 3
}

export interface SystemExpertise {
  systemName: string;
  level: KnowledgeLevel;
}

export interface Agent {
  id: number;
  name: string;
  email: string;
  maxCapacity: number;
  currentWorkload: number;
  skills: string[];
  expertise: SystemExpertise[];
  isActive: boolean;
  avatarUrl?: string;
  groupIds?: string[];
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  tags: string[];
  status: string;
  customFields?: Record<string, any>;
  formId?: string;
}

export interface AssignmentMemory {
  tag: string;
  agentId: number;
  successCount: number;
}

export interface AssignmentLog {
  id: string;
  ticketId: string;
  agentName: string;
  timestamp: number;
  reason: string;
  type: 'autopilot' | 'manual';
  score: number;
}

export interface AppSettings {
  subdomain: string;
  apiToken: string;
  email: string;
  defaultMaxCapacity: number;
  autoAssignHighPriority: boolean;
  overloadThreshold: number;
  isAutopilotEnabled: boolean;
  queueId: string;
  formId: string;
  systemFieldId: string;
  allowedGroupIds: string[];
}
