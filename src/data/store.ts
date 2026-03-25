import type {
  Agency,
  Assignment,
  Category,
  Citizen,
  CitizenIncident,
  Location,
  Responder,
  Severity,
  Status,
} from '../types/models.js';

// Sample citizens
export const citizens: Citizen[] = [
  { id: 'uuid-citizen-1', name: 'Jane Doe', contactInfo: 'jane@example.com', preferredChannel: 'SMS' },
];

// Sample agencies
export const agencies: Agency[] = [
  { id: 'uuid-agency-1', name: 'City Fire Department', contactNumber: '+1-555-0100' },
  { id: 'uuid-agency-2', name: 'EMS Unit', contactNumber: '+1-555-0101' },
];

// Sample responders
export const responders: Responder[] = [
  {
    id: 'uuid-responder-1',
    name: 'Alex Smith',
    agencyId: 'uuid-agency-1',
    agency: { id: 'uuid-agency-1', name: 'City Fire Department', contactNumber: '+1-555-0100' },
    role: 'Field Responder',
    contactInfo: 'alex@agency.gov',
  },
];

// Sample statuses
export const statuses: Status[] = [
  { id: 'uuid-status-1', name: 'Reported' },
  { id: 'uuid-status-2', name: 'In Progress' },
  { id: 'uuid-status-3', name: 'Resolved' },
];

// Sample categories
export const categories: Category[] = [
  { id: 'uuid-category-1', name: 'Fire', subCategory: 'Residential' },
  { id: 'uuid-category-2', name: 'Medical', subCategory: 'Emergency' },
];

// Sample severities
export const severities: Severity[] = [
  { id: 'uuid-severity-1', level: 'Low', definition: 'Minimal impact' },
  { id: 'uuid-severity-2', level: 'High', definition: 'Immediate action required' },
];

// Sample locations
export const locations: Location[] = [
  {
    id: 'uuid-location-1',
    district: 'District 1',
    city: 'Sample City',
    province: 'Sample Province',
    region: 'Region A',
  },
];

// Sample incidents
export const incidents: CitizenIncident[] = [
  {
    id: 'uuid-incident-1',
    description: 'Small kitchen fire reported by resident.',
    dateReported: new Date(),
    statusId: 'uuid-status-1',
    citizenId: 'uuid-citizen-1',
    locationId: 'uuid-location-1',
    categoryId: 'uuid-category-1',
    severityId: 'uuid-severity-2',
  },
];

// Sample assignments
export const assignments: Assignment[] = [
  {
    id: 'uuid-assignment-1',
    incidentId: 'uuid-incident-1',
    responderId: 'uuid-responder-1',
    assignedDate: new Date(),
    notes: 'Initial dispatch sent.',
  },
];
