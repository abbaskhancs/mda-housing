"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
	const { isAuthenticated } = useAuth();
	const router = useRouter();

	React.useEffect(() => {
		if (!isAuthenticated) {
			router.replace("/login");
		}
	}, [isAuthenticated, router]);

	if (!isAuthenticated) return null;

	return <>{children}</>;
}


