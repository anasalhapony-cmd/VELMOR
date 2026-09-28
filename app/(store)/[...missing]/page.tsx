import { notFound } from 'next/navigation';

/**
 * Any unmatched storefront URL renders the designed 404 (app/(store)/not-found.tsx)
 * inside the store layout — header, footer and store.css included — instead of
 * Next's unstyled default page.
 */
export default function MissingPage() {
  notFound();
}
