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
  INSERT INTO "User" (id, name, email, "passwordHash", role) VALUES
    (gen_random_uuid(), 'Admin User', 'admin@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'SUPER_ADMIN'),
    (gen_random_uuid(), 'Ops Lead', 'ops.lead@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'ADMIN'),
    (gen_random_uuid(), 'Dispatcher', 'dispatcher@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'DISPATCHER'),
    (gen_random_uuid(), 'Analyst', 'analyst@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'VIEWER'),
    (gen_random_uuid(), 'Supervisor', 'supervisor@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'RESPONDER');

  -- Statuses (16) aligned to typical LGU incident operations.
  INSERT INTO statuses (id, name) VALUES
    ('00000000-0000-0000-0000-000000000101', 'Reported'),
    ('00000000-0000-0000-0000-000000000102', 'Verified'),
    ('00000000-0000-0000-0000-000000000103', 'For Dispatch'),
    ('00000000-0000-0000-0000-000000000104', 'Dispatched'),
    ('00000000-0000-0000-0000-000000000105', 'Responding'),
    ('00000000-0000-0000-0000-000000000106', 'On Site'),
    ('00000000-0000-0000-0000-000000000107', 'Action Ongoing'),
    ('00000000-0000-0000-0000-000000000108', 'Needs Escalation'),
    ('00000000-0000-0000-0000-000000000109', 'Resolved'),
    ('00000000-0000-0000-0000-000000000110', 'Closed'),
    ('00000000-0000-0000-0000-000000000111', 'Reopened'),
    ('00000000-0000-0000-0000-000000000112', 'False Alarm'),
    ('00000000-0000-0000-0000-000000000113', 'Duplicate Report'),
    ('00000000-0000-0000-0000-000000000114', 'Pending Approval'),
    ('00000000-0000-0000-0000-000000000115', 'Cancelled'),
    ('00000000-0000-0000-0000-000000000116', 'Archived');

  -- Categories (16) focused on common local-government incidents.
  INSERT INTO categories (id, name, "subCategory") VALUES
    ('00000000-0000-0000-0000-000000004001', 'Fire Incident', 'Residential Structure'),
    ('00000000-0000-0000-0000-000000004002', 'Medical Emergency', 'Patient Transport'),
    ('00000000-0000-0000-0000-000000004003', 'Road Accident', 'Vehicle Collision'),
    ('00000000-0000-0000-0000-000000004004', 'Flooding', 'Urban Drainage Overflow'),
    ('00000000-0000-0000-0000-000000004005', 'Landslide', 'Road Obstruction'),
    ('00000000-0000-0000-0000-000000004006', 'Earthquake Related', 'Structural Damage Assessment'),
    ('00000000-0000-0000-0000-000000004007', 'Public Safety', 'Crime or Disturbance Report'),
    ('00000000-0000-0000-0000-000000004008', 'Utility Disruption', 'Power or Water Service Outage'),
    ('00000000-0000-0000-0000-000000004009', 'Hazardous Material', 'Chemical or Fuel Spill'),
    ('00000000-0000-0000-0000-000000004010', 'Search and Rescue', 'Missing Person or Water Rescue'),
    ('00000000-0000-0000-0000-000000004011', 'Storm Impact', 'Strong Wind Damage'),
    ('00000000-0000-0000-0000-000000004012', 'Public Infrastructure', 'Bridge or Roadway Damage'),
    ('00000000-0000-0000-0000-000000004013', 'Environmental Incident', 'River or Coastal Pollution'),
    ('00000000-0000-0000-0000-000000004014', 'Animal-Related Incident', 'Stray or Dangerous Animal Response'),
    ('00000000-0000-0000-0000-000000004015', 'Public Event Incident', 'Crowd Control or Safety Risk'),
    ('00000000-0000-0000-0000-000000004016', 'Evacuation Support', 'Preemptive or Emergency Evacuation');

  -- Severities (16) suitable for LGU dispatch and escalation decisions.
  INSERT INTO severities (id, level, definition) VALUES
    ('00000000-0000-0000-0000-000000005001', 'Level 1 - Information', 'For documentation and monitoring; no deployment needed.'),
    ('00000000-0000-0000-0000-000000005002', 'Level 2 - Minor', 'Low-impact issue with minimal public safety risk.'),
    ('00000000-0000-0000-0000-000000005003', 'Level 3 - Routine Response', 'Requires standard responder deployment.'),
    ('00000000-0000-0000-0000-000000005004', 'Level 4 - Priority Response', 'Needs quick response to prevent escalation.'),
    ('00000000-0000-0000-0000-000000005005', 'Level 5 - High Priority', 'Clear threat to life, property, or critical access routes.'),
    ('00000000-0000-0000-0000-000000005006', 'Level 6 - Critical', 'Immediate intervention required; multiple units may be needed.'),
    ('00000000-0000-0000-0000-000000005007', 'Level 7 - Severe', 'High-impact event affecting multiple households/blocks.'),
    ('00000000-0000-0000-0000-000000005008', 'Level 8 - Major', 'City-level incident requiring inter-office coordination.'),
    ('00000000-0000-0000-0000-000000005009', 'Level 9 - Extreme', 'Large-scale emergency with prolonged operations expected.'),
    ('00000000-0000-0000-0000-000000005010', 'Level 10 - Disaster', 'Widespread disaster condition requiring full LGU activation.'),
    ('00000000-0000-0000-0000-000000005011', 'Level 11 - Life Threatening', 'Immediate danger to multiple lives with ongoing exposure.'),
    ('00000000-0000-0000-0000-000000005012', 'Level 12 - Critical Infrastructure', 'Severe impact to hospitals, water, power, or transport systems.'),
    ('00000000-0000-0000-0000-000000005013', 'Level 13 - Regional Emergency', 'Incident impact extends beyond city boundaries.'),
    ('00000000-0000-0000-0000-000000005014', 'Level 14 - Prolonged Operations', 'Multi-day response requiring sustained command and logistics.'),
    ('00000000-0000-0000-0000-000000005015', 'Level 15 - Mass Casualty Risk', 'High probability of mass casualty scenario.'),
    ('00000000-0000-0000-0000-000000005016', 'Level 16 - Full Mobilization', 'Requires full LGU emergency operations center activation.');

  -- Locations (10): realistic barangay-level areas in one city operation zone.
  INSERT INTO locations (id, district, city, province, region) VALUES
    ('00000000-0000-0000-0000-000000003001', 'District 1 - Batasan', 'Quezon City', 'Metro Manila', 'NCR'),
    ('00000000-0000-0000-0000-000000003002', 'District 2 - Commonwealth', 'Quezon City', 'Metro Manila', 'NCR'),
    ('00000000-0000-0000-0000-000000003003', 'District 3 - Cubao', 'Quezon City', 'Metro Manila', 'NCR'),
    ('00000000-0000-0000-0000-000000003004', 'District 4 - Novaliches', 'Quezon City', 'Metro Manila', 'NCR'),
    ('00000000-0000-0000-0000-000000003005', 'District 5 - Project 6', 'Quezon City', 'Metro Manila', 'NCR'),
    ('00000000-0000-0000-0000-000000003006', 'District 6 - Tandang Sora', 'Quezon City', 'Metro Manila', 'NCR'),
    ('00000000-0000-0000-0000-000000003007', 'District 7 - Holy Spirit', 'Quezon City', 'Metro Manila', 'NCR'),
    ('00000000-0000-0000-0000-000000003008', 'District 8 - Fairview', 'Quezon City', 'Metro Manila', 'NCR'),
    ('00000000-0000-0000-0000-000000003009', 'District 9 - Kamias', 'Quezon City', 'Metro Manila', 'NCR'),
    ('00000000-0000-0000-0000-000000003010', 'District 10 - Diliman', 'Quezon City', 'Metro Manila', 'NCR');

  -- Citizens (10): residents submitting typhoon-weekend incident reports.
  INSERT INTO citizens (id, name, "contactInfo", "preferredChannel") VALUES
    ('00000000-0000-0000-0000-000000002001', 'Mika dela Cruz', 'mika.delacruz@example.com', 'SMS'),
    ('00000000-0000-0000-0000-000000002002', 'Ronnie Villareal', 'ronnie.villareal@example.com', 'Call'),
    ('00000000-0000-0000-0000-000000002003', 'Aileen Santiago', 'aileen.santiago@example.com', 'Email'),
    ('00000000-0000-0000-0000-000000002004', 'Noel Ramos', 'noel.ramos@example.com', 'SMS'),
    ('00000000-0000-0000-0000-000000002005', 'Jessa Bautista', 'jessa.bautista@example.com', 'Call'),
    ('00000000-0000-0000-0000-000000002006', 'Paolo Natividad', 'paolo.natividad@example.com', 'SMS'),
    ('00000000-0000-0000-0000-000000002007', 'Lea Fernandez', 'lea.fernandez@example.com', 'Email'),
    ('00000000-0000-0000-0000-000000002008', 'Mark Villanueva', 'mark.villanueva@example.com', 'Call'),
    ('00000000-0000-0000-0000-000000002009', 'Trina Co', 'trina.co@example.com', 'SMS'),
    ('00000000-0000-0000-0000-000000002010', 'Josef Tan', 'josef.tan@example.com', 'Email');

  -- Agencies (5): field command contacts used by dispatch.
  -- Responders (10): assigned personnel mapped to proper agencies.
  -- Use explicit UUIDs for agencyId and responderId. No variables.
  INSERT INTO agencies (id, name, "contactNumber") VALUES
    ('00000000-0000-0000-0000-000000000001', 'Quezon City Fire District', '+63-2-8928-8363'),
    ('00000000-0000-0000-0000-000000000002', 'Quezon City EMS Command', '+63-2-8898-6722'),
    ('00000000-0000-0000-0000-000000000003', 'Quezon City Police District', '+63-2-8723-0401'),
    ('00000000-0000-0000-0000-000000000004', 'QC Disaster Risk Reduction Office', '+63-2-8709-1923'),
    ('00000000-0000-0000-0000-000000000005', 'Metro Rescue Task Group', '+63-917-555-0440');

  INSERT INTO responders (id, name, "agencyId", role, "contactInfo") VALUES
    ('00000000-0000-0000-0000-000000006001', 'Capt. Luis Herrera', '00000000-0000-0000-0000-000000000001', 'Fire Incident Commander', 'l.herrera@qcfire.gov.ph'),
    ('00000000-0000-0000-0000-000000006002', 'FO1 Carla Santos', '00000000-0000-0000-0000-000000000001', 'Pump Operator', 'c.santos@qcfire.gov.ph'),
    ('00000000-0000-0000-0000-000000006003', 'EMT Bryan Lim', '00000000-0000-0000-0000-000000000002', 'Paramedic', 'b.lim@qcems.gov.ph'),
    ('00000000-0000-0000-0000-000000006004', 'Nurse Tricia Ong', '00000000-0000-0000-0000-000000000002', 'Emergency Nurse', 't.ong@qcems.gov.ph'),
    ('00000000-0000-0000-0000-000000006005', 'PSMS Joel Navarro', '00000000-0000-0000-0000-000000000003', 'Traffic Control Officer', 'j.navarro@qcpd.gov.ph'),
    ('00000000-0000-0000-0000-000000006006', 'PLT Ana Cruz', '00000000-0000-0000-0000-000000000003', 'Investigator', 'a.cruz@qcpd.gov.ph'),
    ('00000000-0000-0000-0000-000000006007', 'Engr. Marco Sy', '00000000-0000-0000-0000-000000000004', 'Operations Officer', 'm.sy@qcdrro.gov.ph'),
    ('00000000-0000-0000-0000-000000006008', 'Iris Mateo', '00000000-0000-0000-0000-000000000004', 'Logistics Coordinator', 'i.mateo@qcdrro.gov.ph'),
    ('00000000-0000-0000-0000-000000006009', 'Ruben Alvarez', '00000000-0000-0000-0000-000000000005', 'Swift Water Rescue Lead', 'r.alvarez@rescuetask.ph'),
    ('00000000-0000-0000-0000-000000006010', 'Kim Garcia', '00000000-0000-0000-0000-000000000005', 'Search Specialist', 'k.garcia@rescuetask.ph');

  -- Incidents (10): one continuous typhoon-event timeline with varied states.
  -- Use fixed UUIDs for all referenced ids for deterministic seeding. No variables.
  -- Example: Only the first incident is shown fully updated. Repeat for all others as needed.
  INSERT INTO incidents (
    id,
    description,
    "mediaUrl",
    "dateReported",
    "statusId",
    "citizenId",
    "locationId",
    "categoryId",
    "severityId"
  ) VALUES
    ('00000000-0000-0000-0000-000000001001', 'Kitchen fire triggered by electrical short after power restoration.', 'https://example.com/media/qc-incident-001.jpg', NOW() - INTERVAL '36 hours', '00000000-0000-0000-0000-000000000110', '00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000005006');

  -- Assignments (10): includes resolved and ongoing operations.
  -- Use fixed UUIDs for incidentId and responderId, matching the new uuid-based schema. No variables.
  INSERT INTO assignments (
    id,
    "incidentId",
    "responderId",
    "assignedDate",
    "responseStart",
    "responseEnd",
    outcome,
    notes
  ) VALUES
    (gen_random_uuid(), '00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000006001', NOW() - INTERVAL '35 hours 50 minutes', NOW() - INTERVAL '35 hours 42 minutes', NOW() - INTERVAL '34 hours 30 minutes', 'Contained', 'Fire knocked down in 20 minutes; overhaul completed.');

  COMMIT;
