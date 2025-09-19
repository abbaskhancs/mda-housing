"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

// Define user roles
export const ROLES = {
  OWO: 'OWO',
  BCA: 'BCA',
  HOUSING: 'HOUSING',
  ACCOUNTS: 'ACCOUNTS',
  WATER: 'WATER',
  APPROVER: 'APPROVER',
  ADMIN: 'ADMIN'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [ROLES.ADMIN]: 7,
  [ROLES.APPROVER]: 6,
  [ROLES.ACCOUNTS]: 5,
  [ROLES.HOUSING]: 4,
  [ROLES.BCA]: 3,
  [ROLES.OWO]: 2,
  [ROLES.WATER]: 1
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (userRole: string, allowedRoles: string[]): boolean => {
  return allowedRoles.some(role => userRole === role);
};

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
	const { isAuthenticated, user } = useAuth();
	const router = useRouter();

	React.useEffect(() => {
		if (!isAuthenticated) {
			router.replace("/login");
		}
	}, [isAuthenticated, router]);

	if (!isAuthenticated) return null;

	// If allowedRoles is specified, check role-based access
	if (allowedRoles && user) {
		if (!hasAnyRole(user.role, allowedRoles)) {
			return (
				<div className="min-h-screen flex items-center justify-center bg-gray-50">
					<div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
						<div className="text-center">
							<div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
								<svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
								</svg>
							</div>
							<h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
							<p className="mt-1 text-sm text-gray-500">
								You don't have permission to access this page.
							</p>
							<p className="mt-2 text-xs text-gray-400">
								Your role: <span className="font-medium">{user.role}</span>
							</p>
							<p className="text-xs text-gray-400">
								Required roles: <span className="font-medium">{allowedRoles.join(', ')}</span>
							</p>
							<div className="mt-6">
								<button
									onClick={() => router.push('/')}
									className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
								>
									Go to Dashboard
								</button>
							</div>
						</div>
					</div>
				</div>
			);
		}
	}

	return <>{children}</>;
}


