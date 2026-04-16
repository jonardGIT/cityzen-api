export interface IncidentTrustInfo {
  caseToken: string;
  caseLookupPath: string;
  caseTokenExpiresAt: string;
  publicStatusMessage: string;
}

export interface IncidentTimelineEntry {
  id: string;
  changedAt: string;
  fromStatus: {
    id: string;
    name: string;
  } | null;
  toStatus: {
    id: string;
    name: string;
  };
  changedByUser: {
    id: string;
    email: string;
    role: string;
  } | null;
  note: string | null;
}

export interface PublicIncidentTimelineEntry {
  id: string;
  changedAt: string;
  status: {
    name: string;
  };
  publicStatusMessage: string;
}

export interface PublicCaseLookupResponse {
  publicReference: string | null;
  status: {
    name: string;
  };
  publicStatusMessage: string;
  caseTokenExpiresAt: string;
  reportedAt: string;
  lastUpdatedAt: string;
  barangay: string | null;
  cityName: string | null;
  provinceName: string | null;
  category: {
    name: string;
    subCategory: string | null;
  };
  severity: {
    level: string;
    definition: string | null;
  };
  timeline: PublicIncidentTimelineEntry[];
}
