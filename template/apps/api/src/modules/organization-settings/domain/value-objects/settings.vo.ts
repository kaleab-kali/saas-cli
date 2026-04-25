export const AREA_UNITS = ["sqm", "sqft"] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

export const DATE_FORMATS = ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY", "DD-MMM-YYYY"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "KES", "ETB", "NGN", "ZAR", "INR", "CAD", "AUD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const isAreaUnit = (v: string): v is AreaUnit => (AREA_UNITS as readonly string[]).includes(v);
export const isDateFormat = (v: string): v is DateFormat => (DATE_FORMATS as readonly string[]).includes(v);
