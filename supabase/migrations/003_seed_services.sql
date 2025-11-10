-- Seed service categories
INSERT INTO service_categories (name, description, display_order) VALUES
('Exterior Detailing', 'Professional exterior cleaning and detailing services', 1),
('Interior Detailing', 'Deep interior cleaning and restoration', 2),
('Ceramic Coating & Protection', 'Advanced paint protection and ceramic coating applications', 3),
('Paint Correction', 'Professional paint correction and polishing', 4),
('Specialty Services', 'Additional detailing services and maintenance', 5);

-- Get category IDs for reference
DO $$
DECLARE
  cat_exterior_id UUID;
  cat_interior_id UUID;
  cat_ceramic_id UUID;
  cat_paint_id UUID;
  cat_specialty_id UUID;
BEGIN
  SELECT id INTO cat_exterior_id FROM service_categories WHERE name = 'Exterior Detailing';
  SELECT id INTO cat_interior_id FROM service_categories WHERE name = 'Interior Detailing';
  SELECT id INTO cat_ceramic_id FROM service_categories WHERE name = 'Ceramic Coating & Protection';
  SELECT id INTO cat_paint_id FROM service_categories WHERE name = 'Paint Correction';
  SELECT id INTO cat_specialty_id FROM service_categories WHERE name = 'Specialty Services';

  -- Exterior Detailing Services
  INSERT INTO services (category_id, name, description, small_price, medium_price, large_price, xl_price, duration_hours, is_active) VALUES
  (cat_exterior_id, 'Full Exterior Wash & Dry', 'Complete exterior hand wash with premium products, wheel cleaning, and careful hand drying', 3500, 4500, 5500, 7000, 1.5, true),
  (cat_exterior_id, 'Maintenance Wash', 'Quick maintenance wash for regular customers, includes wash, dry, and tyre shine', 2500, 3000, 3500, 4500, 1.0, true),
  (cat_exterior_id, 'Premium Exterior Detail', 'Full exterior wash, clay bar treatment, iron remover, tar removal, and tyre dressing', 8000, 10000, 12500, 15000, 3.0, true),
  (cat_exterior_id, 'Wheels & Tyres Deep Clean', 'Deep clean of wheels, tyres, and arches with specialist products and brushes', 4000, 4500, 5000, 6000, 1.0, true),

  -- Interior Detailing Services
  (cat_interior_id, 'Interior Valet', 'Full interior vacuum, wipe down of all surfaces, glass cleaning, and air freshener', 5000, 6500, 8000, 10000, 2.0, true),
  (cat_interior_id, 'Deep Interior Detail', 'Comprehensive interior detail including steam cleaning, leather conditioning, fabric protection', 12000, 15000, 18000, 22000, 4.0, true),
  (cat_interior_id, 'Leather Treatment', 'Professional leather cleaning, conditioning, and protection for all leather surfaces', 6000, 7500, 9000, 11000, 2.0, true),
  (cat_interior_id, 'Odour Removal', 'Ozone treatment or specialised cleaning to eliminate persistent odours', 8000, 9000, 10000, 12000, 2.5, true),

  -- Ceramic Coating & Protection
  (cat_ceramic_id, 'Ceramic Coating - 1 Year', 'Professional grade ceramic coating with 1 year protection guarantee', 35000, 45000, 55000, 70000, 8.0, true),
  (cat_ceramic_id, 'Ceramic Coating - 3 Year', 'Premium ceramic coating system with 3 year protection guarantee', 55000, 70000, 85000, 105000, 10.0, true),
  (cat_ceramic_id, 'Ceramic Coating - 5 Year', 'Ultimate ceramic coating with 5 year protection and annual maintenance included', 85000, 105000, 125000, 155000, 12.0, true),
  (cat_ceramic_id, 'Paint Protection Film', 'Clear PPF application for high-impact areas (bonnet, bumper, mirrors)', 120000, 150000, 180000, 220000, 16.0, true),

  -- Paint Correction
  (cat_paint_id, 'Single Stage Polish', 'One stage machine polish to enhance gloss and remove light imperfections', 25000, 32000, 40000, 50000, 6.0, true),
  (cat_paint_id, 'Two Stage Correction', 'Two stage machine polish for moderate swirl removal and paint enhancement', 45000, 55000, 65000, 80000, 10.0, true),
  (cat_paint_id, 'Multi-Stage Correction', 'Premium multi-stage correction for heavily swirled or damaged paintwork', 75000, 95000, 115000, 145000, 16.0, true),

  -- Specialty Services
  (cat_specialty_id, 'Headlight Restoration', 'Professional restoration of cloudy or yellowed headlights', 6000, 6000, 6000, 6000, 1.5, true),
  (cat_specialty_id, 'Engine Bay Detail', 'Careful cleaning and dressing of engine bay components', 8000, 9000, 10000, 12000, 2.0, true),
  (cat_specialty_id, 'New Car Protection Package', 'Complete protection package for new vehicles including ceramic coating and interior protection', 95000, 115000, 135000, 165000, 12.0, true);

END $$;

-- Verify seeded data
DO $$
DECLARE
  service_count INT;
  category_count INT;
BEGIN
  SELECT COUNT(*) INTO service_count FROM services;
  SELECT COUNT(*) INTO category_count FROM service_categories;

  RAISE NOTICE 'Seeded % service categories', category_count;
  RAISE NOTICE 'Seeded % services', service_count;
END $$;
