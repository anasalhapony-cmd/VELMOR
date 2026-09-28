import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface DashboardMetrics {
  orders_total: number;
  orders_pending: number;
  orders_active: number;
  orders_delivered: number;
  orders_cancelled: number;
  revenue_ordered: number;
  revenue_realised: number;
  aov_realised: number;
  orders_today: number;
  revenue_today: number;
  products_active: number;
  low_stock: number;
  out_of_stock: number;
  reviews_pending: number;
  customers_total: number;
}

const ZERO_METRICS: DashboardMetrics = {
  orders_total: 0, orders_pending: 0, orders_active: 0, orders_delivered: 0, orders_cancelled: 0,
  revenue_ordered: 0, revenue_realised: 0, aov_realised: 0, orders_today: 0, revenue_today: 0,
  products_active: 0, low_stock: 0, out_of_stock: 0, reviews_pending: 0, customers_total: 0,
};

function n(v: unknown): number {
  const x = typeof v === 'string' ? Number(v) : v;
  return typeof x === 'number' && Number.isFinite(x) ? x : 0;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_dashboard_metrics');
  if (error || !data || typeof data !== 'object') return ZERO_METRICS;
  const d = data as Record<string, unknown>;
  return {
    orders_total: n(d.orders_total),
    orders_pending: n(d.orders_pending),
    orders_active: n(d.orders_active),
    orders_delivered: n(d.orders_delivered),
    orders_cancelled: n(d.orders_cancelled),
    revenue_ordered: n(d.revenue_ordered),
    revenue_realised: n(d.revenue_realised),
    aov_realised: n(d.aov_realised),
    orders_today: n(d.orders_today),
    revenue_today: n(d.revenue_today),
    products_active: n(d.products_active),
    low_stock: n(d.low_stock),
    out_of_stock: n(d.out_of_stock),
    reviews_pending: n(d.reviews_pending),
    customers_total: n(d.customers_total),
  };
}

export interface SalesPoint { date: string; orders: number; ordered: number; realised: number }

export async function getSalesSeries(days = 30): Promise<SalesPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('admin_sales_series', { p_days: days });
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    date: String(r.date ?? ''),
    orders: n(r.orders),
    ordered: n(r.ordered),
    realised: n(r.realised),
  }));
}

export interface TopProduct { product_id: string | null; name: string; qty: number; revenue: number }

export async function getTopProducts(limit = 8): Promise<TopProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('admin_top_products', { p_limit: limit });
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    product_id: (r.product_id as string) ?? null,
    name: String(r.name ?? '—'),
    qty: n(r.qty),
    revenue: n(r.revenue),
  }));
}

export interface CityRow { city: string; orders: number; revenue: number }

export async function getOrdersByCity(): Promise<CityRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('admin_orders_by_city');
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    city: String(r.city ?? '—'),
    orders: n(r.orders),
    revenue: n(r.revenue),
  }));
}

export interface CustomerRow {
  phone: string;
  name: string;
  city: string | null;
  orders: number;
  spent: number;
  last_order: string;
}

export async function getCustomers(
  search: string | null,
  limit: number,
  offset: number
): Promise<{ total: number; items: CustomerRow[] }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('admin_customers', {
    p_search: search ?? null,
    p_limit: limit,
    p_offset: offset,
  });
  const d = (data ?? {}) as Record<string, unknown>;
  const items = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
  return {
    total: n(d.total),
    items: items.map((r) => ({
      phone: String(r.phone ?? ''),
      name: String(r.name ?? ''),
      city: (r.city as string) ?? null,
      orders: n(r.orders),
      spent: n(r.spent),
      last_order: String(r.last_order ?? ''),
    })),
  };
}
