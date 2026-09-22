import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasPermission,
  visibleNav,
  canAccessPath,
  ADMIN_NAV,
  type AdminIdentity,
} from '@/lib/admin/permissions';

const owner: Pick<AdminIdentity, 'role' | 'permissions'> = { role: 'owner', permissions: [] };
const staffOrders: Pick<AdminIdentity, 'role' | 'permissions'> = {
  role: 'staff',
  permissions: ['view_orders', 'manage_orders'],
};

test('owner implicitly has every permission', () => {
  assert.equal(hasPermission(owner, 'manage_settings'), true);
  assert.equal(hasPermission(owner, 'view_audit_logs'), true);
});

test('staff only has granted permissions', () => {
  assert.equal(hasPermission(staffOrders, 'view_orders'), true);
  assert.equal(hasPermission(staffOrders, 'manage_products'), false);
});

test('visibleNav filters by permission and owner-only', () => {
  const nav = visibleNav(staffOrders);
  const hrefs = nav.flatMap((g) => g.items.map((i) => i.href));
  assert.ok(hrefs.includes('/admin/orders'), 'staff can see orders');
  assert.ok(!hrefs.includes('/admin/settings'), 'staff cannot see settings');
  assert.ok(!hrefs.includes('/admin/accounts'), 'staff cannot see owner-only accounts');
  // owner sees everything
  const ownerHrefs = visibleNav(owner).flatMap((g) => g.items.map((i) => i.href));
  const allHrefs = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.href));
  assert.equal(ownerHrefs.length, allHrefs.length);
});

test('canAccessPath uses longest-prefix match', () => {
  assert.equal(canAccessPath(staffOrders, '/admin/orders/abc-123'), true);
  assert.equal(canAccessPath(staffOrders, '/admin/products'), false);
  assert.equal(canAccessPath(staffOrders, '/admin'), true); // dashboard: any admin
  assert.equal(canAccessPath(owner, '/admin/accounts'), true);
  assert.equal(canAccessPath(staffOrders, '/admin/accounts'), false);
});

test('dashboard entry does not swallow other /admin paths', () => {
  // '/admin' must match exactly, not as a prefix of '/admin/settings'
  assert.equal(canAccessPath(staffOrders, '/admin/settings'), false);
});
