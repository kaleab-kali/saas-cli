// Admin-scoped i18n instance. Separate state from tenant (different localStorage key).
// Use <I18nextProvider i18n={i18nAdmin}> inside /admin layout so toggling admin language
// does NOT affect tenant and vice versa.

import i18next from "i18next";
import { am } from "./locales/am";
import { en } from "./locales/en";

const ADMIN_LANG_KEY = "propflow.lang.admin";

const detectLang = (): "en" | "am" => {
	try {
		const v = typeof localStorage !== "undefined" ? localStorage.getItem(ADMIN_LANG_KEY) : null;
		if (v === "am" || v === "en") return v;
	} catch {
		/* ignore */
	}
	return "en";
};

export const i18nAdmin = i18next.createInstance();

void i18nAdmin.init({
	resources: {
		en: { translation: en },
		am: { translation: am },
	},
	lng: detectLang(),
	fallbackLng: "en",
	supportedLngs: ["en", "am"],
	interpolation: { escapeValue: false },
	react: { useSuspense: false },
});

export const setAdminLang = async (lng: "en" | "am") => {
	try {
		localStorage.setItem(ADMIN_LANG_KEY, lng);
	} catch {
		/* ignore */
	}
	await i18nAdmin.changeLanguage(lng);
	document.documentElement.lang = lng;
};

export default i18nAdmin;
