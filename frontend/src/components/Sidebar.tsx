"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { 
  HomeIcon, 
  DocumentPlusIcon, 
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  CogIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, roles: ['ADMIN', 'BCA', 'HOUSING', 'ACCOUNTS', 'APPROVER', 'OWO'] },
  { name: 'New Application', href: '/applications/new', icon: DocumentPlusIcon, roles: ['ADMIN', 'OWO'] },
  { name: 'Applications', href: '/applications', icon: ClipboardDocumentListIcon, roles: ['ADMIN', 'BCA', 'HOUSING', 'ACCOUNTS', 'APPROVER', 'OWO'] },
  { name: 'BCA Console', href: '/console/bca', icon: BuildingOfficeIcon, roles: ['ADMIN', 'BCA'] },
  { name: 'Housing Console', href: '/console/housing', icon: BuildingOfficeIcon, roles: ['ADMIN', 'HOUSING'] },
  { name: 'Accounts Console', href: '/console/accounts', icon: CurrencyDollarIcon, roles: ['ADMIN', 'ACCOUNTS'] },
  { name: 'Approval Console', href: '/console/approval', icon: CheckCircleIcon, roles: ['ADMIN', 'APPROVER'] },
  { name: 'Admin Panel', href: '/admin', icon: CogIcon, roles: ['ADMIN'] },
  { name: 'User Management', href: '/admin/users', icon: UserGroupIcon, roles: ['ADMIN'] },
];

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 bg-gray-50 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-gray-900">MDA Housing</h1>
        </div>
        <div className="mt-5 flex-grow flex flex-col">
          <nav className="flex-1 px-2 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                >
                  <item.icon
                    className={`${
                      isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                    } mr-3 flex-shrink-0 h-6 w-6`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user.username}</p>
              <p className="text-xs font-medium text-gray-500">{user.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
