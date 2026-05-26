export const DOCUMENT_TYPES = ["INV", "CRE", "DEB", "INT", "RTN", "FIN", "MIX", "INC", "PRF", "OVD"] as const;
export const TRANSACTION_TYPES = ["B2B", "B2C", "B2G", "G2B", "G2C"] as const;
export const SOURCE_SYSTEM_TYPES = ["POS", "ERP", "CRM", "SYS", "MAN", "EFD"] as const;
export const CANCELLATION_REASON_CODES = [
	{ code: "1", label: "Duplicate", status: "confirmed" },
	{ code: "2", label: "Data entry mistake", status: "confirmed" },
	{ code: "3", label: "Order Cancelled", status: "confirmed" },
	{ code: "4", label: "Others", status: "confirmed", requiresRemark: true },
	{ code: "6", label: "Calculation Error", status: "mock_observed_unconfirmed" },
] as const;
export const TAX_CODE_PREFIXES = ["VAT", "TOT", "EXC"] as const;
export const PAYMENT_MODES = [
	"CASH",
	"CHEQUE",
	"CPO",
	"Local Bank Transfer",
	"SWIFT",
	"Wire Transfer",
	"Letter of Credit",
	"Card",
	"Credit",
	"Direct Transfer",
] as const;
export const UNITS_OF_MEASURE = [
	"PCS",
	"KG",
	"G",
	"L",
	"ML",
	"M",
	"CM",
	"M2",
	"M3",
	"BOX",
	"CTN",
	"DZ",
	"PKT",
	"ROLL",
	"HR",
	"DAY",
	"MO",
	"NT",
	"PER",
	"SVC",
] as const;
export const NATURE_OF_SUPPLY = ["Goods", "Service"] as const;
export const REGION_CODES = [
	{ code: "1", label: "Tigray" },
	{ code: "2", label: "Afar" },
	{ code: "3", label: "Amhara" },
	{ code: "4", label: "Oromia" },
	{ code: "5", label: "Somali" },
	{ code: "6", label: "Benishangul-Gumuz" },
	{ code: "7", label: "SNNPR" },
	{ code: "8", label: "Gambela" },
	{ code: "9", label: "Harari" },
	{ code: "11", label: "Sidama" },
	{ code: "12", label: "South West Ethiopia Peoples" },
	{ code: "14", label: "Addis Ababa" },
	{ code: "15", label: "Dire Dawa" },
] as const;

export const isVatTaxCode = (code: string) => code.startsWith("VAT");
export const requiresBuyerTin = (transactionType: string) => !["B2C", "G2C"].includes(transactionType);
