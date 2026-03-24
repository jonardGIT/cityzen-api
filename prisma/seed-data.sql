  BEGIN;

  -- Reset data in dependency order so the script is re-runnable.
  TRUNCATE TABLE
    assignments,
    incidents,
    responders,
    agencies,
    citizens,
    statuses,
    categories,
    severities,
    locations,
    "User"
  RESTART IDENTITY CASCADE;

  -- Users with role/access level.
  -- Default password for all seeded users: Password123!
  INSERT INTO "User" (name, email, "passwordHash", role, "createdAt", "updatedAt") VALUES
    ('Admin User', 'admin@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'SUPER_ADMIN', NOW() - INTERVAL '14 days', NOW() - INTERVAL '2 days'),
    ('Ops Lead', 'ops.lead@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'ADMIN', NOW() - INTERVAL '12 days', NOW() - INTERVAL '3 days'),
    ('Dispatcher', 'dispatcher@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'DISPATCHER', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day'),
    ('Analyst', 'analyst@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'VIEWER', NOW() - INTERVAL '8 days', NOW() - INTERVAL '12 hours'),
    ('Supervisor', 'supervisor@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'RESPONDER', NOW() - INTERVAL '6 days', NOW() - INTERVAL '8 hours');

  -- Statuses (16) aligned to typical LGU incident operations.
  INSERT INTO statuses (name, "createdAt", "updatedAt") VALUES
    ('Reported', NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days'),
    ('Verified', NOW() - INTERVAL '16 days', NOW() - INTERVAL '15 days'),
    ('For Dispatch', NOW() - INTERVAL '16 days', NOW() - INTERVAL '15 days'),
    ('Dispatched', NOW() - INTERVAL '16 days', NOW() - INTERVAL '14 days'),
    ('Responding', NOW() - INTERVAL '16 days', NOW() - INTERVAL '14 days'),
    ('On Site', NOW() - INTERVAL '16 days', NOW() - INTERVAL '13 days'),
    ('Action Ongoing', NOW() - INTERVAL '16 days', NOW() - INTERVAL '13 days'),
    ('Needs Escalation', NOW() - INTERVAL '16 days', NOW() - INTERVAL '12 days'),
    ('Resolved', NOW() - INTERVAL '16 days', NOW() - INTERVAL '12 days'),
    ('Closed', NOW() - INTERVAL '16 days', NOW() - INTERVAL '11 days'),
    ('Reopened', NOW() - INTERVAL '16 days', NOW() - INTERVAL '10 days'),
    ('False Alarm', NOW() - INTERVAL '16 days', NOW() - INTERVAL '10 days'),
    ('Duplicate Report', NOW() - INTERVAL '16 days', NOW() - INTERVAL '9 days'),
    ('Pending Approval', NOW() - INTERVAL '16 days', NOW() - INTERVAL '9 days'),
    ('Cancelled', NOW() - INTERVAL '16 days', NOW() - INTERVAL '8 days'),
    ('Archived', NOW() - INTERVAL '16 days', NOW() - INTERVAL '8 days');

  -- Categories (16) focused on common local-government incidents.
  INSERT INTO categories (name, "subCategory", "createdAt", "updatedAt") VALUES
    ('Fire Incident', 'Residential Structure', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
    ('Medical Emergency', 'Patient Transport', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
    ('Road Accident', 'Vehicle Collision', NOW() - INTERVAL '15 days', NOW() - INTERVAL '13 days'),
    ('Flooding', 'Urban Drainage Overflow', NOW() - INTERVAL '15 days', NOW() - INTERVAL '13 days'),
    ('Landslide', 'Road Obstruction', NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days'),
    ('Earthquake Related', 'Structural Damage Assessment', NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days'),
    ('Public Safety', 'Crime or Disturbance Report', NOW() - INTERVAL '15 days', NOW() - INTERVAL '11 days'),
    ('Utility Disruption', 'Power or Water Service Outage', NOW() - INTERVAL '15 days', NOW() - INTERVAL '11 days'),
    ('Hazardous Material', 'Chemical or Fuel Spill', NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days'),
    ('Search and Rescue', 'Missing Person or Water Rescue', NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days'),
    ('Storm Impact', 'Strong Wind Damage', NOW() - INTERVAL '15 days', NOW() - INTERVAL '9 days'),
    ('Public Infrastructure', 'Bridge or Roadway Damage', NOW() - INTERVAL '15 days', NOW() - INTERVAL '9 days'),
    ('Environmental Incident', 'River or Coastal Pollution', NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days'),
    ('Animal-Related Incident', 'Stray or Dangerous Animal Response', NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days'),
    ('Public Event Incident', 'Crowd Control or Safety Risk', NOW() - INTERVAL '15 days', NOW() - INTERVAL '7 days'),
    ('Evacuation Support', 'Preemptive or Emergency Evacuation', NOW() - INTERVAL '15 days', NOW() - INTERVAL '7 days');

  -- Severities (16) suitable for LGU dispatch and escalation decisions.
  INSERT INTO severities (level, definition, "createdAt", "updatedAt") VALUES
    ('Level 1 - Information', 'For documentation and monitoring; no deployment needed.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
    ('Level 2 - Minor', 'Low-impact issue with minimal public safety risk.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
    ('Level 3 - Routine Response', 'Requires standard responder deployment.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
    ('Level 4 - Priority Response', 'Needs quick response to prevent escalation.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '13 days'),
    ('Level 5 - High Priority', 'Clear threat to life, property, or critical access routes.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '13 days'),
    ('Level 6 - Critical', 'Immediate intervention required; multiple units may be needed.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days'),
    ('Level 7 - Severe', 'High-impact event affecting multiple households/blocks.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days'),
    ('Level 8 - Major', 'City-level incident requiring inter-office coordination.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '11 days'),
    ('Level 9 - Extreme', 'Large-scale emergency with prolonged operations expected.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '11 days'),
    ('Level 10 - Disaster', 'Widespread disaster condition requiring full LGU activation.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days'),
    ('Level 11 - Life Threatening', 'Immediate danger to multiple lives with ongoing exposure.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days'),
    ('Level 12 - Critical Infrastructure', 'Severe impact to hospitals, water, power, or transport systems.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '9 days'),
    ('Level 13 - Regional Emergency', 'Incident impact extends beyond city boundaries.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '9 days'),
    ('Level 14 - Prolonged Operations', 'Multi-day response requiring sustained command and logistics.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days'),
    ('Level 15 - Mass Casualty Risk', 'High probability of mass casualty scenario.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days'),
    ('Level 16 - Full Mobilization', 'Requires full LGU emergency operations center activation.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '7 days');

  -- Locations (10): realistic barangay-level areas in one city operation zone.
  INSERT INTO locations (district, city, province, region, "createdAt", "updatedAt") VALUES
    ('District 1 - Batasan', 'Quezon City', 'Metro Manila', 'NCR', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days'),
    ('District 2 - Commonwealth', 'Quezon City', 'Metro Manila', 'NCR', NOW() - INTERVAL '19 days', NOW() - INTERVAL '5 days'),
    ('District 3 - Cubao', 'Quezon City', 'Metro Manila', 'NCR', NOW() - INTERVAL '18 days', NOW() - INTERVAL '4 days'),
    ('District 4 - Novaliches', 'Quezon City', 'Metro Manila', 'NCR', NOW() - INTERVAL '17 days', NOW() - INTERVAL '4 days'),
    ('District 5 - Project 6', 'Quezon City', 'Metro Manila', 'NCR', NOW() - INTERVAL '16 days', NOW() - INTERVAL '3 days'),
    ('District 6 - Tandang Sora', 'Quezon City', 'Metro Manila', 'NCR', NOW() - INTERVAL '15 days', NOW() - INTERVAL '3 days'),
    ('District 7 - Holy Spirit', 'Quezon City', 'Metro Manila', 'NCR', NOW() - INTERVAL '14 days', NOW() - INTERVAL '2 days'),
    ('District 8 - Fairview', 'Quezon City', 'Metro Manila', 'NCR', NOW() - INTERVAL '13 days', NOW() - INTERVAL '2 days'),
    ('District 9 - Kamias', 'Quezon City', 'Metro Manila', 'NCR', NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 day'),
    ('District 10 - Diliman', 'Quezon City', 'Metro Manila', 'NCR', NOW() - INTERVAL '11 days', NOW() - INTERVAL '1 day');

  -- Citizens (10): residents submitting typhoon-weekend incident reports.
  INSERT INTO citizens (name, "contactInfo", "preferredChannel", "createdAt", "updatedAt") VALUES
    ('Mika dela Cruz', 'mika.delacruz@example.com', 'SMS', NOW() - INTERVAL '9 days', NOW() - INTERVAL '18 hours'),
    ('Ronnie Villareal', 'ronnie.villareal@example.com', 'Call', NOW() - INTERVAL '8 days', NOW() - INTERVAL '20 hours'),
    ('Aileen Santiago', 'aileen.santiago@example.com', 'Email', NOW() - INTERVAL '7 days', NOW() - INTERVAL '16 hours'),
    ('Noel Ramos', 'noel.ramos@example.com', 'SMS', NOW() - INTERVAL '6 days', NOW() - INTERVAL '14 hours'),
    ('Jessa Bautista', 'jessa.bautista@example.com', 'Call', NOW() - INTERVAL '5 days', NOW() - INTERVAL '12 hours'),
    ('Paolo Natividad', 'paolo.natividad@example.com', 'SMS', NOW() - INTERVAL '4 days', NOW() - INTERVAL '10 hours'),
    ('Lea Fernandez', 'lea.fernandez@example.com', 'Email', NOW() - INTERVAL '3 days', NOW() - INTERVAL '8 hours'),
    ('Mark Villanueva', 'mark.villanueva@example.com', 'Call', NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 hours'),
    ('Trina Co', 'trina.co@example.com', 'SMS', NOW() - INTERVAL '36 hours', NOW() - INTERVAL '4 hours'),
    ('Josef Tan', 'josef.tan@example.com', 'Email', NOW() - INTERVAL '24 hours', NOW() - INTERVAL '2 hours');

  -- Agencies (5): field command contacts used by dispatch.
  INSERT INTO agencies (name, "contactNumber", "createdAt", "updatedAt") VALUES
    ('Quezon City Fire District', '+63-2-8928-8363', NOW() - INTERVAL '14 days', NOW() - INTERVAL '3 days'),
    ('Quezon City EMS Command', '+63-2-8898-6722', NOW() - INTERVAL '13 days', NOW() - INTERVAL '3 days'),
    ('Quezon City Police District', '+63-2-8723-0401', NOW() - INTERVAL '12 days', NOW() - INTERVAL '2 days'),
    ('QC Disaster Risk Reduction Office', '+63-2-8709-1923', NOW() - INTERVAL '11 days', NOW() - INTERVAL '2 days'),
    ('Metro Rescue Task Group', '+63-917-555-0440', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day');

  -- Responders (10): assigned personnel mapped to proper agencies.
  INSERT INTO responders (name, "agencyId", role, "contactInfo", "createdAt", "updatedAt") VALUES
    ('Capt. Luis Herrera', 1, 'Fire Incident Commander', 'l.herrera@qcfire.gov.ph', NOW() - INTERVAL '9 days', NOW() - INTERVAL '30 hours'),
    ('FO1 Carla Santos', 1, 'Pump Operator', 'c.santos@qcfire.gov.ph', NOW() - INTERVAL '8 days', NOW() - INTERVAL '28 hours'),
    ('EMT Bryan Lim', 2, 'Paramedic', 'b.lim@qcems.gov.ph', NOW() - INTERVAL '7 days', NOW() - INTERVAL '26 hours'),
    ('Nurse Tricia Ong', 2, 'Emergency Nurse', 't.ong@qcems.gov.ph', NOW() - INTERVAL '6 days', NOW() - INTERVAL '24 hours'),
    ('PSMS Joel Navarro', 3, 'Traffic Control Officer', 'j.navarro@qcpd.gov.ph', NOW() - INTERVAL '5 days', NOW() - INTERVAL '22 hours'),
    ('PLT Ana Cruz', 3, 'Investigator', 'a.cruz@qcpd.gov.ph', NOW() - INTERVAL '4 days', NOW() - INTERVAL '20 hours'),
    ('Engr. Marco Sy', 4, 'Operations Officer', 'm.sy@qcdrro.gov.ph', NOW() - INTERVAL '3 days', NOW() - INTERVAL '18 hours'),
    ('Iris Mateo', 4, 'Logistics Coordinator', 'i.mateo@qcdrro.gov.ph', NOW() - INTERVAL '60 hours', NOW() - INTERVAL '12 hours'),
    ('Ruben Alvarez', 5, 'Swift Water Rescue Lead', 'r.alvarez@rescuetask.ph', NOW() - INTERVAL '48 hours', NOW() - INTERVAL '8 hours'),
    ('Kim Garcia', 5, 'Search Specialist', 'k.garcia@rescuetask.ph', NOW() - INTERVAL '36 hours', NOW() - INTERVAL '6 hours');

  -- Incidents (10): one continuous typhoon-event timeline with varied states.
  INSERT INTO incidents (
    description,
    "mediaUrl",
    "createdAt",
    "updatedAt",
    "dateReported",
    "statusId",
    "citizenId",
    "locationId",
    "categoryId",
    "severityId"
  ) VALUES
    ('Kitchen fire triggered by electrical short after power restoration.', 'https://example.com/media/qc-incident-001.jpg', NOW() - INTERVAL '36 hours', NOW() - INTERVAL '34 hours', NOW() - INTERVAL '36 hours', 10, 1, 3, 1, 6),
    ('Senior citizen with breathing difficulty during flood evacuation.', 'https://example.com/media/qc-incident-002.jpg', NOW() - INTERVAL '30 hours', NOW() - INTERVAL '28 hours', NOW() - INTERVAL '30 hours', 9, 2, 2, 2, 5),
    ('Three-vehicle collision on wet overpass near Cubao.', 'https://example.com/media/qc-incident-003.jpg', NOW() - INTERVAL '26 hours', NOW() - INTERVAL '24 hours', NOW() - INTERVAL '26 hours', 9, 3, 3, 3, 5),
    ('Waist-deep flooding blocking access to elementary school.', 'https://example.com/media/qc-incident-004.jpg', NOW() - INTERVAL '22 hours', NOW() - INTERVAL '16 hours', NOW() - INTERVAL '22 hours', 7, 4, 8, 4, 8),
    ('Collapsed roadside wall causing partial lane obstruction.', 'https://example.com/media/qc-incident-005.jpg', NOW() - INTERVAL '18 hours', NOW() - INTERVAL '13 hours', NOW() - INTERVAL '18 hours', 6, 5, 6, 12, 7),
    ('Possible fuel leak reported from delivery truck after crash.', 'https://example.com/media/qc-incident-006.jpg', NOW() - INTERVAL '14 hours', NOW() - INTERVAL '11 hours', NOW() - INTERVAL '14 hours', 6, 6, 9, 9, 9),
    ('Neighborhood outage affecting water pumping station.', 'https://example.com/media/qc-incident-007.jpg', NOW() - INTERVAL '10 hours', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '10 hours', 5, 7, 10, 8, 6),
    ('Missing teenage swimmer reported near overflow creek.', 'https://example.com/media/qc-incident-008.jpg', NOW() - INTERVAL '7 hours', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '7 hours', 5, 8, 7, 10, 8),
    ('Suspicious activity reported in temporary evacuation center.', 'https://example.com/media/qc-incident-009.jpg', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '4 hours', 4, 9, 1, 7, 4),
    ('Fallen tree blocking barangay access road after strong winds.', 'https://example.com/media/qc-incident-010.jpg', NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '90 minutes', 1, 10, 4, 11, 4);

  -- Assignments (10): includes resolved and ongoing operations.
  INSERT INTO assignments (
    "incidentId",
    "responderId",
    "createdAt",
    "updatedAt",
    "assignedDate",
    "responseStart",
    "responseEnd",
    outcome,
    notes
  ) VALUES
    (1, 1, NOW() - INTERVAL '35 hours 50 minutes', NOW() - INTERVAL '34 hours 30 minutes', NOW() - INTERVAL '35 hours 50 minutes', NOW() - INTERVAL '35 hours 42 minutes', NOW() - INTERVAL '34 hours 30 minutes', 'Contained', 'Fire knocked down in 20 minutes; overhaul completed.'),
    (2, 3, NOW() - INTERVAL '29 hours 45 minutes', NOW() - INTERVAL '28 hours 55 minutes', NOW() - INTERVAL '29 hours 45 minutes', NOW() - INTERVAL '29 hours 38 minutes', NOW() - INTERVAL '28 hours 55 minutes', 'Stabilized', 'Patient stabilized and transferred to East Avenue Medical Center.'),
    (3, 5, NOW() - INTERVAL '25 hours 45 minutes', NOW() - INTERVAL '24 hours 50 minutes', NOW() - INTERVAL '25 hours 45 minutes', NOW() - INTERVAL '25 hours 39 minutes', NOW() - INTERVAL '24 hours 50 minutes', 'Cleared', 'Traffic restored after towing and scene documentation.'),
    (4, 7, NOW() - INTERVAL '21 hours 50 minutes', NOW() - INTERVAL '16 hours 20 minutes', NOW() - INTERVAL '21 hours 50 minutes', NOW() - INTERVAL '21 hours 35 minutes', NOW() - INTERVAL '16 hours 20 minutes', 'Mitigated', 'Flood barriers and pumps deployed; road passable to light vehicles.'),
    (5, 7, NOW() - INTERVAL '17 hours 45 minutes', NOW() - INTERVAL '13 hours 40 minutes', NOW() - INTERVAL '17 hours 45 minutes', NOW() - INTERVAL '17 hours 33 minutes', NOW() - INTERVAL '13 hours 40 minutes', 'Partially Cleared', 'Engineering team requested for retaining wall inspection.'),
    (6, 8, NOW() - INTERVAL '13 hours 45 minutes', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '13 hours 45 minutes', NOW() - INTERVAL '13 hours 31 minutes', NULL, 'Action Ongoing', 'Hot zone isolated; awaiting hazmat contractor clearance report.'),
    (7, 8, NOW() - INTERVAL '9 hours 45 minutes', NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '9 hours 45 minutes', NOW() - INTERVAL '9 hours 39 minutes', NULL, 'Action Ongoing', 'Power utility coordination in progress; backup generator deployed.'),
    (8, 9, NOW() - INTERVAL '6 hours 50 minutes', NOW() - INTERVAL '55 minutes', NOW() - INTERVAL '6 hours 50 minutes', NOW() - INTERVAL '6 hours 38 minutes', NULL, 'Search Ongoing', 'Riverbank sweep expanded to downstream sector Bravo.'),
    (9, 6, NOW() - INTERVAL '3 hours 45 minutes', NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '3 hours 45 minutes', NOW() - INTERVAL '3 hours 36 minutes', NULL, 'Under Investigation', 'CCTV retrieval requested from evacuation center admin.'),
    (10, 2, NOW() - INTERVAL '80 minutes', NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '80 minutes', NULL, NULL, 'For Dispatch', 'Crew on standby pending final route safety confirmation.');

  COMMIT;
