BEGIN;

TRUNCATE TABLE
  audit_logs,
  assignments,
  mobile_app_content,
  incidents,
  responders,
  agencies,
  barangays,
  cities_municipalities,
  provinces,
  regions,
  citizens,
  statuses,
  categories,
  severities,
  users
RESTART IDENTITY CASCADE;

INSERT INTO users (id, "createdAt", "updatedAt", name, email, "passwordHash", role, "jurisdictionType", "jurisdictionId") VALUES
  ('10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '14 days', NOW() - INTERVAL '2 days', 'National Admin', 'admin@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'NATIONAL_ADMIN', NULL, NULL),
  ('10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '13 days', NOW() - INTERVAL '3 days', 'Regional Director', 'regional.director@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'REGIONAL_DIRECTOR', 'region', '12000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '12 days', NOW() - INTERVAL '2 days', 'Provincial Admin', 'supervisor@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'PROVINCIAL_ADMIN', 'province', '13000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000004', NOW() - INTERVAL '11 days', NOW() - INTERVAL '36 hours', 'City Admin', 'ops.lead@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'CITY_ADMIN', 'city', '14000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000005', NOW() - INTERVAL '10 days', NOW() - INTERVAL '24 hours', 'City Content Editor', 'content.editor@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'CITY_CONTENT_EDITOR', 'city', '14000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000006', NOW() - INTERVAL '9 days', NOW() - INTERVAL '18 hours', 'Dispatcher', 'dispatcher@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'DISPATCHER', 'city', '14000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000007', NOW() - INTERVAL '8 days', NOW() - INTERVAL '12 hours', 'Citizen Reporter', 'analyst@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'CITIZEN_REPORTER', NULL, NULL),
  ('10000000-0000-0000-0000-000000000008', NOW() - INTERVAL '7 days', NOW() - INTERVAL '10 hours', 'Responder', 'responder@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'RESPONDER', 'city', '14000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000009', NOW() - INTERVAL '6 days', NOW() - INTERVAL '8 hours', 'Auditor', 'auditor@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'AUDITOR', NULL, NULL),
  ('10000000-0000-0000-0000-000000000010', NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 hours', 'Roxas Municipal Admin', 'roxas.municipal.admin@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'CITY_ADMIN', 'city', '14000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000011', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 hours', 'Roxas Content Editor', 'roxas.content.editor@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'CITY_CONTENT_EDITOR', 'city', '14000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000012', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 hours', 'Roxas Dispatcher', 'roxas.dispatcher@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'DISPATCHER', 'city', '14000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000013', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 hours', 'Roxas Responder', 'roxas.responder@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'RESPONDER', 'city', '14000000-0000-0000-0000-000000000001');

INSERT INTO regions (id, code, name, designation, "createdAt", "updatedAt") VALUES
  ('12000000-0000-0000-0000-000000000001', '020000000', 'Cagayan Valley', 'Region II', NOW() - INTERVAL '14 days', NOW() - INTERVAL '2 days');

INSERT INTO provinces (id, code, name, "regionId", "createdAt", "updatedAt") VALUES
  ('13000000-0000-0000-0000-000000000001', '023100000', 'Isabela', '12000000-0000-0000-0000-000000000001', NOW() - INTERVAL '13 days', NOW() - INTERVAL '2 days'),
  ('13000000-0000-0000-0000-000000000002', '021500000', 'Cagayan', '12000000-0000-0000-0000-000000000001', NOW() - INTERVAL '13 days', NOW() - INTERVAL '30 hours');

INSERT INTO cities_municipalities (id, code, name, type, "provinceId", "createdAt", "updatedAt") VALUES
  ('14000000-0000-0000-0000-000000000001', '023126000', 'Roxas', 'MUNICIPALITY', '13000000-0000-0000-0000-000000000001', NOW() - INTERVAL '12 days', NOW() - INTERVAL '36 hours'),
  ('14000000-0000-0000-0000-000000000002', '021529000', 'Tuguegarao City', 'CITY', '13000000-0000-0000-0000-000000000002', NOW() - INTERVAL '12 days', NOW() - INTERVAL '24 hours');

