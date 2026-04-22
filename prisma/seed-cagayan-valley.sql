-- Seed data: Region II — Cagayan Valley (PSGC-based)
-- Covers region, 5 provinces, key cities/municipalities, and sample barangays for Tuguegarao City.

BEGIN;

-- ─── Region ────────────────────────────────────────────────────────────────────
INSERT INTO regions (id, code, name, designation, "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), '020000000', 'Cagayan Valley', 'Region II', NOW(), NOW());

-- ─── Provinces ─────────────────────────────────────────────────────────────────
WITH region AS (SELECT id FROM regions WHERE code = '020000000')
INSERT INTO provinces (id, code, name, "regionId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v.code, v.name, region.id, NOW(), NOW()
FROM region, (VALUES
  ('021000000', 'Batanes'),
  ('021500000', 'Cagayan'),
  ('023100000', 'Isabela'),
  ('025000000', 'Nueva Vizcaya'),
  ('025700000', 'Quirino')
) AS v(code, name);

-- ─── Cities/Municipalities: Batanes ────────────────────────────────────────────
WITH province AS (SELECT id FROM provinces WHERE code = '021000000')
INSERT INTO cities_municipalities (id, code, name, type, "provinceId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v.code, v.name, v.type, province.id, NOW(), NOW()
FROM province, (VALUES
  ('021001000', 'Basco',   'MUNICIPALITY'),
  ('021002000', 'Itbayat', 'MUNICIPALITY'),
  ('021003000', 'Ivana',   'MUNICIPALITY'),
  ('021004000', 'Mahatao', 'MUNICIPALITY'),
  ('021005000', 'Sabtang', 'MUNICIPALITY'),
  ('021006000', 'Uyugan',  'MUNICIPALITY')
) AS v(code, name, type);

-- ─── Cities/Municipalities: Cagayan ────────────────────────────────────────────
WITH province AS (SELECT id FROM provinces WHERE code = '021500000')
INSERT INTO cities_municipalities (id, code, name, type, "provinceId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v.code, v.name, v.type, province.id, NOW(), NOW()
FROM province, (VALUES
  ('021528000', 'Tuguegarao City', 'CC'),
  ('021502000', 'Aparri',          'MUNICIPALITY'),
  ('021503000', 'Baggao',          'MUNICIPALITY'),
  ('021504000', 'Ballesteros',     'MUNICIPALITY'),
  ('021507000', 'Claveria',        'MUNICIPALITY'),
  ('021508000', 'Enrile',          'MUNICIPALITY'),
  ('021509000', 'Gattaran',        'MUNICIPALITY'),
  ('021510000', 'Gonzaga',         'MUNICIPALITY'),
  ('021513000', 'Lal-lo',          'MUNICIPALITY'),
  ('021518000', 'Peñablanca',      'MUNICIPALITY'),
  ('021522000', 'Santa Ana',       'MUNICIPALITY'),
  ('021524000', 'Solana',          'MUNICIPALITY'),
  ('021527000', 'Tuao',            'MUNICIPALITY')
) AS v(code, name, type);

-- ─── Cities/Municipalities: Isabela ────────────────────────────────────────────
WITH province AS (SELECT id FROM provinces WHERE code = '023100000')
INSERT INTO cities_municipalities (id, code, name, type, "provinceId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v.code, v.name, v.type, province.id, NOW(), NOW()
FROM province, (VALUES
  ('023105000', 'Cauayan City', 'CC'),
  ('023116000', 'Ilagan City',  'CC'),
  ('023128000', 'Santiago City', 'ICC'),
  ('023101000', 'Alicia',       'MUNICIPALITY'),
  ('023103000', 'Cabagan',      'MUNICIPALITY'),
  ('023109000', 'Echague',      'MUNICIPALITY'),
  ('023117000', 'Jones',        'MUNICIPALITY'),
  ('023126000', 'Roxas',        'MUNICIPALITY'),
  ('023133000', 'Tumauini',     'MUNICIPALITY')
) AS v(code, name, type);

-- ─── Cities/Municipalities: Nueva Vizcaya ──────────────────────────────────────
WITH province AS (SELECT id FROM provinces WHERE code = '025000000')
INSERT INTO cities_municipalities (id, code, name, type, "provinceId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v.code, v.name, v.type, province.id, NOW(), NOW()
FROM province, (VALUES
  ('025002000', 'Bayombong',     'MUNICIPALITY'),
  ('025011000', 'Solano',        'MUNICIPALITY'),
  ('025001000', 'Bambang',       'MUNICIPALITY'),
  ('025015000', 'Aritao',        'MUNICIPALITY'),
  ('025004000', 'Dupax del Sur', 'MUNICIPALITY'),
  ('025008000', 'Kayapa',        'MUNICIPALITY')
) AS v(code, name, type);

-- ─── Cities/Municipalities: Quirino ────────────────────────────────────────────
WITH province AS (SELECT id FROM provinces WHERE code = '025700000')
INSERT INTO cities_municipalities (id, code, name, type, "provinceId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v.code, v.name, v.type, province.id, NOW(), NOW()
FROM province, (VALUES
  ('025701000', 'Cabarroguis', 'MUNICIPALITY'),
  ('025702000', 'Diffun',      'MUNICIPALITY'),
  ('025703000', 'Maddela',     'MUNICIPALITY'),
  ('025704000', 'Saguday',     'MUNICIPALITY'),
  ('025706000', 'Aglipay',     'MUNICIPALITY'),
  ('025705000', 'Nagtipunan',  'MUNICIPALITY')
) AS v(code, name, type);

-- ─── Barangays: Tuguegarao City (sample) ───────────────────────────────────────
WITH city AS (SELECT id FROM cities_municipalities WHERE code = '021528000')
INSERT INTO barangays (id, code, name, "cityMunicipalityId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v.code, v.name, city.id, NOW(), NOW()
FROM city, (VALUES
  ('021528001', 'Centro 1'),
  ('021528002', 'Centro 2'),
  ('021528003', 'Centro 3'),
  ('021528004', 'Annafunan East'),
  ('021528005', 'Annafunan West'),
  ('021528006', 'Atulayan Norte'),
  ('021528007', 'Atulayan Sur'),
  ('021528008', 'Bagay'),
  ('021528009', 'Caggay'),
  ('021528010', 'Caritan Norte'),
  ('021528011', 'Caritan Sur'),
  ('021528012', 'Cataggaman Nuevo'),
  ('021528013', 'Cataggaman Pardo'),
  ('021528014', 'Cataggaman Viejo'),
  ('021528015', 'Leonarda'),
  ('021528016', 'Linao Norte'),
  ('021528017', 'Linao East'),
  ('021528018', 'Pallua Norte'),
  ('021528019', 'Pallua Sur'),
  ('021528020', 'Pengue-Ruyu'),
  ('021528021', 'San Gabriel'),
  ('021528022', 'Tagga'),
  ('021528023', 'Tanza'),
  ('021528024', 'Ugac Norte'),
  ('021528025', 'Ugac Sur')
) AS v(code, name);

COMMIT;
