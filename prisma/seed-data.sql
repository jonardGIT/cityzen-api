BEGIN;

TRUNCATE TABLE
  audit_logs,
  assignments,
  incidents,
  responders,
  agencies,
  citizens,
  statuses,
  categories,
  severities,
  users
RESTART IDENTITY CASCADE;

INSERT INTO users (id, "createdAt", "updatedAt", name, email, "passwordHash", role) VALUES
  ('10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '14 days', NOW() - INTERVAL '2 days', 'National Admin', 'admin@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'NATIONAL_ADMIN'),
  ('10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '12 days', NOW() - INTERVAL '3 days', 'City Admin', 'ops.lead@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'CITY_ADMIN'),
  ('10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day', 'Dispatcher', 'dispatcher@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'DISPATCHER'),
  ('10000000-0000-0000-0000-000000000004', NOW() - INTERVAL '8 days', NOW() - INTERVAL '12 hours', 'Citizen Reporter', 'analyst@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'CITIZEN_REPORTER'),
  ('10000000-0000-0000-0000-000000000005', NOW() - INTERVAL '6 days', NOW() - INTERVAL '8 hours', 'Provincial Admin', 'supervisor@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'PROVINCIAL_ADMIN'),
  ('10000000-0000-0000-0000-000000000006', NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 hours', 'Responder', 'responder@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'RESPONDER'),
  ('10000000-0000-0000-0000-000000000007', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 hours', 'Auditor', 'auditor@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'AUDITOR');

INSERT INTO statuses (id, "createdAt", "updatedAt", name) VALUES
  ('20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days', 'Reported'),
  ('20000000-0000-0000-0000-000000000002', NOW() - INTERVAL '16 days', NOW() - INTERVAL '14 days', 'In Progress'),
  ('20000000-0000-0000-0000-000000000003', NOW() - INTERVAL '16 days', NOW() - INTERVAL '12 days', 'Resolved'),
  ('20000000-0000-0000-0000-000000000004', NOW() - INTERVAL '16 days', NOW() - INTERVAL '10 days', 'Closed'),
  ('20000000-0000-0000-0000-000000000005', NOW() - INTERVAL '16 days', NOW() - INTERVAL '8 days', 'For Dispatch');

INSERT INTO categories (id, "createdAt", "updatedAt", name, "subCategory") VALUES
  ('30000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', 'Fire Incident', 'Residential Structure'),
  ('30000000-0000-0000-0000-000000000002', NOW() - INTERVAL '15 days', NOW() - INTERVAL '13 days', 'Medical Emergency', 'Patient Transport'),
  ('30000000-0000-0000-0000-000000000003', NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days', 'Road Accident', 'Vehicle Collision'),
  ('30000000-0000-0000-0000-000000000004', NOW() - INTERVAL '15 days', NOW() - INTERVAL '11 days', 'Flooding', 'Urban Drainage Overflow'),
  ('30000000-0000-0000-0000-000000000005', NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days', 'Public Safety', 'Crowd Control or Safety Risk');

INSERT INTO severities (id, "createdAt", "updatedAt", level, definition) VALUES
  ('40000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', 'Low', 'Minimal impact; monitoring only.'),
  ('40000000-0000-0000-0000-000000000002', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', 'Moderate', 'Standard response required.'),
  ('40000000-0000-0000-0000-000000000003', NOW() - INTERVAL '15 days', NOW() - INTERVAL '13 days', 'High', 'Priority response required.'),
  ('40000000-0000-0000-0000-000000000004', NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days', 'Critical', 'Immediate intervention required.');

INSERT INTO citizens (id, "createdAt", "updatedAt", name, "contactInfo", "preferredChannel") VALUES
  ('60000000-0000-0000-0000-000000000001', NOW() - INTERVAL '9 days', NOW() - INTERVAL '18 hours', 'Mika dela Cruz', 'mika.delacruz@example.com', 'SMS'),
  ('60000000-0000-0000-0000-000000000002', NOW() - INTERVAL '8 days', NOW() - INTERVAL '16 hours', 'Ronnie Villareal', 'ronnie.villareal@example.com', 'Call'),
  ('60000000-0000-0000-0000-000000000003', NOW() - INTERVAL '7 days', NOW() - INTERVAL '14 hours', 'Aileen Santiago', 'aileen.santiago@example.com', 'Email'),
  ('60000000-0000-0000-0000-000000000004', NOW() - INTERVAL '6 days', NOW() - INTERVAL '12 hours', 'Noel Ramos', 'noel.ramos@example.com', 'SMS'),
  ('60000000-0000-0000-0000-000000000005', NOW() - INTERVAL '5 days', NOW() - INTERVAL '10 hours', 'Jessa Bautista', 'jessa.bautista@example.com', 'Call');

INSERT INTO agencies (id, "createdAt", "updatedAt", name, "contactNumber") VALUES
  ('70000000-0000-0000-0000-000000000001', NOW() - INTERVAL '14 days', NOW() - INTERVAL '3 days', 'Quezon City Fire District', '+63-2-8928-8363'),
  ('70000000-0000-0000-0000-000000000002', NOW() - INTERVAL '13 days', NOW() - INTERVAL '3 days', 'Quezon City EMS Command', '+63-2-8898-6722'),
  ('70000000-0000-0000-0000-000000000003', NOW() - INTERVAL '12 days', NOW() - INTERVAL '2 days', 'Quezon City Police District', '+63-2-8723-0401'),
  ('70000000-0000-0000-0000-000000000004', NOW() - INTERVAL '11 days', NOW() - INTERVAL '2 days', 'QC Disaster Risk Reduction Office', '+63-2-8709-1923');

INSERT INTO responders (id, "createdAt", "updatedAt", name, "agencyId", role, "contactInfo") VALUES
  ('80000000-0000-0000-0000-000000000001', NOW() - INTERVAL '9 days', NOW() - INTERVAL '30 hours', 'Capt. Luis Herrera', '70000000-0000-0000-0000-000000000001', 'Fire Incident Commander', 'l.herrera@qcfire.gov.ph'),
  ('80000000-0000-0000-0000-000000000002', NOW() - INTERVAL '8 days', NOW() - INTERVAL '28 hours', 'FO1 Carla Santos', '70000000-0000-0000-0000-000000000001', 'Pump Operator', 'c.santos@qcfire.gov.ph'),
  ('80000000-0000-0000-0000-000000000003', NOW() - INTERVAL '7 days', NOW() - INTERVAL '26 hours', 'EMT Bryan Lim', '70000000-0000-0000-0000-000000000002', 'Paramedic', 'b.lim@qcems.gov.ph'),
  ('80000000-0000-0000-0000-000000000004', NOW() - INTERVAL '6 days', NOW() - INTERVAL '24 hours', 'PSMS Joel Navarro', '70000000-0000-0000-0000-000000000003', 'Traffic Control Officer', 'j.navarro@qcpd.gov.ph'),
  ('80000000-0000-0000-0000-000000000005', NOW() - INTERVAL '5 days', NOW() - INTERVAL '22 hours', 'Engr. Marco Sy', '70000000-0000-0000-0000-000000000004', 'Operations Officer', 'm.sy@qcdrro.gov.ph');

INSERT INTO incidents (
  id,
  "createdAt",
  "updatedAt",
  description,
  "mediaUrl",
  "dateReported",
  latitude,
  longitude,
  "addressLine1",
  "addressLine2",
  barangay,
  "districtName",
  "cityName",
  "provinceName",
  "regionName",
  "postalCode",
  landmark,
  "statusId",
  "citizenId",
  "categoryId",
  "severityId"
) VALUES
  ('90000000-0000-0000-0000-000000000001', NOW() - INTERVAL '36 hours', NOW() - INTERVAL '34 hours', 'Kitchen fire triggered by electrical short after power restoration.', 'https://example.com/media/qc-incident-001.jpg', NOW() - INTERVAL '36 hours', 14.6312000, 121.0534000, '12 Batasan Road', NULL, 'Batasan Hills', 'District 3 - Cubao', 'Quezon City', 'Metro Manila', 'NCR', '1126', 'Near barangay hall', '20000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004'),
  ('90000000-0000-0000-0000-000000000002', NOW() - INTERVAL '30 hours', NOW() - INTERVAL '28 hours', 'Senior citizen with breathing difficulty during flood evacuation.', 'https://example.com/media/qc-incident-002.jpg', NOW() - INTERVAL '30 hours', 14.7098000, 121.0745000, '88 Commonwealth Ave', 'Evacuation tent B', 'Commonwealth', NULL, 'Quezon City', 'Metro Manila', 'NCR', '1121', 'Across covered court', '20000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003'),
  ('90000000-0000-0000-0000-000000000003', NOW() - INTERVAL '22 hours', NOW() - INTERVAL '16 hours', 'Waist-deep flooding blocking access to elementary school.', 'https://example.com/media/qc-incident-003.jpg', NOW() - INTERVAL '22 hours', 14.6185000, 121.0370000, '45 Fairview Road', NULL, 'Fairview', NULL, 'Quezon City', 'Metro Manila', 'NCR', '1118', 'Beside elementary school gate', '20000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004'),
  ('90000000-0000-0000-0000-000000000004', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours', 'Suspicious activity reported in temporary evacuation center.', 'https://example.com/media/qc-incident-004.jpg', NOW() - INTERVAL '4 hours', 14.6760000, 121.0432000, '1 Shelter Lane', 'Evacuation Center', 'Batasan Hills', NULL, 'Quezon City', 'Metro Manila', 'NCR', '1126', 'Covered court entrance', '20000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002'),
  ('90000000-0000-0000-0000-000000000005', NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '45 minutes', 'Fallen tree blocking barangay access road after strong winds.', 'https://example.com/media/qc-incident-005.jpg', NOW() - INTERVAL '90 minutes', 14.6503000, 121.0329000, '99 Diliman Access Rd', NULL, 'Diliman', NULL, 'Quezon City', 'Metro Manila', 'NCR', '1101', 'Near waiting shed', '20000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002');

INSERT INTO assignments (
  id,
  "createdAt",
  "updatedAt",
  "incidentId",
  "responderId",
  "assignedDate",
  "responseStart",
  "responseEnd",
  outcome,
  notes
) VALUES
  ('a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '35 hours 50 minutes', NOW() - INTERVAL '34 hours 30 minutes', '90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', NOW() - INTERVAL '35 hours 50 minutes', NOW() - INTERVAL '35 hours 42 minutes', NOW() - INTERVAL '34 hours 30 minutes', 'Contained', 'Fire knocked down in 20 minutes; overhaul completed.'),
  ('a0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '29 hours 45 minutes', NOW() - INTERVAL '28 hours 55 minutes', '90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000003', NOW() - INTERVAL '29 hours 45 minutes', NOW() - INTERVAL '29 hours 38 minutes', NOW() - INTERVAL '28 hours 55 minutes', 'Stabilized', 'Patient stabilized and transferred to East Avenue Medical Center.'),
  ('a0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '21 hours 50 minutes', NOW() - INTERVAL '16 hours 20 minutes', '90000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000005', NOW() - INTERVAL '21 hours 50 minutes', NOW() - INTERVAL '21 hours 35 minutes', NOW() - INTERVAL '16 hours 20 minutes', 'Mitigated', 'Flood barriers and pumps deployed; road passable to light vehicles.'),
  ('a0000000-0000-0000-0000-000000000004', NOW() - INTERVAL '3 hours 45 minutes', NOW() - INTERVAL '35 minutes', '90000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000004', NOW() - INTERVAL '3 hours 45 minutes', NOW() - INTERVAL '3 hours 36 minutes', NULL, 'Under Investigation', 'CCTV retrieval requested from evacuation center admin.'),
  ('a0000000-0000-0000-0000-000000000005', NOW() - INTERVAL '80 minutes', NOW() - INTERVAL '20 minutes', '90000000-0000-0000-0000-000000000005', '80000000-0000-0000-0000-000000000002', NOW() - INTERVAL '80 minutes', NULL, NULL, 'For Dispatch', 'Crew on standby pending final route safety confirmation.');

COMMIT;
