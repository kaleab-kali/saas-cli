import React from "react";
import { useTranslation } from "react-i18next";
import { setAdminLang } from "#shared/i18n/config-admin";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LABELS = { en: "English", am: "አማርኛ" } as const;

export const AdminLanguageSwitcher = React.memo(
	() => {
		const { i18n } = useTranslation();
		const current = (i18n.language === "am" ? "am" : "en") as "en" | "am";
		const change = React.useCallback(async (lng: "en" | "am") => {
			await setAdminLang(lng);
		}, []);
		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="sm">
						{LABELS[current]}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{(["en", "am"] as const).map((lng) => (
						<DropdownMenuItem key={lng} onClick={() => change(lng)}>
							{LABELS[lng]}
							{current === lng && <span className="ml-2 text-primary">✓</span>}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		);
	},
	() => true,
);
AdminLanguageSwitcher.displayName = "AdminLanguageSwitcher";
