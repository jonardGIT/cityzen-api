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
  INSERT INTO "User" (name, email, "passwordHash", role) VALUES
    ('Admin User', 'admin@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'SUPER_ADMIN'),
    ('Ops Lead', 'ops.lead@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'ADMIN'),
    ('Dispatcher', 'dispatcher@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'DISPATCHER'),
    ('Analyst', 'analyst@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'VIEWER'),
    ('Supervisor', 'supervisor@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'RESPONDER');

  -- Statuses (16) aligned to typical LGU incident operations.
  INSERT INTO statuses (name) VALUES
    ('Reported'),
    ('Verified'),
    ('For Dispatch'),
    ('Dispatched'),
    ('Responding'),
    ('On Site'),
    ('Action Ongoing'),
    ('Needs Escalation'),
    ('Resolved'),
    ('Closed'),
    ('Reopened'),
    ('False Alarm'),
    ('Duplicate Report'),
    ('Pending Approval'),
    ('Cancelled'),
    ('Archived');

  -- Categories (16) focused on common local-government incidents.
  INSERT INTO categories (name, "subCategory") VALUES
    ('Fire Incident', 'Residential Structure'),
    ('Medical Emergency', 'Patient Transport'),
    ('Road Accident', 'Vehicle Collision'),
    ('Flooding', 'Urban Drainage Overflow'),
    ('Landslide', 'Road Obstruction'),
    ('Earthquake Related', 'Structural Damage Assessment'),
    ('Public Safety', 'Crime or Disturbance Report'),
    ('Utility Disruption', 'Power or Water Service Outage'),
    ('Hazardous Material', 'Chemical or Fuel Spill'),
    ('Search and Rescue', 'Missing Person or Water Rescue'),
    ('Storm Impact', 'Strong Wind Damage'),
    ('Public Infrastructure', 'Bridge or Roadway Damage'),
    ('Environmental Incident', 'River or Coastal Pollution'),
    ('Animal-Related Incident', 'Stray or Dangerous Animal Response'),
    ('Public Event Incident', 'Crowd Control or Safety Risk'),
    ('Evacuation Support', 'Preemptive or Emergency Evacuation');

  -- Severities (16) suitable for LGU dispatch and escalation decisions.
  INSERT INTO severities (level, definition) VALUES
    ('Level 1 - Information', 'For documentation and monitoring; no deployment needed.'),
    ('Level 2 - Minor', 'Low-impact issue with minimal public safety risk.'),
    ('Level 3 - Routine Response', 'Requires standard responder deployment.'),
    ('Level 4 - Priority Response', 'Needs quick response to prevent escalation.'),
    ('Level 5 - High Priority', 'Clear threat to life, property, or critical access routes.'),
    ('Level 6 - Critical', 'Immediate intervention required; multiple units may be needed.'),
    ('Level 7 - Severe', 'High-impact event affecting multiple households/blocks.'),
    ('Level 8 - Major', 'City-level incident requiring inter-office coordination.'),
    ('Level 9 - Extreme', 'Large-scale emergency with prolonged operations expected.'),
    ('Level 10 - Disaster', 'Widespread disaster condition requiring full LGU activation.'),
    ('Level 11 - Life Threatening', 'Immediate danger to multiple lives with ongoing exposure.'),
    ('Level 12 - Critical Infrastructure', 'Severe impact to hospitals, water, power, or transport systems.'),
    ('Level 13 - Regional Emergency', 'Incident impact extends beyond city boundaries.'),
    ('Level 14 - Prolonged Operations', 'Multi-day response requiring sustained command and logistics.'),
    ('Level 15 - Mass Casualty Risk', 'High probability of mass casualty scenario.'),
    ('Level 16 - Full Mobilization', 'Requires full LGU emergency operations center activation.');

  -- Locations (10): realistic barangay-level areas in one city operation zone.
  INSERT INTO locations (district, city, province, region) VALUES
    ('District 1 - Batasan', 'Quezon City', 'Metro Manila', 'NCR'),
    ('District 2 - Commonwealth', 'Quezon City', 'Metro Manila', 'NCR'),
    ('District 3 - Cubao', 'Quezon City', 'Metro Manila', 'NCR'),
    ('District 4 - Novaliches', 'Quezon City', 'Metro Manila', 'NCR'),
    ('District 5 - Project 6', 'Quezon City', 'Metro Manila', 'NCR'),
    ('District 6 - Tandang Sora', 'Quezon City', 'Metro Manila', 'NCR'),
    ('District 7 - Holy Spirit', 'Quezon City', 'Metro Manila', 'NCR'),
    ('District 8 - Fairview', 'Quezon City', 'Metro Manila', 'NCR'),
    ('District 9 - Kamias', 'Quezon City', 'Metro Manila', 'NCR'),
    ('District 10 - Diliman', 'Quezon City', 'Metro Manila', 'NCR');

  -- Citizens (10): residents submitting typhoon-weekend incident reports.
  INSERT INTO citizens (name, "contactInfo", "preferredChannel") VALUES
    ('Mika dela Cruz', 'mika.delacruz@example.com', 'SMS'),
    ('Ronnie Villareal', 'ronnie.villareal@example.com', 'Call'),
    ('Aileen Santiago', 'aileen.santiago@example.com', 'Email'),
    ('Noel Ramos', 'noel.ramos@example.com', 'SMS'),
    ('Jessa Bautista', 'jessa.bautista@example.com', 'Call'),
    ('Paolo Natividad', 'paolo.natividad@example.com', 'SMS'),
    ('Lea Fernandez', 'lea.fernandez@example.com', 'Email'),
    ('Mark Villanueva', 'mark.villanueva@example.com', 'Call'),
    ('Trina Co', 'trina.co@example.com', 'SMS'),
    ('Josef Tan', 'josef.tan@example.com', 'Email');

  -- Agencies (5): field command contacts used by dispatch.
  INSERT INTO agencies (name, "contactNumber") VALUES
    ('Quezon City Fire District', '+63-2-8928-8363'),
    ('Quezon City EMS Command', '+63-2-8898-6722'),
    ('Quezon City Police District', '+63-2-8723-0401'),
    ('QC Disaster Risk Reduction Office', '+63-2-8709-1923'),
    ('Metro Rescue Task Group', '+63-917-555-0440');

  -- Responders (10): assigned personnel mapped to proper agencies.
  INSERT INTO responders (name, "agencyId", role, "contactInfo") VALUES
    ('Capt. Luis Herrera', 1, 'Fire Incident Commander', 'l.herrera@qcfire.gov.ph'),
    ('FO1 Carla Santos', 1, 'Pump Operator', 'c.santos@qcfire.gov.ph'),
    ('EMT Bryan Lim', 2, 'Paramedic', 'b.lim@qcems.gov.ph'),
    ('Nurse Tricia Ong', 2, 'Emergency Nurse', 't.ong@qcems.gov.ph'),
    ('PSMS Joel Navarro', 3, 'Traffic Control Officer', 'j.navarro@qcpd.gov.ph'),
    ('PLT Ana Cruz', 3, 'Investigator', 'a.cruz@qcpd.gov.ph'),
    ('Engr. Marco Sy', 4, 'Operations Officer', 'm.sy@qcdrro.gov.ph'),
    ('Iris Mateo', 4, 'Logistics Coordinator', 'i.mateo@qcdrro.gov.ph'),
    ('Ruben Alvarez', 5, 'Swift Water Rescue Lead', 'r.alvarez@rescuetask.ph'),
    ('Kim Garcia', 5, 'Search Specialist', 'k.garcia@rescuetask.ph');

  -- Incidents (10): one continuous typhoon-event timeline with varied states.
  INSERT INTO incidents (
    description,
    "mediaUrl",
    "dateReported",
    "statusId",
    "citizenId",
    "locationId",
    "categoryId",
    "severityId"
  ) VALUES
    ('Kitchen fire triggered by electrical short after power restoration.', 'https://example.com/media/qc-incident-001.jpg', NOW() - INTERVAL '36 hours', 10, 1, 3, 1, 6),
    ('Senior citizen with breathing difficulty during flood evacuation.', 'https://example.com/media/qc-incident-002.jpg', NOW() - INTERVAL '30 hours', 9, 2, 2, 2, 5),
    ('Three-vehicle collision on wet overpass near Cubao.', 'https://example.com/media/qc-incident-003.jpg', NOW() - INTERVAL '26 hours', 9, 3, 3, 3, 5),
    ('Waist-deep flooding blocking access to elementary school.', 'https://example.com/media/qc-incident-004.jpg', NOW() - INTERVAL '22 hours', 7, 4, 8, 4, 8),
    ('Collapsed roadside wall causing partial lane obstruction.', 'https://example.com/media/qc-incident-005.jpg', NOW() - INTERVAL '18 hours', 6, 5, 6, 12, 7),
    ('Possible fuel leak reported from delivery truck after crash.', 'https://example.com/media/qc-incident-006.jpg', NOW() - INTERVAL '14 hours', 6, 6, 9, 9, 9),
    ('Neighborhood outage affecting water pumping station.', 'https://example.com/media/qc-incident-007.jpg', NOW() - INTERVAL '10 hours', 5, 7, 10, 8, 6),
    ('Missing teenage swimmer reported near overflow creek.', 'https://example.com/media/qc-incident-008.jpg', NOW() - INTERVAL '7 hours', 5, 8, 7, 10, 8),
    ('Suspicious activity reported in temporary evacuation center.', 'https://example.com/media/qc-incident-009.jpg', NOW() - INTERVAL '4 hours', 4, 9, 1, 7, 4),
    ('Fallen tree blocking barangay access road after strong winds.', 'https://example.com/media/qc-incident-010.jpg', NOW() - INTERVAL '90 minutes', 1, 10, 4, 11, 4);

  -- Assignments (10): includes resolved and ongoing operations.
  INSERT INTO assignments (
    "incidentId",
    "responderId",
    "assignedDate",
    "responseStart",
    "responseEnd",
    outcome,
    notes
  ) VALUES
    (1, 1, NOW() - INTERVAL '35 hours 50 minutes', NOW() - INTERVAL '35 hours 42 minutes', NOW() - INTERVAL '34 hours 30 minutes', 'Contained', 'Fire knocked down in 20 minutes; overhaul completed.'),
    (2, 3, NOW() - INTERVAL '29 hours 45 minutes', NOW() - INTERVAL '29 hours 38 minutes', NOW() - INTERVAL '28 hours 55 minutes', 'Stabilized', 'Patient stabilized and transferred to East Avenue Medical Center.'),
    (3, 5, NOW() - INTERVAL '25 hours 45 minutes', NOW() - INTERVAL '25 hours 39 minutes', NOW() - INTERVAL '24 hours 50 minutes', 'Cleared', 'Traffic restored after towing and scene documentation.'),
    (4, 7, NOW() - INTERVAL '21 hours 50 minutes', NOW() - INTERVAL '21 hours 35 minutes', NOW() - INTERVAL '16 hours 20 minutes', 'Mitigated', 'Flood barriers and pumps deployed; road passable to light vehicles.'),
    (5, 7, NOW() - INTERVAL '17 hours 45 minutes', NOW() - INTERVAL '17 hours 33 minutes', NOW() - INTERVAL '13 hours 40 minutes', 'Partially Cleared', 'Engineering team requested for retaining wall inspection.'),
    (6, 8, NOW() - INTERVAL '13 hours 45 minutes', NOW() - INTERVAL '13 hours 31 minutes', NULL, 'Action Ongoing', 'Hot zone isolated; awaiting hazmat contractor clearance report.'),
    (7, 8, NOW() - INTERVAL '9 hours 45 minutes', NOW() - INTERVAL '9 hours 39 minutes', NULL, 'Action Ongoing', 'Power utility coordination in progress; backup generator deployed.'),
    (8, 9, NOW() - INTERVAL '6 hours 50 minutes', NOW() - INTERVAL '6 hours 38 minutes', NULL, 'Search Ongoing', 'Riverbank sweep expanded to downstream sector Bravo.'),
    (9, 6, NOW() - INTERVAL '3 hours 45 minutes', NOW() - INTERVAL '3 hours 36 minutes', NULL, 'Under Investigation', 'CCTV retrieval requested from evacuation center admin.'),
    (10, 2, NOW() - INTERVAL '80 minutes', NULL, NULL, 'For Dispatch', 'Crew on standby pending final route safety confirmation.');

  COMMIT;
