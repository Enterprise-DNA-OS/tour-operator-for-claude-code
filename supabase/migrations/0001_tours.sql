create schema tours;
revoke all on schema tours from public;
create function tours.touch() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table tours.suppliers (id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, country text not null default 'NZ', email text, adventure_activity boolean not null default false, registration_ref text, registration_until date, registration_checked_on date, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on tours.suppliers for each row execute function tours.touch();
alter table tours.suppliers enable row level security;
create table tours.products (id uuid primary key default gen_random_uuid(), code text not null unique, supplier_id uuid not null references tours.suppliers(id), name text not null, kind text not null check(kind in ('accommodation','transport','activity','guide','package')), location text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on tours.products for each row execute function tours.touch();
alter table tours.products enable row level security;
create table tours.rates (id uuid primary key default gen_random_uuid(), code text not null unique, product_id uuid not null references tours.products(id), valid_from date not null, valid_to date not null, currency text not null check(currency ~ '^[A-Z]{3}$'), unit text not null check(unit in ('person','room','vehicle','group')), buy_cents bigint not null check(buy_cents>=0), sell_cents bigint not null check(sell_cents>=0), release_days integer not null default 0 check(release_days>=0), cancellation_terms text not null, check(valid_to>=valid_from), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on tours.rates for each row execute function tours.touch();
alter table tours.rates enable row level security;
create table tours.bookings (id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, agent text not null, consultant text not null, travel_date date not null, end_date date, pax integer not null check(pax>0), currency text not null check(currency ~ '^[A-Z]{3}$'), status text not null default 'quote' check(status in ('quote','confirmed','completed','cancelled')), quote_expires date, deposit_due date, deposit_cents bigint not null default 0 check(deposit_cents>=0), received_cents bigint not null default 0 check(received_cents>=0), terms_ref text, last_contact date, source_status text, summary_cost_cents bigint check(summary_cost_cents>=0), summary_sell_cents bigint check(summary_sell_cents>=0), summary_commission_cents bigint check(summary_commission_cents>=0), summary_invoiced_cents bigint check(summary_invoiced_cents>=0), summary_receipted_cents bigint check(summary_receipted_cents>=0), check(end_date is null or end_date>=travel_date), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on tours.bookings for each row execute function tours.touch();
alter table tours.bookings enable row level security;
create table tours.allotments (id uuid primary key default gen_random_uuid(), code text not null unique, product_id uuid not null references tours.products(id), service_date date not null, units integer not null check(units>=0), release_on date not null, status text not null default 'held' check(status in ('held','released')), unique(product_id,service_date), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on tours.allotments for each row execute function tours.touch();
alter table tours.allotments enable row level security;
create table tours.services (id uuid primary key default gen_random_uuid(), code text not null unique, booking_id uuid not null references tours.bookings(id), rate_id uuid not null references tours.rates(id), allotment_id uuid references tours.allotments(id), service_date date not null, units integer not null check(units>0), fx numeric(16,8) not null check(fx>0), buy_cents bigint not null check(buy_cents>=0), sell_cents bigint not null check(sell_cents>=0), status text not null default 'requested' check(status in ('requested','confirmed','cancelled')), confirm_by date not null, cancellation_on date not null, confirmation_ref text, check(status<>'confirmed' or nullif(trim(confirmation_ref),'') is not null), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on tours.services for each row execute function tours.touch();
alter table tours.services enable row level security;
create table tours.passengers (id uuid primary key default gen_random_uuid(), code text not null unique, booking_id uuid not null references tours.bookings(id), name text not null, room text, retention_review_on date not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on tours.passengers for each row execute function tours.touch();
alter table tours.passengers enable row level security;
create table tours.notes (id uuid primary key default gen_random_uuid(), booking_id uuid not null references tours.bookings(id), author text not null, body text not null, recorded_on date not null default current_date, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on tours.notes for each row execute function tours.touch();
alter table tours.notes enable row level security;
create table tours.import_rows (id uuid primary key default gen_random_uuid(), source_key text not null unique, booking_id uuid not null references tours.bookings(id), payload jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on tours.import_rows for each row execute function tours.touch();
alter table tours.import_rows enable row level security;

create function tours.append_only() returns trigger language plpgsql as $$ begin raise exception 'append-only record'; end $$;
create trigger immutable before update or delete on tours.notes for each row execute function tours.append_only();
create trigger immutable before update or delete on tours.import_rows for each row execute function tours.append_only();
create function tours.check_service() returns trigger language plpgsql as $$
declare r tours.rates; b tours.bookings; a tours.allotments; occupied bigint;
begin
 select * into r from tours.rates where id=new.rate_id;
 select * into b from tours.bookings where id=new.booking_id;
 if new.service_date < r.valid_from or new.service_date > r.valid_to then raise exception 'service outside rate validity'; end if;
 if new.service_date < b.travel_date or (b.end_date is not null and new.service_date>b.end_date) then raise exception 'service outside booking dates'; end if;
 if r.currency=b.currency and new.fx<>1 then raise exception 'same currency requires fx 1'; end if;
 if b.status='cancelled' and new.status<>'cancelled' then raise exception 'cancelled booking cannot hold services'; end if;
 if new.allotment_id is not null then
  select * into a from tours.allotments where id=new.allotment_id for update;
  if a.product_id<>r.product_id or a.service_date<>new.service_date then raise exception 'allotment product/date mismatch'; end if;
  if new.status<>'cancelled' then
   if a.status='released' then raise exception 'allotment released'; end if;
   select coalesce(sum(units),0) into occupied from tours.services where allotment_id=a.id and id<>new.id and status<>'cancelled';
   if occupied+new.units>a.units then raise exception 'allotment capacity exceeded'; end if;
  end if;
 end if;
 return new;
end $$;
create trigger validate_service before insert or update on tours.services for each row execute function tours.check_service();
create view tours.service_detail with (security_invoker=true) as
 select s.id,s.code,s.booking_id,b.code booking,b.name booking_name,b.agent,b.currency,s.service_date,p.name product,p.kind,p.location,v.name supplier,v.id supplier_id,r.currency supplier_currency,r.unit,s.units,s.buy_cents,s.sell_cents,s.fx,
 round(s.buy_cents*s.units*s.fx)::bigint cost_cents, (s.sell_cents*s.units)::bigint revenue_cents,s.status,s.confirm_by,s.cancellation_on,s.confirmation_ref,s.allotment_id
 from tours.services s join tours.bookings b on b.id=s.booking_id join tours.rates r on r.id=s.rate_id join tours.products p on p.id=r.product_id join tours.suppliers v on v.id=p.supplier_id;
create view tours.booking_margins with (security_invoker=true) as
 select b.id,b.code,b.name,b.agent,b.consultant,b.travel_date,b.pax,b.currency,b.status,count(s.id)::integer service_count,
 coalesce(sum(s.revenue_cents) filter(where s.status<>'cancelled'),0)::bigint revenue_cents,
 coalesce(sum(s.cost_cents) filter(where s.status<>'cancelled'),0)::bigint cost_cents,
 coalesce(sum(s.revenue_cents-s.cost_cents) filter(where s.status<>'cancelled'),0)::bigint margin_cents,
 round(100.0*sum(s.revenue_cents-s.cost_cents) filter(where s.status<>'cancelled')/nullif(sum(s.revenue_cents) filter(where s.status<>'cancelled'),0),1) margin_pct,
 count(s.id) filter(where s.status='requested')::integer awaiting_confirmation,
 b.summary_sell_cents,b.summary_cost_cents,b.summary_commission_cents,b.summary_invoiced_cents,b.summary_receipted_cents
 from tours.bookings b left join tours.service_detail s on s.booking_id=b.id group by b.id;
create view tours.release_queue with (security_invoker=true) as
 select a.id,a.code,p.name product,a.service_date,a.release_on,a.status,a.units,coalesce(sum(s.units) filter(where s.status<>'cancelled'),0)::integer allocated,
 a.units-coalesce(sum(s.units) filter(where s.status<>'cancelled'),0)::integer unsold
 from tours.allotments a join tours.products p on p.id=a.product_id left join tours.services s on s.allotment_id=a.id group by a.id,p.name;
create view tours.record_checks with (security_invoker=true) as
 select b.code record,'terms-evidence' rule,'Operator policy: record the accepted terms before departure' finding,'policy' authority from tours.bookings b where b.status='confirmed' and nullif(trim(b.terms_ref),'') is null
 union all select s.code,'adventure-registration','Check NZ supplier registration covers this activity and service date','WorkSafe NZ' from tours.service_detail s join tours.suppliers v on v.id=s.supplier_id join tours.bookings b on b.id=s.booking_id where v.country='NZ' and v.adventure_activity and s.status<>'cancelled' and b.status='confirmed' and (v.registration_ref is null or v.registration_until is null or v.registration_until<s.service_date or v.registration_checked_on is null)
 union all select p.code,'retention-review','Review continued purpose for keeping passenger information','NZ Privacy Principle 9' from tours.passengers p where p.retention_review_on<=current_date;
create index on tours.services(booking_id);
create index on tours.services(allotment_id);
create index on tours.bookings(travel_date);
create index on tours.passengers(booking_id);
revoke all on all tables in schema tours from public;
