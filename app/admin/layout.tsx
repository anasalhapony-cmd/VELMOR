import '../globals.css';

/** Admin-only stylesheet (Tailwind). Kept out of the root layout so it never
 *  touches the storefront's approved design (app/(store)/store.css). */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-paper text-ink font-sans antialiased">{children}</div>;
}
