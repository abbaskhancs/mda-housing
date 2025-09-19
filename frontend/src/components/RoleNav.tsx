"use client";

import Link from "next/link";
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocalization } from "../contexts/LocalizationContext";
import { GlobalSearch } from "./GlobalSearch";
import RoleSwitcher from "./RoleSwitcher";
import LanguageToggle from "./LanguageToggle";

export default function RoleNav() {
	const { user, logout } = useAuth();
	const { t } = useLocalization();

	// Helper function to check if user has access to a console
	const hasConsoleAccess = (consoleRole: string) => {
		if (!user) return false;
		return user.role === consoleRole || user.role === 'ADMIN';
	};

	// Helper function to check if user has access to OWO features
	const hasOWOAccess = () => {
		if (!user) return false;
		return user.role === 'OWO' || user.role === 'ADMIN';
	};

	return (
		<nav className="w-full border-b bg-white">
			<div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
				<div className="flex items-center gap-4 text-sm">
					<Link href="/" className="hover:text-blue-600">{t('nav.home')}</Link>

					{/* OWO-specific links */}
					{hasOWOAccess() && (
						<Link href="/applications/new" className="hover:text-blue-600">{t('nav.newApplication')}</Link>
					)}

					{/* Console links based on role */}
					{hasConsoleAccess('BCA') && (
						<Link href="/console/bca" className="hover:text-blue-600">{t('nav.bcaConsole')}</Link>
					)}
					{hasConsoleAccess('HOUSING') && (
						<Link href="/console/housing" className="hover:text-blue-600">{t('nav.housingConsole')}</Link>
					)}
					{hasConsoleAccess('ACCOUNTS') && (
						<Link href="/console/accounts" className="hover:text-blue-600">{t('nav.accountsConsole')}</Link>
					)}
					{hasConsoleAccess('APPROVER') && (
						<Link href="/console/approval" className="hover:text-blue-600">{t('nav.approvalConsole')}</Link>
					)}

					{/* Admin-only links */}
					{user?.role === "ADMIN" && (
						<>
							<Link href="/admin" className="hover:text-blue-600">{t('nav.adminPanel')}</Link>
							<Link href="/admin/users" className="hover:text-blue-600">{t('nav.userManagement')}</Link>
						</>
					)}
				</div>

				{/* Global Search - only show when user is logged in */}
				{user && (
					<div className="flex-1 max-w-md mx-8">
						<GlobalSearch />
					</div>
				)}

				<div className="flex items-center gap-3 text-sm">
					{user ? (
						<>
							<LanguageToggle />
							<RoleSwitcher />
							<span className="opacity-75">{user.username}</span>
							<button onClick={logout} className="border px-2 py-1 rounded hover:bg-gray-50">{t('nav.logout')}</button>
						</>
					) : (
						<>
							<LanguageToggle />
							<Link href="/login" className="border px-2 py-1 rounded hover:bg-gray-50">{t('nav.login')}</Link>
						</>
					)}
				</div>
			</div>
		</nav>
	);
}


