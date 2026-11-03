INSERT INTO categories (slug, name) VALUES
  ('fiori', 'Fiori'),
  ('piante', 'Piante'),
  ('casa', 'Casa'),
  ('regali', 'Regali');

INSERT INTO products (category_id, name, description, emoji, price_cents, stock) VALUES
  ((SELECT id FROM categories WHERE slug = 'fiori'),  'Bouquet Peonia',            'Peonie rosa cipria raccolte a mano, legate con nastro di seta.', '🌸', 3990, 15),
  ((SELECT id FROM categories WHERE slug = 'fiori'),  'Tulipani di Primavera',     'Dieci tulipani misti, perfetti per un tavolo luminoso.',          '🌷', 2450, 30),
  ((SELECT id FROM categories WHERE slug = 'fiori'),  'Girasoli Solari',           'Tre girasoli grandi per portare il sole in casa.',                '🌻', 1800, 20),
  ((SELECT id FROM categories WHERE slug = 'fiori'),  'Rosa Singola',              'Una rosa rossa a stelo lungo, classica e senza tempo.',           '🌹',  650, 100),
  ((SELECT id FROM categories WHERE slug = 'piante'), 'Monstera Deliciosa',        'La pianta da appartamento più amata, vaso in ceramica incluso.',  '🪴', 4500, 8),
  ((SELECT id FROM categories WHERE slug = 'piante'), 'Mini Cactus Trio',          'Tre piccoli cactus che chiedono pochissima acqua.',               '🌵', 1590, 25),
  ((SELECT id FROM categories WHERE slug = 'piante'), 'Lavanda in Vaso',           'Profumo di Provenza sul balcone, fiorisce tutta l''estate.',      '💜', 1200, 40),
  ((SELECT id FROM categories WHERE slug = 'casa'),   'Candela Fiori di Ciliegio', 'Cera di soia, 40 ore di profumo delicato.',                       '🕯️', 1990, 50),
  ((SELECT id FROM categories WHERE slug = 'casa'),   'Vaso in Ceramica Salvia',   'Fatto a mano, smaltato verde salvia opaco.',                      '🏺', 2900, 12),
  ((SELECT id FROM categories WHERE slug = 'casa'),   'Annaffiatoio Vintage',      'In metallo color crema, 1,5 litri.',                              '🚿', 2200, 18),
  ((SELECT id FROM categories WHERE slug = 'regali'), 'Box Regalo "Ti penso"',     'Mini bouquet, candela e biglietto scritto a mano.',               '🎁', 4900, 10),
  ((SELECT id FROM categories WHERE slug = 'regali'), 'Kit Semi del Giardino',     'Semi di margherite, nontiscordardimé e camomilla.',               '🌼',  990, 60);