INSERT INTO mobile_app_content (
  id,
  "createdAt",
  "updatedAt",
  slug,
  title,
  summary,
  body,
  "contentType",
  placement,
  audience,
  "imageUrl",
  "ctaLabel",
  "ctaUrl",
  "sortOrder",
  "isPublished",
  "publishedAt",
  metadata
) VALUES
  (
    '11000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '6 hours',
    'tuguegarao-summer-water-advisory',
    'Water Interruption Advisory For Tuguegarao City',
    'Scheduled maintenance may affect evening water availability in selected barangays.',
    'The city government advises households in affected Tuguegarao barangays to store enough water before the scheduled maintenance window. Updates will be posted if the restoration timeline changes.',
    'advisory',
    'home',
    NULL,
    'https://images.xypes.local/mytuguegarao/water-advisory.jpg',
    'View advisory',
    '/news/tuguegarao-summer-water-advisory',
    1,
    true,
    NOW() - INTERVAL '2 days',
    '{"city":"Tuguegarao City","appCategory":"City Advisories","featureStyle":"hero","source":"city-pio"}'::jsonb
  ),
  (
    '11000000-0000-0000-0000-000000000002',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '5 hours',
    'mytuguegarao-digital-permit-week',
    'Digital Permit Week Opens At City Hall',
    'Residents can complete guided permit assistance and account setup this week.',
    'MyTuguegarao digital services staff will host a week-long permit assistance drive at City Hall. Residents can get help creating accounts, uploading requirements, and understanding renewal timelines.',
    'news',
    'news',
    NULL,
    'https://images.xypes.local/mytuguegarao/digital-permit-week.jpg',
    'Open news',
    '/news/mytuguegarao-digital-permit-week',
    2,
    true,
    NOW() - INTERVAL '36 hours',
    '{"city":"Tuguegarao City","appCategory":"City News and Features","featureStyle":"featured","source":"city-digital-services","readingTimeMinutes":3}'::jsonb
  ),
  (
    '11000000-0000-0000-0000-000000000003',
    NOW() - INTERVAL '18 hours',
    NOW() - INTERVAL '2 hours',
    'cagayan-river-watch-alerts',
    'Cagayan River Watch Alerts Remain Active',
    'River monitoring continues as water levels stay above the city watch threshold.',
    'Tuguegarao City DRRM and partner responders continue to monitor the Cagayan River. Residents near low-lying areas should watch for official updates and prepare for possible late-night advisories.',
    'emergency-alert',
    'alerts',
    NULL,
    'https://images.xypes.local/mytuguegarao/river-watch.jpg',
    'Open alerts',
    '/alerts/cagayan-river-watch-alerts',
    1,
    true,
    NOW() - INTERVAL '12 hours',
    '{"city":"Tuguegarao City","appCategory":"Emergency Alerts","featureStyle":"alert","source":"city-drrm","tags":["weather","flood-watch"]}'::jsonb
  ),
  (
    '11000000-0000-0000-0000-000000000004',
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '30 minutes',
    'barangay-cleanup-campaign-preview',
    'Barangay Cleanup Campaign Preview',
    'Draft copy for next week\'s community cleanup drive.',
    'Draft community cleanup campaign content pending final approval from the city communications team.',
    'campaign',
    'home',
    NULL,
    'https://images.xypes.local/mytuguegarao/cleanup-preview.jpg',
    'Review draft',
    '/campaigns/barangay-cleanup-campaign-preview',
    4,
    false,
    NULL,
    '{"city":"Tuguegarao City","appCategory":"Campaigns","featureStyle":"draft","source":"city-pio"}'::jsonb
  );

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
