-- ============================================================================
-- DETAIL DYNAMICS - SERVICES & ADD-ONS DATA POPULATION
-- ============================================================================
-- Populates all services, pricing, and add-ons from the pricing guide
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: INSERT SERVICE CATEGORIES
-- ============================================================================

INSERT INTO service_categories (name, description, display_order) VALUES
('Valeting Services', 'Professional interior and exterior valeting packages', 1),
('Paint Correction & Ceramic Coating', 'Multi-stage paint correction with premium ceramic protection', 2),
('Wheels Off Detail', 'Premium wheel-off detailing service', 3),
('New Car Protection', 'Protection packages for new vehicles under 1,000 miles', 4),
('Paint Protection Film (PPF)', 'Advanced paint protection film installation', 5);

-- ============================================================================
-- STEP 2: INSERT VALETING SERVICES
-- ============================================================================

-- Get category ID for Valeting Services
DO $$
DECLARE
  valeting_cat_id UUID;
  paint_corr_cat_id UUID;
  wheels_off_cat_id UUID;
  new_car_cat_id UUID;
  ppf_cat_id UUID;

  -- Service IDs
  refresher_id UUID;
  reset_id UUID;
  maintenance_id UUID;
  stage1_id UUID;
  stage2_id UUID;
  stage3_id UUID;
  stage4_id UUID;
  wheels_off_id UUID;
  new_car_id UUID;
  ppf_front_id UUID;
  ppf_track_id UUID;
  ppf_full_id UUID;
  ppf_interior_id UUID;

  -- Add-on IDs
  interior_protect_id UUID;
  interior_deep_id UUID;
  wheel_barrel_id UUID;
  wheel_ceramic_id UUID;
  glass_coating_id UUID;
  wheel_coating_ppf_id UUID;
  upgrade_2to4_id UUID;
  upgrade_2to6_id UUID;
  upgrade_2to10_id UUID;
  upgrade_4to6_id UUID;
  upgrade_4to10_id UUID;
  upgrade_6to10_id UUID;

