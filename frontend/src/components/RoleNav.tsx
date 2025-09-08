"use client";

import Link from "next/link";
import React from "react";
import { useAuth } from "../contexts/AuthContext";

export default function RoleNav() {
	const { user, logout } = useAuth();

	return (
		<nav className="w-full border-b">
			<div className="mx-auto max-w-6xl px-4 h-12 flex items-center justify-between">
				<div className="flex items-center gap-4 text-sm">
					<Link href="/">Home</Link>
					{user?.role === "BCA" ? <Link href="/console/bca">BCA Console</Link> : null}
					{user?.role === "HOUSING" ? <Link href="/console/housing">Housing Console</Link> : null}
					{user?.role === "ACCOUNTS" ? <Link href="/console/accounts">Accounts Console</Link> : null}
					{user?.role === "APPROVER" ? <Link href="/console/approval">Approval</Link> : null}
					{user?.role === "ADMIN" ? <Link href="/admin">Admin</Link> : null}
				</div>
				<div className="flex items-center gap-3 text-sm">
					{user ? (
						<>
							<span className="opacity-75">{user.username} ({user.role})</span>
							<button onClick={logout} className="border px-2 py-1 rounded">Logout</button>
						</>
					) : (
						<Link href="/login" className="border px-2 py-1 rounded">Login</Link>
					)}
				</div>
			</div>
		</nav>
	);
}


