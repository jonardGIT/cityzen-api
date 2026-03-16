export interface CitizenIncident {
  id: number;
  description: string;
  mediaUrl?: string;
  dateReported: Date;
  statusId: number;
  citizenId: number;
  locationId: number;
  categoryId: number;
  severityId: number;
}

export interface Citizen {
  id: number;
  name: string;
  contactInfo: string;
  preferredChannel: string;
}

export interface Responder {
  id: number;
  name: string;
  agency: string;
  role: string;
  contactInfo: string;
}

export interface Assignment {
  id: number;
  incidentId: number;
  responderId: number;
  assignedDate: Date;
  responseStart?: Date;
  responseEnd?: Date;
  outcome?: string;
  notes?: string;
}

export interface Status {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  subCategory?: string;
}

export interface Severity {
  id: number;
  level: string;
  definition?: string;
}

export interface Location {
  id: number;
  district: string;
  city: string;
  province: string;
  region: string;
}
