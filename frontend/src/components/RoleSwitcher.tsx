"use client";

import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

// Available roles for switching
const AVAILABLE_ROLES = [
  { value: 'OWO', label: 'OWO', description: 'One Window Operator' },
  { value: 'BCA', label: 'BCA', description: 'Building Control Authority' },
  { value: 'HOUSING', label: 'Housing', description: 'Housing Department' },
  { value: 'ACCOUNTS', label: 'Accounts', description: 'Accounts Department' },
  { value: 'WATER', label: 'Water', description: 'Water Department' },
  { value: 'APPROVER', label: 'Approver', description: 'Final Approver' },
  { value: 'ADMIN', label: 'Admin', description: 'System Administrator' }
];

export default function RoleSwitcher() {
  const { user, switchRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const currentRole = AVAILABLE_ROLES.find(role => role.value === user.role);

  const handleRoleSwitch = (roleValue: string) => {
    switchRole(roleValue);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getRoleColor(user.role)}`} />
          <span>{currentRole?.label || user.role}</span>
        </div>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Switch Role (Simulation)
              </p>
            </div>
            <div className="py-1">
              {AVAILABLE_ROLES.map((role) => (
                <button
                  key={role.value}
                  onClick={() => handleRoleSwitch(role.value)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-3 ${
                    user.role === role.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${getRoleColor(role.value)}`} />
                  <div className="flex-1">
                    <div className="font-medium">{role.label}</div>
                    <div className="text-xs text-gray-500">{role.description}</div>
                  </div>
                  {user.role === role.value && (
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </button>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Role switching is for testing purposes only. Changes are temporary and reset on logout.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    'OWO': 'bg-purple-500',
    'BCA': 'bg-blue-500',
    'HOUSING': 'bg-green-500',
    'ACCOUNTS': 'bg-yellow-500',
    'WATER': 'bg-cyan-500',
    'APPROVER': 'bg-red-500',
    'ADMIN': 'bg-gray-800'
  };
  return colors[role] || 'bg-gray-400';
}
