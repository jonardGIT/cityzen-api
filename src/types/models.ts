export interface CitizenIncident {
  id: string;
  description: string;
  mediaUrl?: string;
  dateReported: Date;
  latitude?: number;
  longitude?: number;
  addressLine1?: string;
  addressLine2?: string;
  barangay?: string;
  districtName?: string;
  cityName?: string;
  provinceName?: string;
  regionName?: string;
  postalCode?: string;
  landmark?: string;
  statusId: string;
  citizenId: string;
  categoryId: string;
  severityId: string;
}

export interface AuditLog {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  timestamp: Date;
  action: string;
  summary: string;
  outcome: 'success' | 'failure';
  actorUserId?: string;
  actorEmail?: string;
  actorRole?: string;
  resource: string;
  method: string;
  path: string;
  statusCode?: number;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown> | null;
}

export interface Citizen {
  id: string;
  name: string;
  contactInfo: string;
  preferredChannel: string;
}

export interface Agency {
  id: string;
  name: string;
  contactNumber?: string;
}

export interface Responder {
  id: string;
  name: string;
  agencyId: string;
  agency?: Agency;
  role: string;
  contactInfo: string;
}

export interface Assignment {
  id: string;
  incidentId: string;
  responderId: string;
  assignedDate: Date;
  responseStart?: Date;
  responseEnd?: Date;
  outcome?: string;
  notes?: string;
}

export interface Status {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  subCategory?: string;
}

export interface Severity {
  id: string;
  level: string;
  definition?: string;
}
