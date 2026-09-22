/**
 * Admin authorization model (pure, dependency-free so it is unit-testable and
 * covered by the offline typecheck). The database is still the ultimate
 * authority — every RPC and RLS policy re-checks is_admin()/has_permission().
 * This module drives the dashboard navigation and client-side gating only.
 */
import type { AdminPermission, AdminRole } from '@/config/constants';

export interface AdminIdentity {
  id: string;
  fullName: string;
  role: AdminRole;
  permissions: string[];
  active: boolean;
}

/** Owners implicitly hold every permission; others need it in their array. */
export function hasPermission(user: Pick<AdminIdentity, 'role' | 'permissions'>, perm: AdminPermission): boolean {
  if (user.role === 'owner') return true;
  return user.permissions.includes(perm);
}

export const ROLE_LABELS_AR: Record<AdminRole, string> = {
  owner: 'المالك',
  manager: 'مدير',
  staff: 'موظف',
};

export const PERMISSION_LABELS_AR: Record<AdminPermission, string> = {
  view_orders: 'عرض الطلبات',
  manage_orders: 'إدارة الطلبات',
  manage_products: 'إدارة المنتجات',
  manage_inventory: 'إدارة المخزون',
  manage_prices: 'إدارة الأسعار',
  manage_coupons: 'إدارة الكوبونات',
  manage_reviews: 'إدارة التقييمات',
  manage_delivery: 'إدارة التوصيل',
  manage_cms: 'إدارة المحتوى',
  view_analytics: 'عرض التحليلات',
  manage_settings: 'إدارة الإعدادات',
  view_audit_logs: 'عرض سجل التدقيق',
};

/** A single navigation entry. `icon` is a key resolved to a Lucide icon in the UI. */
export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Permission required to see/enter. `null` = any active admin. */
  permission: AdminPermission | null;
  /** Owner-only entries (e.g. admin accounts). */
  ownerOnly?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Full dashboard navigation, grouped for the sidebar. */
export const ADMIN_NAV: NavGroup[] = [
  {
    title: 'نظرة عامة',
    items: [
      { href: '/admin', label: 'لوحة التحكم', icon: 'layout-dashboard', permission: null },
      { href: '/admin/analytics', label: 'التحليلات', icon: 'bar-chart-3', permission: 'view_analytics' },
    ],
  },
  {
    title: 'المبيعات',
    items: [
      { href: '/admin/orders', label: 'الطلبات', icon: 'shopping-bag', permission: 'view_orders' },
      { href: '/admin/customers', label: 'العملاء', icon: 'users', permission: 'view_orders' },
      { href: '/admin/reviews', label: 'التقييمات', icon: 'star', permission: 'manage_reviews' },
    ],
  },
  {
    title: 'الكتالوج',
    items: [
      { href: '/admin/products', label: 'المنتجات', icon: 'package', permission: 'manage_products' },
      { href: '/admin/inventory', label: 'المخزون', icon: 'boxes', permission: 'manage_inventory' },
      { href: '/admin/brands', label: 'العلامات التجارية', icon: 'tag', permission: 'manage_products' },
      { href: '/admin/categories', label: 'التصنيفات', icon: 'folder-tree', permission: 'manage_products' },
      { href: '/admin/collections', label: 'المجموعات', icon: 'layers', permission: 'manage_products' },
      { href: '/admin/families', label: 'العائلات العطرية', icon: 'flower-2', permission: 'manage_products' },
      { href: '/admin/notes', label: 'النوتات العطرية', icon: 'droplet', permission: 'manage_products' },
    ],
  },
  {
    title: 'التسويق',
    items: [
      { href: '/admin/coupons', label: 'الكوبونات', icon: 'ticket', permission: 'manage_coupons' },
      { href: '/admin/promotions', label: 'العروض', icon: 'megaphone', permission: 'manage_coupons' },
    ],
  },
  {
    title: 'المتجر',
    items: [
      { href: '/admin/delivery', label: 'مناطق التوصيل', icon: 'truck', permission: 'manage_delivery' },
      { href: '/admin/cms', label: 'المحتوى', icon: 'newspaper', permission: 'manage_cms' },
      { href: '/admin/settings', label: 'الإعدادات', icon: 'settings', permission: 'manage_settings' },
    ],
  },
  {
    title: 'النظام',
    items: [
      { href: '/admin/audit', label: 'سجل التدقيق', icon: 'scroll-text', permission: 'view_audit_logs' },
      { href: '/admin/accounts', label: 'حسابات المشرفين', icon: 'shield', permission: null, ownerOnly: true },
    ],
  },
];

/** Filter the navigation to what a given identity may see. */
export function visibleNav(user: Pick<AdminIdentity, 'role' | 'permissions'>): NavGroup[] {
  return ADMIN_NAV.map((group) => ({
    title: group.title,
    items: group.items.filter((item) => {
      if (item.ownerOnly && user.role !== 'owner') return false;
      if (item.permission && !hasPermission(user, item.permission)) return false;
      return true;
    }),
  })).filter((group) => group.items.length > 0);
}

/** True when the identity may enter the given admin path. */
export function canAccessPath(user: Pick<AdminIdentity, 'role' | 'permissions'>, path: string): boolean {
  const all = ADMIN_NAV.flatMap((g) => g.items);
  // Longest-prefix match so /admin/orders/123 maps to the /admin/orders entry.
  const match = all
    .filter((i) => i.href === '/admin' ? path === '/admin' : path === i.href || path.startsWith(i.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (!match) return true; // unknown paths fall back to the layout guard (any admin)
  if (match.ownerOnly && user.role !== 'owner') return false;
  if (match.permission && !hasPermission(user, match.permission)) return false;
  return true;
}
