BEGIN;

TRUNCATE TABLE
  mutual_aid_requests,
  incident_escalations,
  incident_status_history,
  case_tokens,
  incident_media,
  audit_logs,
  assignments,
  auth_sessions,
  password_reset_tokens,
  rate_limit_buckets,
  data_subject_requests,
  privacy_incidents,
  name_backfill_reviews,
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

-- Keep the core fixture emails stable for tests, but make the seeded identities
-- and local assignments readable for operators who browse the data manually.
-- Seeded operator scope map:
--   - National: admin@xypes.local
--   - Region II: regional.director@xypes.local
--   - Isabela province: supervisor@xypes.local
--   - Ilagan City: ops.lead@xypes.local, content.editor@xypes.local,
--     dispatcher@xypes.local, responder@xypes.local
--   - Tuguegarao City: tuguegarao.city.admin@xypes.local,
--     tuguegarao.content.editor@xypes.local, tuguegarao.dispatcher@xypes.local,
--     tuguegarao.responder@xypes.local
--   - Global read or citizen self-service: auditor@xypes.local, analyst@xypes.local
INSERT INTO users (id, "createdAt", "updatedAt", name, email, "passwordHash", role, "jurisdictionType", "jurisdictionId") VALUES
  ('10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '14 days', NOW() - INTERVAL '2 days', 'Atty. Helena Cruz - National Admin', 'admin@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'NATIONAL_ADMIN', NULL, NULL),
  ('10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '13 days', NOW() - INTERVAL '3 days', 'Dir. Rafael Mendoza - Region II Director', 'regional.director@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'REGIONAL_DIRECTOR', 'region', '12000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '12 days', NOW() - INTERVAL '2 days', 'Liza Aquino - Isabela Provincial Admin', 'supervisor@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'PROVINCIAL_ADMIN', 'province', '13000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000004', NOW() - INTERVAL '11 days', NOW() - INTERVAL '36 hours', 'Aris Santiago - Ilagan City Admin', 'ops.lead@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'CITY_ADMIN', 'city', '14000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000005', NOW() - INTERVAL '10 days', NOW() - INTERVAL '24 hours', 'Mae Villanueva - Ilagan City Content Editor', 'content.editor@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'CITY_CONTENT_EDITOR', 'city', '14000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000006', NOW() - INTERVAL '9 days', NOW() - INTERVAL '18 hours', 'Joel Ramos - Ilagan City Dispatcher', 'dispatcher@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'DISPATCHER', 'city', '14000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000007', NOW() - INTERVAL '8 days', NOW() - INTERVAL '12 hours', 'Angela de Vera - Citizen Reporter', 'analyst@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'CITIZEN_REPORTER', NULL, NULL),
  ('10000000-0000-0000-0000-000000000008', NOW() - INTERVAL '7 days', NOW() - INTERVAL '10 hours', 'Rina Soriano - Ilagan City Responder', 'responder@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'RESPONDER', 'city', '14000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000009', NOW() - INTERVAL '6 days', NOW() - INTERVAL '8 hours', 'Atty. Sofia Torres - Audit Officer', 'auditor@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'AUDITOR', NULL, NULL),
  ('10000000-0000-0000-0000-000000000010', NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 hours', 'Mark Tuliao - Tuguegarao City Admin', 'tuguegarao.city.admin@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'CITY_ADMIN', 'city', '14000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000011', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 hours', 'Paula Gatan - Tuguegarao City Content Editor', 'tuguegarao.content.editor@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'CITY_CONTENT_EDITOR', 'city', '14000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000012', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 hours', 'Noel Pascual - Tuguegarao City Dispatcher', 'tuguegarao.dispatcher@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'DISPATCHER', 'city', '14000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000013', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 hours', 'Carlo Benitez - Tuguegarao City Responder', 'tuguegarao.responder@xypes.local', '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK', 'RESPONDER', 'city', '14000000-0000-0000-0000-000000000002');

INSERT INTO regions (id, code, name, designation, "createdAt", "updatedAt") VALUES
  ('12000000-0000-0000-0000-000000000001', '020000000', 'Cagayan Valley', 'Region II', NOW() - INTERVAL '14 days', NOW() - INTERVAL '2 days');

INSERT INTO provinces (id, code, name, "regionId", "createdAt", "updatedAt") VALUES
  ('13000000-0000-0000-0000-000000000001', '023100000', 'Isabela', '12000000-0000-0000-0000-000000000001', NOW() - INTERVAL '13 days', NOW() - INTERVAL '2 days'),
  ('13000000-0000-0000-0000-000000000002', '021500000', 'Cagayan', '12000000-0000-0000-0000-000000000001', NOW() - INTERVAL '13 days', NOW() - INTERVAL '30 hours');

INSERT INTO cities_municipalities (id, code, name, type, "provinceId", "createdAt", "updatedAt") VALUES
  ('14000000-0000-0000-0000-000000000001', '023126000', 'Roxas', 'MUNICIPALITY', '13000000-0000-0000-0000-000000000001', NOW() - INTERVAL '12 days', NOW() - INTERVAL '36 hours'),
  ('14000000-0000-0000-0000-000000000002', '021529000', 'Tuguegarao City', 'CITY', '13000000-0000-0000-0000-000000000002', NOW() - INTERVAL '12 days', NOW() - INTERVAL '24 hours'),
  ('14000000-0000-0000-0000-000000000003', '023101000', 'Ilagan City', 'CITY', '13000000-0000-0000-0000-000000000001', NOW() - INTERVAL '12 days', NOW() - INTERVAL '20 hours'),
  ('14000000-0000-0000-0000-000000000004', '023108000', 'Cauayan City', 'CITY', '13000000-0000-0000-0000-000000000001', NOW() - INTERVAL '12 days', NOW() - INTERVAL '18 hours');

INSERT INTO barangays (id, code, name, "cityMunicipalityId", "createdAt", "updatedAt") VALUES
  ('15000000-0000-0000-0000-000000000001', '021529001', 'Bagay', '14000000-0000-0000-0000-000000000002', NOW() - INTERVAL '11 days', NOW() - INTERVAL '18 hours'),
  ('15000000-0000-0000-0000-000000000002', '021529002', 'Carig Sur', '14000000-0000-0000-0000-000000000002', NOW() - INTERVAL '11 days', NOW() - INTERVAL '17 hours'),
  ('15000000-0000-0000-0000-000000000003', '021529003', 'Centro 10', '14000000-0000-0000-0000-000000000002', NOW() - INTERVAL '11 days', NOW() - INTERVAL '16 hours'),
  ('15000000-0000-0000-0000-000000000004', '023101001', 'Alibagu', '14000000-0000-0000-0000-000000000003', NOW() - INTERVAL '11 days', NOW() - INTERVAL '15 hours'),
  ('15000000-0000-0000-0000-000000000005', '023101002', 'San Vicente', '14000000-0000-0000-0000-000000000003', NOW() - INTERVAL '11 days', NOW() - INTERVAL '14 hours'),
  ('15000000-0000-0000-0000-000000000006', '023126001', 'Munumun', '14000000-0000-0000-0000-000000000001', NOW() - INTERVAL '11 days', NOW() - INTERVAL '13 hours');

-- Preserve the stable sample locality and barangay fixture IDs above, then add the
-- remaining Cagayan PSGC coverage without overwriting those fixed rows.
\i /workspace/prisma/seed-cagayan-province-supplement.sql

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
    'Draft copy for next week''s community cleanup drive.',
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
  ),
  (
    '11000000-0000-0000-0000-000000000005',
    NOW() - INTERVAL '20 hours',
    NOW() - INTERVAL '90 minutes',
    'mytuguegarao-city-services-brief',
    'City service desks are open for guided next steps',
    'Residents can review office hours, required records, and the right city desk before visiting or calling.',
    'Use MyTuguegarao to review current city service guidance, prepare the required records, and confirm which office handles your request. Online incident reporting stays live in CIRS, while other service lanes currently provide guided next steps only.',
    'service-update',
    'notifications',
    NULL,
    'https://images.xypes.local/mytuguegarao/city-services-brief.jpg',
    'Open services',
    '/services',
    3,
    true,
    NOW() - INTERVAL '18 hours',
    '{"city":"Tuguegarao City","appCategory":"Service Updates","featureStyle":"bulletin","source":"city-digital-services","priority":"normal"}'::jsonb
  ),
  (
    '11000000-0000-0000-0000-000000000006',
    NOW() - INTERVAL '16 hours',
    NOW() - INTERVAL '70 minutes',
    'mytuguegarao-notification-feed-update',
    'Verified city notifications now come from the official mobile content feed',
    'Announcements, advisories, and service reminders shown in the app should match published city content.',
    'The MyTuguegarao notifications feed now highlights published city announcements, advisories, and service reminders from the official mobile content channel so citizens are not shown fabricated transaction updates.',
    'announcement',
    'notifications',
    NULL,
    'https://images.xypes.local/mytuguegarao/mobile-content-feed.jpg',
    'View updates',
    '/notifications',
    4,
    true,
    NOW() - INTERVAL '14 hours',
    '{"city":"Tuguegarao City","appCategory":"App Updates","featureStyle":"bulletin","source":"city-digital-services","priority":"normal"}'::jsonb
  ),
  (
    '11000000-0000-0000-0000-000000000007',
    NOW() - INTERVAL '12 hours',
    NOW() - INTERVAL '55 minutes',
    'mobile-service-review-guidance',
    'Review the records and contact details before proceeding',
    'Non-incident city services currently guide residents to the right office, records, and follow-up channel rather than creating a live online transaction.',
    'Check the request details you entered, confirm the required records, and make sure your preferred follow-up channel is correct before moving to the next guidance step.',
    'service-guidance',
    'service-guidance',
    NULL,
    NULL,
    'Open services',
    '/services',
    1,
    true,
    NOW() - INTERVAL '11 hours',
    '{"screen":"review","serviceId":"*","statusLabel":"Guidance review","disclaimer":"This flow prepares residents for the correct city desk and required records. It does not yet create a live online service request outside incident reporting.","nextStepLabel":"Review the request details, office, and preparation notes before continuing."}'::jsonb
  ),
  (
    '11000000-0000-0000-0000-000000000008',
    NOW() - INTERVAL '10 hours',
    NOW() - INTERVAL '45 minutes',
    'mobile-service-receipt-guidance',
    'Your next-step guide is ready',
    'Use this screen as a city-issued guide to office, records, and follow-up channels for non-incident services.',
    'Keep this guidance summary so you know which city office to approach, what records to prepare, and how to follow up if the desk asks for more information.',
    'service-guidance',
    'service-guidance',
    NULL,
    NULL,
    'View tracking guide',
    '/services',
    2,
    true,
    NOW() - INTERVAL '9 hours',
    '{"screen":"receipt","serviceId":"*","statusLabel":"Guidance ready","disclaimer":"Non-incident services in the current pilot provide official guidance only. Receipt, queue, and payment confirmation details are shown only when a real backend transaction exists.","nextStepLabel":"Use the office and preparation notes below for the next city follow-up."}'::jsonb
  ),
  (
    '11000000-0000-0000-0000-000000000009',
    NOW() - INTERVAL '8 hours',
    NOW() - INTERVAL '40 minutes',
    'mobile-service-tracker-guidance',
    'Follow the official next steps for city service requests',
    'Until a live online transaction exists for a service, this screen should guide preparation, office contact, and follow-up expectations.',
    'Use the guided next steps below to prepare records, contact the correct city office, and confirm any on-site or phone follow-up expected for this service.',
    'service-guidance',
    'service-guidance',
    NULL,
    NULL,
    'Return to services',
    '/services',
    3,
    true,
    NOW() - INTERVAL '7 hours',
    '{"screen":"tracker","serviceId":"*","statusLabel":"Next steps guidance","followUpLane":"Official city service desk","disclaimer":"This is a guidance timeline, not a live case tracker. Live status changes appear only for services with an actual backend workflow such as incident reporting.","timeline":[{"id":"prepare-records","title":"Prepare records","copy":"Gather the required IDs, reference numbers, and supporting documents before contacting the city office.","state":"done"},{"id":"confirm-office","title":"Confirm the right desk","copy":"Use the office details below to confirm where the service is handled and whether the desk needs an appointment or walk-in visit.","state":"active"},{"id":"follow-up","title":"Watch for follow-up instructions","copy":"Keep your chosen contact channel available in case the city desk asks for added documents, schedule changes, or release guidance.","state":"upcoming"}]}'::jsonb
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
  ('60000000-0000-0000-0000-000000000001', NOW() - INTERVAL '9 days', NOW() - INTERVAL '18 hours', 'Grace Dela Rosa', 'grace.delarosa@example.com', 'SMS');

INSERT INTO agencies (id, "createdAt", "updatedAt", name, "contactNumber") VALUES
  ('70000000-0000-0000-0000-000000000001', NOW() - INTERVAL '14 days', NOW() - INTERVAL '3 days', 'Tuguegarao City Fire Station', '+63-78-844-1180'),
  ('70000000-0000-0000-0000-000000000002', NOW() - INTERVAL '13 days', NOW() - INTERVAL '3 days', 'Tuguegarao City Rescue 1111', '+63-78-844-1111'),
  ('70000000-0000-0000-0000-000000000003', NOW() - INTERVAL '12 days', NOW() - INTERVAL '2 days', 'Ilagan City Public Safety Office', '+63-78-323-0280'),
  ('70000000-0000-0000-0000-000000000004', NOW() - INTERVAL '11 days', NOW() - INTERVAL '2 days', 'Ilagan City DRRM Operations Center', '+63-78-323-1176');

INSERT INTO responders (id, "createdAt", "updatedAt", name, "agencyId", role, "contactInfo") VALUES
  ('80000000-0000-0000-0000-000000000001', NOW() - INTERVAL '9 days', NOW() - INTERVAL '30 hours', 'SFO3 Ramon Tuliao', '70000000-0000-0000-0000-000000000001', 'Fire Incident Commander', 'r.tuliao@tuguegarao.gov.ph'),
  ('80000000-0000-0000-0000-000000000002', NOW() - INTERVAL '8 days', NOW() - INTERVAL '28 hours', 'FO2 Clarisse Ulep', '70000000-0000-0000-0000-000000000001', 'Pump Operator', 'c.ulep@tuguegarao.gov.ph'),
  ('80000000-0000-0000-0000-000000000003', NOW() - INTERVAL '7 days', NOW() - INTERVAL '26 hours', 'EMT Bryan Battung', '70000000-0000-0000-0000-000000000002', 'Paramedic', 'b.battung@tuguegarao.gov.ph'),
  ('80000000-0000-0000-0000-000000000004', NOW() - INTERVAL '6 days', NOW() - INTERVAL '24 hours', 'PSMS Joel Navarro', '70000000-0000-0000-0000-000000000003', 'Traffic Control Officer', 'j.navarro@ilagan.gov.ph'),
  ('80000000-0000-0000-0000-000000000005', NOW() - INTERVAL '5 days', NOW() - INTERVAL '22 hours', 'Engr. Marco Sy', '70000000-0000-0000-0000-000000000004', 'Operations Officer', 'm.sy@ilagan.gov.ph');

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
  ('90000000-0000-0000-0000-000000000001', NOW() - INTERVAL '36 hours', NOW() - INTERVAL '34 hours', 'Kitchen fire triggered by a faulty extension cord in a boarding house.', 'https://example.com/media/tuguegarao-incident-001.jpg', NOW() - INTERVAL '36 hours', 17.6153000, 121.7270000, '18 Mabini Street', NULL, 'Centro 10', NULL, 'Tuguegarao City', 'Cagayan', 'Cagayan Valley', '3500', 'Across Tuguegarao City West Central School', '20000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004'),
  ('90000000-0000-0000-0000-000000000002', NOW() - INTERVAL '30 hours', NOW() - INTERVAL '28 hours', 'Senior citizen experienced shortness of breath during heavy rain and needed transport.', 'https://example.com/media/tuguegarao-incident-002.jpg', NOW() - INTERVAL '30 hours', 17.6411000, 121.7312000, '26 Carig Sur Road', 'House near chapel', 'Carig Sur', NULL, 'Tuguegarao City', 'Cagayan', 'Cagayan Valley', '3500', 'Near Carig barangay hall', '20000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003'),
  ('90000000-0000-0000-0000-000000000003', NOW() - INTERVAL '22 hours', NOW() - INTERVAL '16 hours', 'Floodwater from an overflowed drainage canal blocked the school access road.', 'https://example.com/media/ilagan-incident-003.jpg', NOW() - INTERVAL '22 hours', 17.1495000, 121.8897000, 'Purok 3, Alibagu', NULL, 'Alibagu', NULL, 'Ilagan City', 'Isabela', 'Cagayan Valley', '3300', 'Beside Alibagu National High School gate', '20000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004'),
  ('90000000-0000-0000-0000-000000000004', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours', 'Two motorcycles collided near the public market and traffic built up quickly.', 'https://example.com/media/ilagan-incident-004.jpg', NOW() - INTERVAL '4 hours', 17.1489000, 121.8890000, 'Maharlika Highway', 'Front of public market entrance', 'San Vicente', NULL, 'Ilagan City', 'Isabela', 'Cagayan Valley', '3300', 'Near pedestrian crossing', '20000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002'),
  ('90000000-0000-0000-0000-000000000005', NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '45 minutes', 'Fallen acacia tree blocked one lane after strong winds overnight.', 'https://example.com/media/tuguegarao-incident-005.jpg', NOW() - INTERVAL '90 minutes', 17.6209000, 121.7236000, 'Bagay Road', NULL, 'Bagay', NULL, 'Tuguegarao City', 'Cagayan', 'Cagayan Valley', '3500', 'Near tricycle terminal', '20000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002');

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
  ('a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '35 hours 50 minutes', NOW() - INTERVAL '34 hours 30 minutes', '90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', NOW() - INTERVAL '35 hours 50 minutes', NOW() - INTERVAL '35 hours 42 minutes', NOW() - INTERVAL '34 hours 30 minutes', 'Contained', 'Tuguegarao fire crew knocked down the fire in under 20 minutes and completed overhaul before dawn.'),
  ('a0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '29 hours 45 minutes', NOW() - INTERVAL '28 hours 55 minutes', '90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000003', NOW() - INTERVAL '29 hours 45 minutes', NOW() - INTERVAL '29 hours 38 minutes', NOW() - INTERVAL '28 hours 55 minutes', 'Stabilized', 'Responder team stabilized the patient and endorsed transport to Cagayan Valley Medical Center.'),
  ('a0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '21 hours 50 minutes', NOW() - INTERVAL '16 hours 20 minutes', '90000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000005', NOW() - INTERVAL '21 hours 50 minutes', NOW() - INTERVAL '21 hours 35 minutes', NOW() - INTERVAL '16 hours 20 minutes', 'Mitigated', 'Ilagan DRRM deployed pumps and sandbags until the school access lane became passable again.'),
  ('a0000000-0000-0000-0000-000000000004', NOW() - INTERVAL '3 hours 45 minutes', NOW() - INTERVAL '35 minutes', '90000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000004', NOW() - INTERVAL '3 hours 45 minutes', NOW() - INTERVAL '3 hours 36 minutes', NULL, 'Under Investigation', 'Traffic officers cleared one lane and coordinated witness interviews for the responding desk officer.'),
  ('a0000000-0000-0000-0000-000000000005', NOW() - INTERVAL '80 minutes', NOW() - INTERVAL '20 minutes', '90000000-0000-0000-0000-000000000005', '80000000-0000-0000-0000-000000000002', NOW() - INTERVAL '80 minutes', NULL, NULL, 'For Dispatch', 'Tree-cutting team is on standby while utility personnel confirm the overhead lines are already safe.');

COMMIT;
