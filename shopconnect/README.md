# ShopConnect — Customer-Shop Connector Platform

ShopConnect is a marketplace platform that connects customers with trusted local shops. Shop owners can publish their products with detailed information, and customers can easily search, compare, and discover products in one place.

Our mission is to make local commerce more accessible, transparent, and efficient.

---

## Overview

ShopConnect enables two main users:

**Shop Owners**

* Publish products
* Add price, description, category, and images
* Provide contact details (phone, social media, location)
* Manage their listings

**Customers**

* Search for products
* Browse categories
* Compare products from different shops
* View shop and product details
* Discover trusted and verified sellers

---

## Key Features

* Product listing and management
* Search and category filtering
* Shop profile integration
* Product detail pages
* Clean and modern landing page
* Fast and responsive interface
* Scalable architecture for large growth

---

## Future Features (Roadmap)

* Verified shop system (to prevent fake listings)
* Ratings and reviews
* Advanced search and filtering
* Location-based discovery
* Messaging between customer and shop
* Admin dashboard
* Analytics for shop owners
* Brand verification system
* Mobile application

---

## Vision

ShopConnect aims to become a trusted platform where customers find real products from real businesses.

As the platform grows, only verified and trusted shops and brands will be allowed to publish listings, ensuring quality and reliability.

---

## Project Structure

```
/app            → Application pages
/components     → UI components
/lib            → Core utilities and services
/public         → Static assets
```

---

## Installation

Clone the repository:

```
git clone https://github.com/yourusername/shopconnect.git
```

Go to project folder:

```
cd shopconnect
```

Install dependencies:

```
npm install
```

Run development server:

```
npm run dev
```

---

## Database Setup (Required)

Role and admin control now use database records. All new signups are treated as customers by default. Owner access is controlled only by the `owner_emails` table managed from admin page.

Create these tables in Supabase:

```sql
create table if not exists public.user_roles (
	email text primary key,
	role text not null check (role in ('shop_owner', 'customer')),
	user_id text,
	terms_accepted_at timestamptz,
	updated_at timestamptz not null default now()
);

create table if not exists public.owner_emails (
	owner_email text primary key,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.owner_controls (
	owner_email text primary key,
	payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'overdue')),
	payment_note text,
	is_active boolean not null default true,
	updated_at timestamptz not null default now()
);

create table if not exists public.profile_settings (
	email text primary key,
	role text not null check (role in ('customer', 'shop_owner')),
	name text,
	phone text,
	preferred_location text,
	address text,
	notify_email boolean not null default true,
	notify_push boolean not null default true,
	show_phone boolean not null default false,
	updated_at timestamptz not null default now()
);
```

Ensure products table tracks ownership:

```sql
alter table public.products
add column if not exists owner_email text;

create index if not exists products_owner_email_idx
on public.products(owner_email);
```

Create a Storage bucket for product media uploads:

```sql
insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;
```

Primary admin email is fixed in code to:

```text
abdigashahun0@gmail.com
```

Optional environment (not required for this setup):

```bash
ADMIN_EMAILS=admin@shopconnect.local,owner1@example.com
```

---

## Usage

Open in browser:

```
http://localhost:3000
```

---

## Target Users

* Local shops
* Retail stores
* Small businesses
* Customers looking for products locally
* Verified brands

---

## Long-Term Goal

Build a scalable, trusted marketplace connecting millions of customers with verified businesses globally.

---

## Contributing

Contributions are welcome. You can improve features, fix bugs, or suggest new ideas.

---

## License

MIT License

---

## Author

Created by Abdi Gashahun

---

## Status

Active development
