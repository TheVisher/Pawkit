-- Delete corrupted duplicate collections from Supabase
-- These duplicates were created by sync bug before fix (commits b1f077a, bc006be)
-- Run this SQL in Supabase SQL Editor to clean up server database

DELETE FROM "Collection"
WHERE id IN (
  'cmhwwy77y0007kt04z7v9tgl7', -- Personal sub person test (duplicate)
  'cmhwwxzoe0003kt04ic855omr', -- Personal test (duplicate)
  'cmhwwxxrh0002kt046cds47og', -- Private Test Collection (duplicate)
  'cmhwwv64o0004js04jsjdz6pk', -- Secret Projects (duplicate)
  'cmhwwv0pv0002js047hfija03', -- Secret Projects (duplicate)
  'cmhwwv34w0003js04eh90xj1t', -- Secret Projects (duplicate)
  'cmhwwv9mj0005js0444ell0i4', -- Secret Projects (duplicate)
  'cmhwwy1il0004kt04560zk8uk', -- Sub personal test (duplicate)
  'cmhwwy3dp0005kt043hxsfqtj', -- Sub sub person (duplicate)
  'cmhwwy93j0008kt04dfbdw2dy', -- sub sub sub person (duplicate)
  'cmhwwuywv0001js04ss47cw8q', -- Test (duplicate)
  'cmhwwux1r0000js046ca2i7ly', -- Test Private (duplicate)
  'cmhwwxvvm0001kt04i7lc795s', -- Test Private (duplicate)
  'cmhwwy5ay0006kt04qhce1lfp', -- Test sub sub again (duplicate)
  'cmhwwxteo0000kt042tkti6e1', -- Testing this out (duplicate)
  'cmhwwyl1h0009kt04q6s4nif5'  -- The Den (duplicate)
);

-- Verify deletion
SELECT COUNT(*) as deleted_count FROM "Collection"
WHERE id IN (
  'cmhwwy77y0007kt04z7v9tgl7',
  'cmhwwxzoe0003kt04ic855omr',
  'cmhwwxxrh0002kt046cds47og',
  'cmhwwv64o0004js04jsjdz6pk',
  'cmhwwv0pv0002js047hfija03',
  'cmhwwv34w0003js04eh90xj1t',
  'cmhwwv9mj0005js0444ell0i4',
  'cmhwwy1il0004kt04560zk8uk',
  'cmhwwy3dp0005kt043hxsfqtj',
  'cmhwwy93j0008kt04dfbdw2dy',
  'cmhwwuywv0001js04ss47cw8q',
  'cmhwwux1r0000js046ca2i7ly',
  'cmhwwxvvm0001kt04i7lc795s',
  'cmhwwy5ay0006kt04qhce1lfp',
  'cmhwwxteo0000kt042tkti6e1',
  'cmhwwyl1h0009kt04q6s4nif5'
);
-- Should return 0 if all deleted successfully
