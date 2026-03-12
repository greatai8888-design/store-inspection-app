'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Store, ListChecks, ArrowLeft, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin/stores', label: '門市管理', icon: Store },
  { href: '/admin/checklist', label: '清單管理', icon: ListChecks },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/stores" className="p-1 text-gray-500 hover:text-gray-700">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">後台管理</h1>
        </div>
        <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-gray-700" title="登出">
          <LogOut size={24} />
        </button>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex-1 py-3 text-center text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                pathname === href
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4">
        {children}
      </main>
    </div>
  );
}
