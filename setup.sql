-- ================================================================
-- POS-STORE — Supabase schema
-- ຮັນໄຟລ໌ນີ້ໃນ Supabase Dashboard → SQL Editor → New query → Run
-- ================================================================

-- ---------- ໝວດສິນຄ້າ ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

insert into categories (name) values
  ('ເຄື່ອງແຫ້ງ'), ('ອາຫານສົດ'), ('ວັດສະດຸກໍ່ສ້າງ'), ('ອື່ນໆ')
on conflict (name) do nothing;

-- ---------- ສິນຄ້າ ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  unit text not null default 'ອັນ',
  cost numeric not null default 0,
  price numeric not null default 0,
  qty numeric not null default 0,
  low_threshold numeric not null default 0,
  barcode text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_products_category on products(category);
create index if not exists idx_products_barcode on products(barcode);

-- ---------- ບິນຂາຍ (ໜົວບິນ) ----------
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  total numeric not null default 0,
  total_cost numeric not null default 0,
  profit numeric not null default 0,
  cash_received numeric,
  created_at timestamptz default now()
);

create index if not exists idx_sales_created on sales(created_at);

-- ---------- ລາຍການໃນແຕ່ລະບິນ ----------
create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references sales(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  name text not null,
  unit text not null,
  qty numeric not null,
  price numeric not null,
  cost numeric not null
);

create index if not exists idx_sale_items_sale on sale_items(sale_id);

-- ---------- ຂໍ້ມູນຮ້ານ / ຕັ້ງຄ່າ (ແຖວດຽວ) ----------
create table if not exists app_settings (
  id int primary key default 1,
  shop_name text not null default 'ຮ້ານເອື້ອຍ',
  pin text not null default '1234',
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into app_settings (id, shop_name, pin) values (1, 'ຮ້ານເອື້ອຍ', '1234')
on conflict (id) do nothing;

-- ================================================================
-- ROW LEVEL SECURITY
-- ໝາຍເຫດ: ລະບົບນີ້ບໍ່ໄດ້ໃຊ້ Supabase Auth (login ຜູ້ໃຊ້) — ປ້ອງກັນດ້ວຍ
-- PIN screen ຢູ່ຝັ່ງ browser ເທົ່ານັ້ນ. ນັ້ນໝາຍຄວາມວ່າຖ້າມີຄົນຮູ້ Supabase
-- URL + anon key ຂອງເຈົ້າ ("ດ»" ຢູ່ໃນ config.js) ເຂົາສາມາດເອີ້ນ API ກົງໆ
-- ໂດຍຂ້າມໜ້າ PIN ໄດ້. ນີ້ພຽງພໍສຳລັບຮ້ານທົດລອງໃຊ້ພາຍໃນ, ແຕ່ຖ້າຈະຂາຍເປັນ
-- SaaS ໃຫ້ຮ້ານອື່ນໃນອະນາຄົດ ຄວນປ່ຽນມາໃຊ້ Supabase Auth ແທນ.
-- ================================================================
alter table categories enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table app_settings enable row level security;

drop policy if exists "allow all - categories" on categories;
drop policy if exists "allow all - products" on products;
drop policy if exists "allow all - sales" on sales;
drop policy if exists "allow all - sale_items" on sale_items;
drop policy if exists "allow all - app_settings" on app_settings;

create policy "allow all - categories" on categories for all using (true) with check (true);
create policy "allow all - products" on products for all using (true) with check (true);
create policy "allow all - sales" on sales for all using (true) with check (true);
create policy "allow all - sale_items" on sale_items for all using (true) with check (true);
create policy "allow all - app_settings" on app_settings for all using (true) with check (true);

-- ---------- ອັບເດດ updated_at ອັດຕະໂນມັດ ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();

-- ================================================================
-- ຕົວຢ່າງສິນຄ້າເລີ່ມຕົ້ນ (ລຶບແຖວນີ້ອອກໄດ້ຖ້າບໍ່ຕ້ອງການ)
-- ================================================================
insert into products (name, category, unit, cost, price, qty, low_threshold, barcode) values
  ('ນ້ຳປາ ແກ້ວໃຫຍ່', 'ເຄື່ອງແຫ້ງ', 'ອັນ', 8000, 12000, 24, 5, '8850001'),
  ('ເສັ້ນໝີ່ ຫໍ່', 'ເຄື່ອງແຫ້ງ', 'ອັນ', 3000, 5000, 40, 10, '8850002'),
  ('ຜັກກາດຂາວ', 'ອາຫານສົດ', 'ກິໂລ', 6000, 10000, 8, 3, null),
  ('ປາຂາວ', 'ອາຫານສົດ', 'ກິໂລ', 25000, 35000, 4, 2, null),
  ('ປູນຊີມັງ ຖົງ', 'ວັດສະດຸກໍ່ສ້າງ', 'ຖົງ', 45000, 55000, 15, 5, '8850010'),
  ('ທໍ່ PVC', 'ວັດສະດຸກໍ່ສ້າງ', 'ແມັດ', 12000, 18000, 30, 8, null)
on conflict do nothing;
