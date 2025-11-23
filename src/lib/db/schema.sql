-- Roast Mate core schema (coffees, blends, orders, sessions, on-hand, results, variant mappings)

create table if not exists coffees (
  id text primary key,
  name text not null,
  roast_loss_percentage numeric not null default 0,
  cost_per_kg numeric,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists blends (
  id text primary key,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists blend_components (
  id text primary key,
  blend_id text not null references blends(id) on delete cascade,
  coffee_id text not null references coffees(id) on delete cascade,
  percentage numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists variant_mappings (
  variant_id text primary key,
  coffee_id text not null,
  is_blend boolean not null default false,
  size_g integer not null,
  grind_type text not null default 'Whole bean',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  roast_session_id text references roast_sessions(id) on delete cascade,
  source text not null,
  source_order_id text not null,
  customer_name text not null,
  status text not null default 'included',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  variant_id text not null,
  product_name text not null,
  size_g integer not null,
  grind_type text not null,
  quantity integer not null,
  mapped_coffee_id text not null,
  mapped_is_blend boolean not null default false
);

create table if not exists roast_sessions (
  id text primary key,
  session_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists on_hand_stock (
  id text primary key,
  roast_session_id text not null references roast_sessions(id) on delete cascade,
  bucket_type text not null check (bucket_type in ('coffee','blend')),
  bucket_id text not null,
  on_hand_roasted_g numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (roast_session_id, bucket_type, bucket_id)
);

create table if not exists roast_results (
  id text primary key,
  roast_session_id text not null references roast_sessions(id) on delete cascade,
  coffee_id text not null,
  required_roasted_g numeric not null,
  required_green_g numeric not null,
  drops_required integer not null,
  total_green numeric not null,
  total_roasted_output numeric not null,
  surplus_roasted_g numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders
  add column if not exists roast_session_id text references roast_sessions(id) on delete cascade;
