"use client";

import Link from "next/link";
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { GlobalSearch } from "./GlobalSearch";

export default function RoleNav() {
	const { user, logout } = useAuth();

	return (
		<nav className="w-full border-b bg-white">
			<div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
				<div className="flex items-center gap-4 text-sm">
					<Link href="/" className="hover:text-blue-600">Home</Link>
					{user?.role === "BCA" ? <Link href="/console/bca" className="hover:text-blue-600">BCA Console</Link> : null}
					{user?.role === "HOUSING" ? <Link href="/console/housing" className="hover:text-blue-600">Housing Console</Link> : null}
					{user?.role === "ACCOUNTS" ? <Link href="/console/accounts" className="hover:text-blue-600">Accounts Console</Link> : null}
					{user?.role === "APPROVER" ? <Link href="/console/approval" className="hover:text-blue-600">Approval</Link> : null}
					{user?.role === "ADMIN" ? <Link href="/admin" className="hover:text-blue-600">Admin</Link> : null}
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
							<span className="opacity-75">{user.username} ({user.role})</span>
							<button onClick={logout} className="border px-2 py-1 rounded hover:bg-gray-50">Logout</button>
						</>
					) : (
						<Link href="/login" className="border px-2 py-1 rounded hover:bg-gray-50">Login</Link>
					)}
				</div>
			</div>
		</nav>
	);
}


