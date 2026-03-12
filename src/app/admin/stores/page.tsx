'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Store } from '@/types';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

interface StoreForm {
  name: string;
  report_emails: string;
  warning_emails: string;
  overdue_days: number;
}

const emptyForm: StoreForm = { name: '', report_emails: '', warning_emails: '', overdue_days: 7 };

export default function AdminStoresPage() {
  const supabase = createClient();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('*').order('name');
    setStores(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchStores(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (store: Store) => {
    setEditId(store.id);
    setForm({
      name: store.name,
      report_emails: store.report_emails.join(', '),
      warning_emails: store.warning_emails.join(', '),
      overdue_days: store.overdue_days,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      report_emails: form.report_emails.split(',').map((e) => e.trim()).filter(Boolean),
      warning_emails: form.warning_emails.split(',').map((e) => e.trim()).filter(Boolean),
      overdue_days: form.overdue_days,
    };

    if (editId) {
      await supabase.from('stores').update(payload).eq('id', editId);
    } else {
      await supabase.from('stores').insert(payload);
    }

    setShowModal(false);
    setSaving(false);
    fetchStores();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定刪除「${name}」？`)) return;
    await supabase.from('stores').update({ active: false }).eq('id', id);
    fetchStores();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">門市列表</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={18} /> 新增門市
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">載入中...</p>
      ) : stores.length === 0 ? (
        <p className="text-gray-500 text-center py-8">尚無門市，請新增</p>
      ) : (
        <div className="space-y-3">
          {stores.map((store) => (
            <div key={store.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{store.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    報告寄送：{store.report_emails.length > 0 ? store.report_emails.join(', ') : '未設定'}
                  </p>
                  <p className="text-sm text-gray-500">
                    警告寄送：{store.warning_emails.length > 0 ? store.warning_emails.join(', ') : '未設定'}
                  </p>
                  <p className="text-sm text-gray-500">
                    逾期天數：{store.overdue_days} 天
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(store)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(store.id, store.name)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editId ? '編輯門市' : '新增門市'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">門市名稱</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例：中壢店"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">報告寄送 Email（逗號分隔）</label>
                <input
                  type="text"
                  value={form.report_emails}
                  onChange={(e) => setForm({ ...form, report_emails: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="a@email.com, b@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">逾期警告 Email（逗號分隔）</label>
                <input
                  type="text"
                  value={form.warning_emails}
                  onChange={(e) => setForm({ ...form, warning_emails: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="manager@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">逾期天數</label>
                <input
                  type="number"
                  value={form.overdue_days}
                  onChange={(e) => setForm({ ...form, overdue_days: parseInt(e.target.value) || 7 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  min={1}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
