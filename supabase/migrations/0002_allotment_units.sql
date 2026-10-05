alter table tours.allotments add column unit text not null default 'room' check(unit in ('person','room','vehicle','group'));
create or replace function tours.check_service() returns trigger language plpgsql as $$
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
  if a.unit<>r.unit then raise exception 'allotment unit mismatch'; end if;
  if a.product_id<>r.product_id or a.service_date<>new.service_date then raise exception 'allotment product/date mismatch'; end if;
  if new.status<>'cancelled' then
   if a.status='released' then raise exception 'allotment released'; end if;
   select coalesce(sum(units),0) into occupied from tours.services where allotment_id=a.id and id<>new.id and status<>'cancelled';
   if occupied+new.units>a.units then raise exception 'allotment capacity exceeded'; end if;
  end if;
 end if;
 return new;
end $$;
