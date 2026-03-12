'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Store } from '@/types';
import { LogOut, Store as StoreIcon, ChevronRight } from 'lucide-react';

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchStores() {
      const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('active', true)
        .order('name');
      setStores(data || []);
      setLoading(false);
    }
    fetchStores();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">選擇門市</h1>
        <button
          onClick={handleLogout}
          className="p-2 text-gray-500 hover:text-gray-700"
          title="登出"
        >
          <LogOut size={24} />
        </button>
      </header>

      {/* Store List */}
      <main className="p-4 space-y-3 max-w-lg mx-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-500">載入中...</div>
        ) : stores.length === 0 ? (
          <div className="text-center py-12">
            <StoreIcon size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">尚無門市資料</p>
            <p className="text-gray-400 text-sm mt-1">請至後台管理新增門市</p>
          </div>
        ) : (
          stores.map((store) => (
            <button
              key={store.id}
              onClick={() => router.push(`/inspect/${store.id}`)}
              className="w-full bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                  <StoreIcon size={24} className="text-blue-600" />
                </div>
                <span className="text-lg font-medium text-gray-900">{store.name}</span>
              </div>
              <ChevronRight size={24} className="text-gray-400" />
            </button>
          ))
        )}
      </main>
    </div>
  );
}
