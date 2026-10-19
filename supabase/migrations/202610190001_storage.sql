begin;

create table public.survey_responses (
  id text primary key check (id ~ '^[a-f0-9]{48}$'),
  created_at timestamptz not null,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  practice text not null,
  profile jsonb not null check (jsonb_typeof(profile) = 'object')
);

create table public.admin_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  expires bigint not null,
  password_fingerprint text not null check (password_fingerprint ~ '^[a-f0-9]{64}$')
);

-- Only the application server's secret key may access these tables.
alter table public.survey_responses enable row level security;
alter table public.admin_sessions enable row level security;
revoke all on public.survey_responses from anon, authenticated;
revoke all on public.admin_sessions from anon, authenticated;
grant select, insert on public.survey_responses to service_role;
grant select, insert, delete on public.admin_sessions to service_role;

commit;
