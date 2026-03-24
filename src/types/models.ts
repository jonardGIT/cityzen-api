export interface CitizenIncident {
  id: number;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
  name: string;
  contactInfo: string;
  preferredChannel: string;
}

export interface Agency {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  contactNumber?: string;
}

export interface Responder {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  agencyId: number;
  agency?: Agency;
  role: string;
  contactInfo: string;
}

export interface Assignment {
  id: number;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
  name: string;
}

export interface Category {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  subCategory?: string;
}

export interface Severity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  level: string;
  definition?: string;
}

export interface Location {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  district: string;
  city: string;
  province: string;
  region: string;
}
