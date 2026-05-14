create table if not exists public.download_codes (
  code text primary key,
  product_name text not null default 'FIRSTBLUE SNR PDF',
  file_path text not null default 'firstblue-snr.pdf',
  file_name text not null default 'FIRSTBLUE SNR 169.-.pdf',
  created_at timestamptz not null default now(),
  used_at timestamptz
);

alter table public.download_codes enable row level security;

drop policy if exists "download_codes_no_public_access" on public.download_codes;
create policy "download_codes_no_public_access"
on public.download_codes
for all
using (false)
with check (false);
