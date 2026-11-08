-- Allow lecturer/officer archive search to filter by Bundle ID.

create or replace function public.search_examination_archives(
  p_school text default null,
  p_programme text default null,
  p_session text default null,
  p_unit_code text default null,
  p_unit_name text default null,
  p_student_name text default null,
  p_admission_number text default null,
  p_bundle_id text default null,
  p_query text default null
)
returns setof public.examination_archives
language sql
stable
as $$
  select *
  from public.examination_archives a
  where
    (p_school is null or p_school = '' or p_school = 'All schools' or a.school = p_school)
    and (p_programme is null or p_programme = '' or p_programme = 'All programmes' or a.programme ilike '%' || p_programme || '%')
    and (p_session is null or p_session = '' or p_session = 'All sessions' or a.academic_session = p_session)
    and (
      p_unit_code is null or p_unit_code = ''
      or a.unit_code ilike '%' || p_unit_code || '%'
      or a.unit_name ilike '%' || p_unit_code || '%'
    )
    and (
      p_unit_name is null or p_unit_name = ''
      or a.unit_name ilike '%' || p_unit_name || '%'
      or a.unit_code ilike '%' || p_unit_name || '%'
    )
    and (p_student_name is null or p_student_name = '' or a.student_name ilike '%' || p_student_name || '%')
    and (p_admission_number is null or p_admission_number = '' or a.admission_number ilike '%' || p_admission_number || '%')
    and (p_bundle_id is null or btrim(p_bundle_id) = '' or a.bundle_id ilike '%' || btrim(p_bundle_id) || '%')
    and (
      p_query is null or btrim(p_query) = ''
      or a.unit_code ilike '%' || p_query || '%'
      or a.unit_name ilike '%' || p_query || '%'
      or a.programme ilike '%' || p_query || '%'
      or a.student_name ilike '%' || p_query || '%'
      or a.admission_number ilike '%' || p_query || '%'
      or a.bundle_id ilike '%' || p_query || '%'
    )
  order by a.archived_at desc;
$$;

grant execute on function public.search_examination_archives to authenticated;
