/** Miscellaneous display formatting helpers (Arabic-first). */

const dateFmt = new Intl.DateTimeFormat('ar-LY', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Africa/Tripoli',
});

const dateTimeFmt = new Intl.DateTimeFormat('ar-LY', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Tripoli',
});

export function formatDate(value: string | number | Date): string {
  try {
    return dateFmt.format(new Date(value));
  } catch {
    return String(value);
  }
}

export function formatDateTime(value: string | number | Date): string {
  try {
    return dateTimeFmt.format(new Date(value));
  } catch {
    return String(value);
  }
}

/** Truncate a string to a max length, adding an ellipsis. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

/** Build a WhatsApp click-to-chat URL from a raw local/international number. */
export function whatsappUrl(rawNumber: string, message?: string): string {
  // Normalise a Libyan number to international (218) form for wa.me.
  let digits = rawNumber.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = '218' + digits.slice(1);
  else if (!digits.startsWith('218')) digits = '218' + digits;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
