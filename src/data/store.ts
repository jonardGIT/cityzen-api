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

const now = new Date();

  { id: 'uuid-citizen-1', name: 'Jane Doe', contactInfo: 'jane@example.com', preferredChannel: 'SMS' },
];

export const agencies: Agency[] = [
  { id: 'uuid-agency-1', name: 'City Fire Department', contactNumber: '+1-555-0100' },
  { id: 'uuid-agency-2', name: 'EMS Unit', contactNumber: '+1-555-0101' },
];
];

  {
    id: 'uuid-responder-1',
    name: 'Alex Smith',
    agencyId: 'uuid-agency-1',
    agency: agencies[0],
    role: 'Field Responder',
    contactInfo: 'alex@agency.gov',
  },
];

  { id: 'uuid-status-1', name: 'Reported' },
  { id: 'uuid-status-2', name: 'In Progress' },
  { id: 'uuid-status-3', name: 'Resolved' },
];

export const categories: Category[] = [
  { id: 'uuid-category-1', name: 'Fire', subCategory: 'Residential' },
  { id: 'uuid-category-2', name: 'Medical', subCategory: 'Emergency' },
];

export const severities: Severity[] = [
  { id: 'uuid-severity-1', level: 'Low', definition: 'Minimal impact' },
  { id: 'uuid-severity-2', level: 'High', definition: 'Immediate action required' },
=======
  { id: 1, createdAt: now, updatedAt: now, name: 'Reported' },
  { id: 2, createdAt: now, updatedAt: now, name: 'In Progress' },
  { id: 3, createdAt: now, updatedAt: now, name: 'Resolved' },
];

export const categories: Category[] = [
  { id: 1, createdAt: now, updatedAt: now, name: 'Fire', subCategory: 'Residential' },
  { id: 2, createdAt: now, updatedAt: now, name: 'Medical', subCategory: 'Emergency' },
];

export const severities: Severity[] = [
  { id: 1, createdAt: now, updatedAt: now, level: 'Low', definition: 'Minimal impact' },
  { id: 2, createdAt: now, updatedAt: now, level: 'High', definition: 'Immediate action required' },
>>>>>>> develop
];

export const locations: Location[] = [
  {
<<<<<<< HEAD
    id: 'uuid-location-1',
=======
    id: 1,
    createdAt: now,
    updatedAt: now,
>>>>>>> develop
    district: 'District 1',
    city: 'Sample City',
    province: 'Sample Province',
    region: 'Region A',
  },
];

export const incidents: CitizenIncident[] = [
  {
<<<<<<< HEAD
    id: 'uuid-incident-1',
=======
    id: 1,
    createdAt: now,
    updatedAt: now,
>>>>>>> develop
    description: 'Small kitchen fire reported by resident.',
    dateReported: new Date(),
    statusId: 'uuid-status-1',
    citizenId: 'uuid-citizen-1',
    locationId: 'uuid-location-1',
    categoryId: 'uuid-category-1',
    severityId: 'uuid-severity-2',
  },
];

export const assignments: Assignment[] = [
  {
<<<<<<< HEAD
    id: 'uuid-assignment-1',
    incidentId: 'uuid-incident-1',
    responderId: 'uuid-responder-1',
=======
    id: 1,
    createdAt: now,
    updatedAt: now,
    incidentId: 1,
    responderId: 1,
>>>>>>> develop
    assignedDate: new Date(),
    notes: 'Initial dispatch sent.',
  },
];

// getNextId removed: UUIDs are now used for all ids.