BEGIN
  -- Get category IDs
  SELECT id INTO valeting_cat_id FROM service_categories WHERE name = 'Valeting Services';
  SELECT id INTO paint_corr_cat_id FROM service_categories WHERE name = 'Paint Correction & Ceramic Coating';
  SELECT id INTO wheels_off_cat_id FROM service_categories WHERE name = 'Wheels Off Detail';
  SELECT id INTO new_car_cat_id FROM service_categories WHERE name = 'New Car Protection';
  SELECT id INTO ppf_cat_id FROM service_categories WHERE name = 'Paint Protection Film (PPF)';

  -- ============================================================================
  -- VALETING SERVICES
  -- ============================================================================

  -- 1.1 Refresher Clean
  INSERT INTO services (category_id, name, description, duration_text, availability, includes, display_order)
  VALUES (
    valeting_cat_id,
    'Refresher Clean',
    'A balanced interior and exterior valet that sits between a basic wash and a full deep clean. Ideal for vehicles needing an all-round refresh, especially between full valets or before special occasions.',
    '2-3 hours',
    'both',
    ARRAY[
      'Gentle multi-stage hand wash using two-bucket method',
      'Bug, tar, and sap removal from paint',
      'Wheels and wheel arches cleaned; tyres scrubbed and dressed',
      'Door shuts wiped and detailed',
      'Interior vacuum (seats, carpets, mats, and boot)',
      'Dashboard, centre console, and door panels wiped clean',
      'Exterior and interior windows cleaned',
      'Spray sealant applied (approximately 6 months protection)'
    ],
    1
  ) RETURNING id INTO refresher_id;

  -- Pricing for Refresher Clean
  INSERT INTO service_pricing (service_id, vehicle_size, price_excl_vat, price_incl_vat) VALUES
  (refresher_id, 'small', 8000, 9600),
  (refresher_id, 'medium', 10000, 12000),
  (refresher_id, 'large', 12000, 14400),
  (refresher_id, 'xl', 14000, 16800);

  -- 1.2 Reset Cleanse
  INSERT INTO services (category_id, name, description, duration_text, availability, includes, display_order)
  VALUES (
    valeting_cat_id,
    'Reset Cleanse',
    'A premium valeting service designed to completely revitalize vehicles that need intensive, transformative cleaning. Addresses both interior and exterior in great depth, targeting stubborn grime and ingrained dirt. Perfect for cars that haven''t been professionally valeted in a long time.',
    '4-6 hours',
    'both',
    ARRAY[
      'Thorough multi-stage exterior wash and decontamination',
      'Removal of tough contaminants (tar, sap, bugs)',
      'Meticulous cleaning of every exterior detail',
      'Windows and mirrors cleaned and polished',
      'Tyres and wheel faces cleaned and dressed',
      'Application of light-sealant (upgrade to 12-month sealant available)',
      'Full interior vacuum (seats, carpets, mats, boot)',
      'Dashboard, console, and trim deep-cleaned and dressed',
      'Upholstery and carpets shampooed (lifts stains and eliminates odours)',
      'Leather seats cleaned and conditioned',
      'Protective treatment applied to leather or fabric seats',
      'Interior glass cleaned (streak-free)',
      'Engine bay carefully cleaned and dressed'
    ],
    2
  ) RETURNING id INTO reset_id;

  -- Pricing for Reset Cleanse
  INSERT INTO service_pricing (service_id, vehicle_size, price_excl_vat, price_incl_vat) VALUES
  (reset_id, 'small', 15000, 18000),
  (reset_id, 'medium', 17000, 20400),
  (reset_id, 'large', 19000, 22800),
  (reset_id, 'xl', 21000, 25200);

  -- 1.3 Maintenance Plan
  INSERT INTO services (category_id, name, description, duration_text, availability, requires_quote, includes, notes, display_order)
  VALUES (
    valeting_cat_id,
    'Maintenance Plan',
    'A regular cleaning solution for clients who have already had a comprehensive service. Scheduled valet program (monthly, bi-weekly, etc.) to keep your car continually fresh and preserve the results of larger details or coatings.',
    '1-2 hours',
    'both',
    true,
    ARRAY[
      'Exterior hand wash and dry (removes light dirt and road dust)',
      'Quick bug and grime removal from front end and mirrors',
      'Wheels and tyres cleaned; tyres re-dressed',
      'Exterior glass cleaned',
      'Light wipe-down of body trim and bumpers',
      'Interior vacuum (carpets, mats, seats)',
      'Wipe-down of dashboard, centre console, and door panels',
      'Quick cleaning of cup holders, trims, and high-touch surfaces',
      'Interior windows wiped clean',
      'Air freshener applied'
    ],
    'Pricing is bespoke based on vehicle size and service frequency. Contact Detail Dynamics for a quote.',
    3
  ) RETURNING id INTO maintenance_id;

  -- ============================================================================
  -- PAINT CORRECTION & CERAMIC COATING SERVICES
  -- ============================================================================

  -- 2.1 Stage 1: Gloss Enhancement
  INSERT INTO services (category_id, name, description, duration_text, availability, default_coating_years, includes, display_order)
  VALUES (
    paint_corr_cat_id,
    'Stage 1: Gloss Enhancement',
    'For paintwork that appears dull but shows no visible swirls. Combines thorough exterior cleanse, light machine polishing, and durable protection for a refreshed, high-gloss finish.',
    'Approximately 1-2 days',
    'unit',
    2,
    ARRAY[
      'Complete exterior wash, decontamination, and prep',
      'Gloss-enhancing machine polish (revives depth and shine)',
      'Two-year ceramic coating applied to all paintwork',
      'Wheel faces and glass coated',
      'Light interior tidy (vacuum and wipe-down)'
    ],
    1
  ) RETURNING id INTO stage1_id;

  -- Pricing for Stage 1
  INSERT INTO service_pricing (service_id, vehicle_size, price_excl_vat, price_incl_vat) VALUES
  (stage1_id, 'small', 35000, 42000),
  (stage1_id, 'medium', 45000, 54000),
  (stage1_id, 'large', 55000, 66000),
  (stage1_id, 'xl', 65000, 78000);

  -- 2.2 Stage 2: Single Step Correction
  INSERT INTO services (category_id, name, description, duration_text, availability, default_coating_years, includes, notes, display_order)
  VALUES (
    paint_corr_cat_id,
    'Stage 2: Single Step Correction',
    'Perfect for paintwork showing light swirls and surface haze. Delivers impressive refinement and clarity boost with single-stage machine polish.',
    'Approximately 2 days',
    'unit',
    4,
    ARRAY[
      'Complete exterior wash, decontamination, and clay bar treatment',
      'Single-stage machine polish (removes up to 70% of light swirls)',
      'Four-year ceramic coating applied to paintwork',
      'Wheel faces and glass coated',
      'Light interior tidy (vacuum and wipe-down)'
    ],
    'Removes up to 70% of light swirls',
    2
  ) RETURNING id INTO stage2_id;

  -- Pricing for Stage 2
  INSERT INTO service_pricing (service_id, vehicle_size, price_excl_vat, price_incl_vat) VALUES
  (stage2_id, 'small', 50000, 60000),
  (stage2_id, 'medium', 60000, 72000),
  (stage2_id, 'large', 70000, 84000),
  (stage2_id, 'xl', 80000, 96000);

  -- 2.3 Stage 3: Multi Step Correction
  INSERT INTO services (category_id, name, description, duration_text, availability, default_coating_years, includes, notes, display_order)
  VALUES (
    paint_corr_cat_id,
    'Stage 3: Multi Step Correction',
    'Tailored for vehicles with more noticeable swirls or light scratches. Multi-stage process designed to restore exceptional clarity and depth to paintwork.',
    'Approximately 3 days',
    'unit',
    6,
    ARRAY[
      'Full exterior wash, decontamination, and clay bar treatment',
      'Multi-step machine polishing process (removes 80–90% of defects)',
      'Six-year ceramic coating applied to paintwork',
      'Wheel faces and glass coated',
      'Light interior tidy (optional full deep clean add-on available)'
    ],
    'Removes 80–90% of defects',
    3
  ) RETURNING id INTO stage3_id;

  -- Pricing for Stage 3
  INSERT INTO service_pricing (service_id, vehicle_size, price_excl_vat, price_incl_vat) VALUES
  (stage3_id, 'small', 70000, 84000),
  (stage3_id, 'medium', 80000, 96000),
  (stage3_id, 'large', 90000, 108000),
  (stage3_id, 'xl', 100000, 120000);

  -- 2.4 Stage 4: Deep Correction & Scratch Removal
  INSERT INTO services (category_id, name, description, duration_text, availability, default_coating_years, includes, notes, display_order)
  VALUES (
    paint_corr_cat_id,
    'Stage 4: Deep Correction & Scratch Removal',
    'The ultimate restoration package for heavily swirled or scratched paintwork. Delivers near-perfect finish through extensive correction and premium protection.',
    'Approximately 4-5 days',
    'unit',
    10,
    ARRAY[
      'Comprehensive exterior wash, decontamination, and prep',
      'Multi-stage deep machine polishing (removes up to 99% of defects)',
      'Ten-year ceramic coating applied to all paintwork',
      'Wheels (faces AND barrels) and glass coated',
      'Full interior deep clean INCLUDED'
    ],
    'Removes up to 99% of swirls and scratches. Includes wheel barrel coating and interior deep clean as standard.',
    4
  ) RETURNING id INTO stage4_id;

  -- Pricing for Stage 4
  INSERT INTO service_pricing (service_id, vehicle_size, price_excl_vat, price_incl_vat) VALUES
  (stage4_id, 'small', 100000, 120000),
  (stage4_id, 'medium', 110000, 132000),
  (stage4_id, 'large', 120000, 144000),
  (stage4_id, 'xl', 130000, 156000);

  -- ============================================================================
  -- WHEELS OFF DETAIL
  -- ============================================================================

  INSERT INTO services (category_id, name, description, duration_text, availability, includes, notes, display_order)
  VALUES (
    wheels_off_cat_id,
    'Wheels Off Detail',
    'The top-tier exterior package for enthusiasts and perfectionists. Each wheel is removed for thorough cleaning of wheels, brakes, and arches. Includes full Safe Wash process plus premium 12-month wax protection. Ideal as seasonal treatment or before car shows.',
    '4–6 hours',
    'unit',
    ARRAY[
      'Full Safe Wash process (thorough hand wash, decontamination, bug/tar removal)',
      'Wheels removed one by one for complete barrel cleaning',
      'Brake calipers and wheel arches deep-cleaned',
      'Wheel faces, lug nuts, and tyres cleaned in detail; tyres dressed',
      'Wheels re-fitted with care and properly torqued to manufacturer specs',
      'Paintwork treated with premium 12-month wax',
      'All exterior glass cleaned',
      'Door shuts wiped down',
      'Final inspection'
    ],
    'Exterior-only package (interior valeting can be added separately). Prices vary based on vehicle size and wheel design complexity.',
    1
  ) RETURNING id INTO wheels_off_id;

  -- Pricing for Wheels Off Detail
  INSERT INTO service_pricing (service_id, vehicle_size, price_excl_vat, price_incl_vat) VALUES
  (wheels_off_id, 'small', 18000, 21600),
  (wheels_off_id, 'medium', 21000, 25200),
  (wheels_off_id, 'large', 24000, 28800),
  (wheels_off_id, 'xl', 27000, 32400);

  -- ============================================================================
  -- NEW CAR PROTECTION
  -- ============================================================================

  INSERT INTO services (category_id, name, description, duration_text, availability, default_coating_years, includes, notes, display_order)
  VALUES (
    new_car_cat_id,
    'New Car Protection',
    'For vehicles with fewer than approximately 1,000 miles. Prepares the paint and protects it for years with ceramic coating. Removes transit wax and adhesives, applies light polish, and protects with premium coating.',
    '1–2 days',
    'unit',
    4,
    ARRAY[
      'Careful wash and decontamination (removes transit wax and adhesives)',
      'Light polish to boost gloss where needed',
      'Four-year ceramic coating applied to the car',
      'Wheels and glass coated',
      'Light interior vacuum and wipe-down',
      'Aftercare guidance provided'
    ],
    'Eligibility: Vehicles under ~1,000 miles. Certified Labocosmetica installer.',
    1
  ) RETURNING id INTO new_car_id;

  -- Pricing for New Car Protection
  INSERT INTO service_pricing (service_id, vehicle_size, price_excl_vat, price_incl_vat) VALUES
  (new_car_id, 'small', 30000, 36000),
  (new_car_id, 'medium', 40000, 48000),
  (new_car_id, 'large', 50000, 60000),
  (new_car_id, 'xl', 60000, 72000);

  -- ============================================================================
  -- PAINT PROTECTION FILM (PPF) PACKAGES
  -- ============================================================================

  -- PPF Front End Package
  INSERT INTO services (category_id, name, description, duration_text, availability, warranty_years, includes, notes, display_order)
  VALUES (
    ppf_cat_id,
    'PPF Front End Package',
    'Advanced, nearly invisible polyurethane layer that shields front end from stone chips, scratches, swirl marks, and environmental contaminants. All films are hydrophobic, self-healing, and resistant to yellowing.',
    '2-3 days',
    'unit',
    10,
    ARRAY[
      'Full decontamination wash',
      'Wheels removed and thoroughly cleaned',
      'Enhancement machine polish to areas receiving PPF',
      'PPF application to front bumper, bonnet, front wings, mirrors, headlights',
      'Optional upgrade: protective coating to PPF and surrounding panels'
    ],
    'Starting price. Final price varies based on vehicle size, surface condition, and film type selected. Available in Ultra Gloss, Ultra Satin, Carbon Black, or Glossy Black finishes.',
    1
  ) RETURNING id INTO ppf_front_id;

  -- Pricing for PPF Front End
  INSERT INTO service_pricing (service_id, vehicle_size, price_excl_vat, price_incl_vat) VALUES
  (ppf_front_id, 'small', 130000, 156000),
  (ppf_front_id, 'medium', 130000, 156000),
  (ppf_front_id, 'large', 130000, 156000),
  (ppf_front_id, 'xl', 130000, 156000);

  -- PPF Track Pack
  INSERT INTO services (category_id, name, description, duration_text, availability, warranty_years, includes, notes, display_order)
  VALUES (
    ppf_cat_id,
    'PPF Track Pack',
    'Extended PPF coverage including front end package PLUS additional high-impact areas (e.g., A-pillars, door edges, rear arches). Ideal for track cars or vehicles needing maximum protection.',
    '3-4 days',
    'unit',
    10,
    ARRAY[
      'Full decontamination wash',
      'Wheels removed and thoroughly cleaned',
      'Enhancement machine polish to areas receiving PPF',
      'Extended PPF application (more coverage than Front End)',
      'Optional upgrade: protective coating to PPF and surrounding panels'
    ],
    'Starting price. Final price varies based on vehicle size, surface condition, and film type selected.',
    2
  ) RETURNING id INTO ppf_track_id;

  -- Pricing for PPF Track Pack
  INSERT INTO service_pricing (service_id, vehicle_size, price_excl_vat, price_incl_vat) VALUES
  (ppf_track_id, 'small', 150000, 180000),
  (ppf_track_id, 'medium', 150000, 180000),
  (ppf_track_id, 'large', 150000, 180000),
  (ppf_track_id, 'xl', 150000, 180000);

  -- PPF Full Vehicle Wrap
  INSERT INTO services (category_id, name, description, duration_text, availability, warranty_years, includes, notes, display_order)
  VALUES (
    ppf_cat_id,
    'PPF Full Vehicle Wrap',
    'Complete vehicle body coverage with premium paint protection film. Ultimate protection for your entire vehicle.',
    '5-7 days',
    'unit',
    10,
    ARRAY[
      'Full decontamination wash',
      'Wheels removed and thoroughly cleaned',
      'Enhancement machine polish to entire vehicle',
      'Complete PPF application to all paintwork',
      'Optional upgrade: protective coating to PPF'
    ],
    'Starting price. Final price varies based on vehicle size, surface condition, and film type selected.',
    3
  ) RETURNING id INTO ppf_full_id;

  -- Pricing for PPF Full Vehicle Wrap
  INSERT INTO service_pricing (service_id, vehicle_size, price_excl_vat, price_incl_vat) VALUES
  (ppf_full_id, 'small', 350000, 420000),
  (ppf_full_id, 'medium', 350000, 420000),
  (ppf_full_id, 'large', 350000, 420000),
  (ppf_full_id, 'xl', 350000, 420000);

  -- PPF Interior Trim
  INSERT INTO services (category_id, name, description, duration_text, availability, warranty_years, requires_quote, notes, display_order)
  VALUES (
    ppf_cat_id,
    'PPF Interior Trim Protection',
    'Custom interior trim protection using paint protection film (e.g., dashboard, door panels, center console). Protects high-touch surfaces from wear and scratches.',
    'Variable',
    'unit',
    10,
    true,
    'Price on Application (P.O.A). Contact Detail Dynamics for a custom quote.',
    4
  ) RETURNING id INTO ppf_interior_id;

  -- ============================================================================
  -- STEP 3: INSERT ADD-ONS
  -- ============================================================================

  -- Interior Fabric or Leather Protection
  INSERT INTO add_ons (name, description, price_excl_vat, price_incl_vat, addon_type)
  VALUES (
    'Interior Fabric or Leather Protection',
    'Protective treatment applied to fabric or leather seats to preserve material and resist future staining.',
    7500,
    9000,
    'standard'
  ) RETURNING id INTO interior_protect_id;

  -- Interior Deep Clean
  INSERT INTO add_ons (name, description, price_excl_vat, price_incl_vat, addon_type)
  VALUES (
    'Interior Deep Clean',
    'Full interior valet including shampooing, deep cleaning, and conditioning.',
    10000,
    12000,
    'standard'
  ) RETURNING id INTO interior_deep_id;

  -- Wheel Barrel Coating (for Paint Correction)
  INSERT INTO add_ons (name, description, price_excl_vat, price_incl_vat, addon_type)
  VALUES (
    'Wheel Barrel Coating',
    'Ceramic coating applied to inside of wheels (in addition to wheel faces). Enhanced durability and brake-dust resistance.',
    6000,
    7200,
    'standard'
  ) RETURNING id INTO wheel_barrel_id;

  -- Ceramic Coating on Wheel Faces and Barrels (for Wheels Off Detail)
  INSERT INTO add_ons (name, description, price_excl_vat, price_incl_vat, addon_type)
  VALUES (
    'Ceramic Coating on Wheel Faces and Barrels',
    'Enhanced durability and brake-dust resistance for wheels; makes future cleaning easier.',
    10000,
    12000,
    'standard'
  ) RETURNING id INTO wheel_ceramic_id;

  -- Glass Coating (for PPF)
  INSERT INTO add_ons (name, description, price_excl_vat, price_incl_vat, addon_type)
  VALUES (
    'Glass Coating',
    'Protective coating for all glass surfaces.',
    7500,
    9000,
    'standard'
  ) RETURNING id INTO glass_coating_id;

  -- Wheel Coating (for PPF)
  INSERT INTO add_ons (name, description, price_excl_vat, price_incl_vat, addon_type)
  VALUES (
    'Wheel Coating',
    'Ceramic coating for wheels.',
    7500,
    9000,
    'standard'
  ) RETURNING id INTO wheel_coating_ppf_id;

  -- Coating Upgrades
  INSERT INTO add_ons (name, description, price_excl_vat, price_incl_vat, addon_type, from_years, to_years)
  VALUES (
    'Upgrade to 4-year coating',
    'Extends protection from 2 to 4 years',
    10000,
    12000,
    'coating_upgrade',
    2,
    4
  ) RETURNING id INTO upgrade_2to4_id;

  INSERT INTO add_ons (name, description, price_excl_vat, price_incl_vat, addon_type, from_years, to_years)
  VALUES (
    'Upgrade to 6-year coating',
    'Extends protection from 2/4 to 6 years',
    15000,
    18000,
    'coating_upgrade',
    2,
    6
  ) RETURNING id INTO upgrade_2to6_id;

  INSERT INTO add_ons (name, description, price_excl_vat, price_incl_vat, addon_type, from_years, to_years)
  VALUES (
    'Upgrade to 10-year coating',
    'Extends protection from 2/4/6 to 10 years',
    25000,
    30000,
    'coating_upgrade',
    2,
    10
  ) RETURNING id INTO upgrade_2to10_id;

  INSERT INTO add_ons (name, description, price_excl_vat, price_incl_vat, addon_type, from_years, to_years)
  VALUES (
    'Upgrade from 4-year to 6-year coating',
    'Extends protection from 4 to 6 years',
    15000,
    18000,
    'coating_upgrade',
    4,
    6
  ) RETURNING id INTO upgrade_4to6_id;

  INSERT INTO add_ons (name, description, price_excl_vat, price_incl_vat, addon_type, from_years, to_years)
  VALUES (
    'Upgrade from 4-year to 10-year coating',
    'Extends protection from 4 to 10 years',
    25000,
    30000,
    'coating_upgrade',
    4,
    10
  ) RETURNING id INTO upgrade_4to10_id;

  INSERT INTO add_ons (name, description, price_excl_vat, price_incl_vat, addon_type, from_years, to_years)
  VALUES (
    'Upgrade from 6-year to 10-year coating',
    'Extends protection from 6 to 10 years',
    25000,
    30000,
    'coating_upgrade',
    6,
    10
  ) RETURNING id INTO upgrade_6to10_id;

  -- ============================================================================
  -- STEP 4: LINK ADD-ONS TO SERVICES
  -- ============================================================================

  -- Refresher Clean add-ons
  INSERT INTO service_add_ons (service_id, add_on_id, display_order) VALUES
  (refresher_id, interior_protect_id, 1),
  (refresher_id, interior_deep_id, 2);

  -- Reset Cleanse doesn't need add-ons (already comprehensive)

  -- Stage 1 add-ons
  INSERT INTO service_add_ons (service_id, add_on_id, display_order) VALUES
  (stage1_id, upgrade_2to4_id, 1),
  (stage1_id, upgrade_2to6_id, 2),
  (stage1_id, upgrade_2to10_id, 3),
  (stage1_id, wheel_barrel_id, 4),
  (stage1_id, interior_deep_id, 5),
  (stage1_id, interior_protect_id, 6);

  -- Stage 2 add-ons
  INSERT INTO service_add_ons (service_id, add_on_id, display_order) VALUES
  (stage2_id, upgrade_4to6_id, 1),
  (stage2_id, upgrade_4to10_id, 2),
  (stage2_id, wheel_barrel_id, 3),
  (stage2_id, interior_deep_id, 4),
  (stage2_id, interior_protect_id, 5);

  -- Stage 3 add-ons
  INSERT INTO service_add_ons (service_id, add_on_id, display_order) VALUES
  (stage3_id, upgrade_6to10_id, 1),
  (stage3_id, wheel_barrel_id, 2),
  (stage3_id, interior_deep_id, 3),
  (stage3_id, interior_protect_id, 4);

  -- Stage 4 add-ons (minimal - most included)
  INSERT INTO service_add_ons (service_id, add_on_id, display_order) VALUES
  (stage4_id, interior_protect_id, 1);

  -- Wheels Off Detail add-ons
  INSERT INTO service_add_ons (service_id, add_on_id, display_order) VALUES
  (wheels_off_id, wheel_ceramic_id, 1);

  -- New Car Protection add-ons
  INSERT INTO service_add_ons (service_id, add_on_id, display_order) VALUES
  (new_car_id, upgrade_4to6_id, 1),
  (new_car_id, upgrade_4to10_id, 2),
  (new_car_id, wheel_barrel_id, 3),
  (new_car_id, interior_deep_id, 4),
  (new_car_id, interior_protect_id, 5);

  -- PPF packages add-ons
  INSERT INTO service_add_ons (service_id, add_on_id, display_order) VALUES
  (ppf_front_id, glass_coating_id, 1),
  (ppf_front_id, wheel_coating_ppf_id, 2),
  (ppf_front_id, interior_deep_id, 3);

  INSERT INTO service_add_ons (service_id, add_on_id, display_order) VALUES
  (ppf_track_id, glass_coating_id, 1),
  (ppf_track_id, wheel_coating_ppf_id, 2),
  (ppf_track_id, interior_deep_id, 3);

  INSERT INTO service_add_ons (service_id, add_on_id, display_order) VALUES
  (ppf_full_id, glass_coating_id, 1),
  (ppf_full_id, wheel_coating_ppf_id, 2),
  (ppf_full_id, interior_deep_id, 3);

END $$;

COMMIT;

-- ============================================================================
-- DATA POPULATION COMPLETE
-- ============================================================================
-- All services, pricing tiers, and add-ons have been populated from the
-- Detail Dynamics Complete Services & Pricing Guide
-- ============================================================================
