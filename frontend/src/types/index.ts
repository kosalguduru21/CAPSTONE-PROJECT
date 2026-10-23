export type UserRole = 'resident' | 'property_manager' | 'vendor_technician';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phoneNumber?: string;
  emailVerified: boolean;
  propertyIds?: string[];
  propertyScope?: string[];
  residentPropertyId?: string;
  unitId?: string | {
    _id: string;
    unitNumber: string;
    buildingId?: {
      _id: string;
      name: string;
    };
  };
  vendorId?: string | {
    _id: string;
    name: string;
    skills: string[];
  };
  createdAt: string;
}

export type WorkOrderStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Awaiting Estimate'
  | 'Awaiting Approval'
  | 'Approved'
  | 'Scheduled'
  | 'Assigned'
  | 'In Progress'
  | 'Work Completed — Awaiting Review'
  | 'Resolved'
  | 'Reopened'
  | 'Cancelled'
  | 'Rejected';

export type PriorityLevel = 'Low' | 'Normal' | 'High' | 'Emergency';

export interface AccessWindow {
  date: string; // YYYY-MM-DD
  timeSlot: 'Morning (8am-12pm)' | 'Afternoon (12pm-4pm)' | 'Evening (4pm-8pm)';
}

export interface Attachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface EstimateLineItem {
  description: string;
  category: 'Labor' | 'Material' | 'Permit' | 'Other';
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Estimate {
  _id: string;
  workOrderId: string;
  vendorId: string | { _id: string; name: string };
  revision: number;
  lineItems: EstimateLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  exclusions?: string;
  validUntil?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Revision Requested';
  decisionNotes?: string;
  createdAt: string;
}

export interface WorkOrder {
  _id: string;
  orderNumber: string;
  propertyId: {
    _id: string;
    name: string;
    address?: { street: string; city: string; state: string; zip: string };
  };
  unitId?: {
    _id: string;
    unitNumber: string;
    buildingId?: { _id: string; name: string };
  };
  sharedAreaDescription?: string;
  residentId: {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
  };
  category: string;
  title: string;
  description: string;
  priority: PriorityLevel;
  status: WorkOrderStatus;
  preferredAccessWindows: AccessWindow[];
  accessNotes?: string;
  attachments: Attachment[];
  currentAssignment?: string | any;
  activeEstimate?: Estimate;
  completionNotes?: string;
  completionEvidence: Attachment[];
  completedAt?: string;
  reopenReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notice {
  _id: string;
  title: string;
  content: string;
  category: string;
  propertyId?: string;
  effectiveDate: string;
  isPublic: boolean;
}

export interface CommunityInfo {
  propertyName: string;
  officeHours: string;
  emergencyContacts: Array<{
    name: string;
    phone: string;
    serviceType: string;
  }>;
  generalInquiries: string;
}

export interface Vendor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Approved' | 'Suspended' | 'Pending Review';
  skills: string[];
  maxActiveJobs: number;
  currentActiveJobs: number;
  hourlyRate: number;
}

export interface DocumentRecord {
  _id: string;
  title: string;
  documentType: string;
  originalFilename: string;
  processingStatus: 'Pending' | 'Extracting' | 'Embedding' | 'Ready' | 'Failed';
  chunkCount: number;
  createdAt: string;
  errorMessage?: string;
}

export interface RelatedCaseMatch {
  workOrder: WorkOrder;
  similarityScore: number;
  relationshipStatus: 'Potential' | 'Confirmed Related' | 'Confirmed Unrelated';
  investigationNotes?: string;
}

export interface SchedulingProposalItem {
  orderId: string;
  orderNumber: string;
  title: string;
  category: string;
  unitNumber?: string;
  residentName?: string;
  suggestedTechnician: {
    id: string;
    name: string;
    vendorName: string;
  };
  proposedSlot: {
    date: string;
    timeSlot: string;
  };
}

export interface SchedulingProposal {
  proposalId: string;
  propertyId: string;
  scheduledProposals: SchedulingProposalItem[];
  conflicts: Array<{
    orderId: string;
    orderNumber: string;
    reason: string;
  }>;
  summary: string;
  toolExecutions: Array<{
    toolName: string;
    status: 'success' | 'failure';
    durationMs: number;
    summary: string;
  }>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    documentTitle: string;
    source: string;
    chunkIndex: number;
  }>;
  isEmergencyAlert?: boolean;
  timestamp: string;
}
