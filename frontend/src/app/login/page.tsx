"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";

export default function LoginPage() {
	const { login, isAuthenticated } = useAuth();
	const router = useRouter();
	const [username, setUsername] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(false);

	React.useEffect(() => {
		if (isAuthenticated) {
			router.replace("/");
		}
	}, [isAuthenticated, router]);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		const res = await login({ username, password });
		setLoading(false);
		if (!res.success) {
			setError(res.error);
			return;
		}
		router.replace("/");
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-6">
			<form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
				<h1 className="text-2xl font-semibold">Sign in</h1>
				{error ? <p className="text-red-600 text-sm">{error}</p> : null}
				<div className="space-y-2">
					<label className="block text-sm">Username or Email</label>
					<input
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						className="w-full border rounded px-3 py-2 text-sm"
						required
					/>
				</div>
				<div className="space-y-2">
					<label className="block text-sm">Password</label>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="w-full border rounded px-3 py-2 text-sm"
						required
					/>
				</div>
				<button
					type="submit"
					disabled={loading}
					className="w-full bg-black text-white rounded py-2 text-sm disabled:opacity-50"
				>
					{loading ? "Signing in..." : "Sign in"}
				</button>
			</form>
		</div>
	);
}


