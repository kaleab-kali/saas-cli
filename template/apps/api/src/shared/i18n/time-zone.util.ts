type DateInput = Date | string | number;

const toDate = (value: DateInput) => {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${String(value)}`);
	return date;
};

export function formatDateInTimeZone(
	value: DateInput,
	timeZone = "UTC",
	locale = "en-GB",
	options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) {
	return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(toDate(value));
}

export function formatDateTimeInTimeZone(value: DateInput, timeZone = "UTC", locale = "en-GB") {
	return formatDateInTimeZone(value, timeZone, locale, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}
