export interface CitizenIncident {
  id: string;
  description: string;
  mediaUrl?: string;
  dateReported: Date;
  statusId: string;
  citizenId: string;
  locationId: string;
  categoryId: string;
  severityId: string;
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

export interface Location {
  id: string;
  district: string;
  city: string;
  province: string;
  region: string;
}
