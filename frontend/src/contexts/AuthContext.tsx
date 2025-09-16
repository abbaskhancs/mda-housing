"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type User = {
	id: string;
	username: string;
	email: string;
	role: string;
};

type AuthContextValue = {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	login: (params: { username: string; password: string }) => Promise<{ success: true } | { success: false; error: string }>;
	logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [token, setToken] = useState<string | null>(null);

	useEffect(() => {
		const storedToken = typeof window !== "undefined" ? window.localStorage.getItem("auth_token") : null;
		const storedUser = typeof window !== "undefined" ? window.localStorage.getItem("auth_user") : null;
		if (storedToken) {
			setToken(storedToken);
		}
		if (storedUser) {
			try {
				setUser(JSON.parse(storedUser));
			} catch {
				setUser(null);
			}
		}
	}, []);

	const login = useCallback(async ({ username, password }: { username: string; password: string }) => {
		try {
			const res = await fetch("http://localhost:3001/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				return { success: false as const, error: data?.error || "Invalid credentials" };
			}
			const data = await res.json();
			const nextToken: string = data.token;
			const nextUser: User = data.user;
			setToken(nextToken);
			setUser(nextUser);
			if (typeof window !== "undefined") {
				window.localStorage.setItem("auth_token", nextToken);
				window.localStorage.setItem("auth_user", JSON.stringify(nextUser));
			}
			return { success: true as const };
		} catch (e) {
			return { success: false as const, error: "Network error" };
		}
	}, []);

	const logout = useCallback(() => {
		setToken(null);
		setUser(null);
		if (typeof window !== "undefined") {
			window.localStorage.removeItem("auth_token");
			window.localStorage.removeItem("auth_user");
		}
	}, []);

	const value = useMemo<AuthContextValue>(() => ({
		user,
		token,
		isAuthenticated: Boolean(token && user),
		login,
		logout
	}), [user, token, login, logout]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}


