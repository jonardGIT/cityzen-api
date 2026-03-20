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

export const citizens: Citizen[] = [
  { id: 1, name: 'Jane Doe', contactInfo: 'jane@example.com', preferredChannel: 'SMS' },
];

export const agencies: Agency[] = [
  { id: 1, name: 'City Fire Department', contactNumber: '+1-555-0100' },
  { id: 2, name: 'EMS Unit', contactNumber: '+1-555-0101' },
];

export const responders: Responder[] = [
  {
    id: 1,
    name: 'Alex Smith',
    agencyId: 1,
    agency: agencies[0],
    role: 'Field Responder',
    contactInfo: 'alex@agency.gov',
  },
];

export const statuses: Status[] = [
  { id: 1, name: 'Reported' },
  { id: 2, name: 'In Progress' },
  { id: 3, name: 'Resolved' },
];

export const categories: Category[] = [
  { id: 1, name: 'Fire', subCategory: 'Residential' },
  { id: 2, name: 'Medical', subCategory: 'Emergency' },
];

export const severities: Severity[] = [
  { id: 1, level: 'Low', definition: 'Minimal impact' },
  { id: 2, level: 'High', definition: 'Immediate action required' },
];

export const locations: Location[] = [
  {
    id: 1,
    district: 'District 1',
    city: 'Sample City',
    province: 'Sample Province',
    region: 'Region A',
  },
];

export const incidents: CitizenIncident[] = [
  {
    id: 1,
    description: 'Small kitchen fire reported by resident.',
    dateReported: new Date(),
    statusId: 1,
    citizenId: 1,
    locationId: 1,
    categoryId: 1,
    severityId: 2,
  },
];

export const assignments: Assignment[] = [
  {
    id: 1,
    incidentId: 1,
    responderId: 1,
    assignedDate: new Date(),
    notes: 'Initial dispatch sent.',
  },
];

export function getNextId<T extends { id: number }>(items: T[]): number {
  if (items.length === 0) {
    return 1;
  }
  return Math.max(...items.map((item) => item.id)) + 1;
}
