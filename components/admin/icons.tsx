import {
  LayoutDashboard,
  BarChart3,
  ShoppingBag,
  Users,
  Star,
  Package,
  Boxes,
  Tag,
  FolderTree,
  Layers,
  Flower2,
  Droplet,
  Ticket,
  Megaphone,
  Truck,
  Newspaper,
  Settings,
  ScrollText,
  Shield,
  type LucideIcon,
} from 'lucide-react';

/** Nav icon-key → Lucide component (keys used in lib/admin/permissions.ts). */
const MAP: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'bar-chart-3': BarChart3,
  'shopping-bag': ShoppingBag,
  users: Users,
  star: Star,
  package: Package,
  boxes: Boxes,
  tag: Tag,
  'folder-tree': FolderTree,
  layers: Layers,
  'flower-2': Flower2,
  droplet: Droplet,
  ticket: Ticket,
  megaphone: Megaphone,
  truck: Truck,
  newspaper: Newspaper,
  settings: Settings,
  'scroll-text': ScrollText,
  shield: Shield,
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Package;
  return <Icon className={className} size={18} aria-hidden />;
}
