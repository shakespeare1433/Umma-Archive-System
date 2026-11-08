-- Keep the four current schools and their official programmes.

insert into public.schools (name) values
  ('School of Business and Technology'),
  ('School of Nursing and Midwifery'),
  ('School of Education'),
  ('School of Law and Sheria')
on conflict (name) do nothing;

update public.programmes
set school = 'School of Nursing and Midwifery'
where school = 'School of Nursing';

update public.programmes
set school = 'School of Law and Sheria'
where school in ('School of Sheria', 'School of Law', 'School of Sheria and Law');

update public.programmes
set code = 'Kiswahili Literature'
where school = 'School of Education' and code = 'Kiswahili';

delete from public.programmes
where school = 'School of Education' and code = 'Arabic';

insert into public.programmes (school, code) values
  ('School of Business and Technology', 'BSIT'),
  ('School of Business and Technology', 'BSCS'),
  ('School of Business and Technology', 'BCOM'),
  ('School of Business and Technology', 'BBM'),
  ('School of Business and Technology', 'BBIT'),
  ('School of Education', 'English Literature'),
  ('School of Education', 'Kiswahili Literature'),
  ('School of Education', 'History'),
  ('School of Education', 'IRE'),
  ('School of Education', 'Sciences'),
  ('School of Nursing and Midwifery', 'Nursing'),
  ('School of Nursing and Midwifery', 'Midwifery'),
  ('School of Law and Sheria', 'Law'),
  ('School of Law and Sheria', 'Islamic Studies'),
  ('School of Law and Sheria', 'Sheria')
on conflict (school, code) do nothing;

delete from public.schools
where name in (
  'School of Nursing',
  'School of Sheria',
  'School of Law',
  'School of Sheria and Law'
);

update public.vault_settings
set faculties = array[
  'School of Business and Technology',
  'School of Nursing and Midwifery',
  'School of Education',
  'School of Law and Sheria'
]
where id = 1;
