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

  -- Locations (10)
  INSERT INTO locations (district, city, province, region) VALUES
    ('District 1', 'Quezon City', 'Metro Manila', 'NCR'),
    ('District 2', 'Makati', 'Metro Manila', 'NCR'),
    ('District 3', 'Taguig', 'Metro Manila', 'NCR'),
    ('District 4', 'Cebu City', 'Cebu', 'Region VII'),
    ('District 5', 'Davao City', 'Davao del Sur', 'Region XI'),
    ('District 6', 'Baguio', 'Benguet', 'CAR'),
    ('District 7', 'Iloilo City', 'Iloilo', 'Region VI'),
    ('District 8', 'Cagayan de Oro', 'Misamis Oriental', 'Region X'),
    ('District 9', 'Bacolod', 'Negros Occidental', 'Region VI'),
    ('District 10', 'Zamboanga City', 'Zamboanga del Sur', 'Region IX');

  -- Citizens (10)
  INSERT INTO citizens (name, "contactInfo", "preferredChannel") VALUES
    ('Jane Doe', 'jane.doe@example.com', 'SMS'),
    ('John Cruz', 'john.cruz@example.com', 'Call'),
    ('Maria Santos', 'maria.santos@example.com', 'Email'),
    ('Carlos Reyes', 'carlos.reyes@example.com', 'SMS'),
    ('Angela Lim', 'angela.lim@example.com', 'Call'),
    ('Paolo Garcia', 'paolo.garcia@example.com', 'SMS'),
    ('Nina Flores', 'nina.flores@example.com', 'Email'),
    ('Ramon Dela Cruz', 'ramon.delacruz@example.com', 'Call'),
    ('Bea Navarro', 'bea.navarro@example.com', 'SMS'),
    ('Leo Tan', 'leo.tan@example.com', 'Email');

  -- Agencies (5)
  INSERT INTO agencies (name) VALUES
    ('City Fire Department'),
    ('EMS Unit'),
    ('Police District'),
    ('Disaster Risk Office'),
    ('Rescue Task Force');

  -- Responders (10)
  INSERT INTO responders (name, "agencyId", role, "contactInfo") VALUES
    ('Alex Smith', 1, 'Field Responder', 'alex.smith@agency.gov'),
    ('Brian Lee', 2, 'Paramedic', 'brian.lee@agency.gov'),
    ('Carla Mendoza', 3, 'Patrol Officer', 'carla.mendoza@agency.gov'),
    ('Daniel Ong', 4, 'Operations Officer', 'daniel.ong@agency.gov'),
    ('Erika Ramos', 1, 'Crew Lead', 'erika.ramos@agency.gov'),
    ('Francis Yu', 2, 'Emergency Nurse', 'francis.yu@agency.gov'),
    ('Grace Villanueva', 3, 'Investigator', 'grace.villanueva@agency.gov'),
    ('Harold Go', 5, 'Rescue Diver', 'harold.go@agency.gov'),
    ('Iris Chua', 4, 'Logistics Coordinator', 'iris.chua@agency.gov'),
    ('Jason Bautista', 1, 'Pump Operator', 'jason.bautista@agency.gov');

  -- Incidents (10) with valid foreign keys.
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
    ('Kitchen fire in apartment unit.', 'https://example.com/media/incident-1.jpg', NOW() - INTERVAL '10 days', 1, 1, 1, 1, 6),
    ('Pedestrian injured near intersection.', 'https://example.com/media/incident-2.jpg', NOW() - INTERVAL '9 days', 2, 2, 2, 2, 5),
    ('Two-vehicle collision on main road.', 'https://example.com/media/incident-3.jpg', NOW() - INTERVAL '8 days', 3, 3, 3, 3, 4),
    ('Flooded street after heavy rain.', 'https://example.com/media/incident-4.jpg', NOW() - INTERVAL '7 days', 4, 4, 4, 4, 7),
    ('Road blocked by minor landslide.', 'https://example.com/media/incident-5.jpg', NOW() - INTERVAL '6 days', 5, 5, 5, 5, 5),
    ('Building cracks after tremor.', 'https://example.com/media/incident-6.jpg', NOW() - INTERVAL '5 days', 6, 6, 6, 6, 8),
    ('Neighborhood blackout affecting 3 blocks.', 'https://example.com/media/incident-7.jpg', NOW() - INTERVAL '4 days', 7, 7, 7, 7, 3),
    ('Store robbery in progress report.', 'https://example.com/media/incident-8.jpg', NOW() - INTERVAL '3 days', 8, 8, 8, 8, 6),
    ('Chemical leak from delivery truck.', 'https://example.com/media/incident-9.jpg', NOW() - INTERVAL '2 days', 9, 9, 9, 9, 9),
    ('Missing swimmer reported at shoreline.', 'https://example.com/media/incident-10.jpg', NOW() - INTERVAL '1 day', 10, 10, 10, 10, 7);

  -- Assignments (10) with valid foreign keys.
  INSERT INTO assignments (
    "incidentId",
    "responderId",
    "assignedDate",
    "responseStart",
    "responseEnd",
    outcome,
    notes
  ) VALUES
    (1, 1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '8 minutes', NOW() - INTERVAL '10 days' + INTERVAL '95 minutes', 'Contained', 'Fire extinguished; no casualties.'),
    (2, 2, NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days' + INTERVAL '6 minutes', NOW() - INTERVAL '9 days' + INTERVAL '45 minutes', 'Stabilized', 'Patient transported to nearest hospital.'),
    (3, 3, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '5 minutes', NOW() - INTERVAL '8 days' + INTERVAL '70 minutes', 'Cleared', 'Traffic rerouted and scene cleared.'),
    (4, 4, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '12 minutes', NOW() - INTERVAL '7 days' + INTERVAL '180 minutes', 'Mitigated', 'Flood barriers deployed.'),
    (5, 5, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '9 minutes', NOW() - INTERVAL '6 days' + INTERVAL '110 minutes', 'Partially Cleared', 'Heavy equipment requested.'),
    (6, 6, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '7 minutes', NOW() - INTERVAL '5 days' + INTERVAL '130 minutes', 'Evaluated', 'Site marked unsafe pending engineering assessment.'),
    (7, 7, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '4 minutes', NOW() - INTERVAL '4 days' + INTERVAL '35 minutes', 'Secured', 'Area secured while utility team repairs line.'),
    (8, 8, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '3 minutes', NOW() - INTERVAL '3 days' + INTERVAL '60 minutes', 'Investigated', 'Suspect apprehended by responding unit.'),
    (9, 9, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '10 minutes', NOW() - INTERVAL '2 days' + INTERVAL '150 minutes', 'Contained', 'Spill isolated; hazmat cleanup completed.'),
    (10, 10, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '14 minutes', NOW() - INTERVAL '1 day' + INTERVAL '200 minutes', 'Rescued', 'Swimmer located and brought to shore safely.');

  COMMIT;
