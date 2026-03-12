'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { ChecklistItem } from '@/types';
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';

const ZONES = ['店外/入口', '候位區/點餐區', '吧台作業區', '食材區', '後場/倉庫', '廁所/洗手台'];

interface ItemForm {
  zone: string;
  order: number;
  label: string;
}

const emptyForm: ItemForm = { zone: ZONES[0], order: 1, label: '' };

export default function AdminChecklistPage() {
  const supabase = createClient();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .order('order');
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => {
    setEditId(null);
    const maxOrder = items.reduce((max, item) => Math.max(max, item.order), 0);
    setForm({ ...emptyForm, order: maxOrder + 1 });
    setShowModal(true);
  };

  const openEdit = (item: ChecklistItem) => {
    setEditId(item.id);
    setForm({ zone: item.zone, order: item.order, label: item.label });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      zone: form.zone,
      order: form.order,
      label: form.label.trim(),
    };

    if (editId) {
      await supabase.from('checklist_items').update(payload).eq('id', editId);
    } else {
      await supabase.from('checklist_items').insert(payload);
    }

    setShowModal(false);
    setSaving(false);
    fetchItems();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('checklist_items').update({ active: !active }).eq('id', id);
    fetchItems();
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`確定刪除「${label}」？`)) return;
    await supabase.from('checklist_items').delete().eq('id', id);
    fetchItems();
  };

  // Group by zone
  const grouped = new Map<string, ChecklistItem[]>();
  for (const item of items) {
    if (!grouped.has(item.zone)) grouped.set(item.zone, []);
    grouped.get(item.zone)!.push(item);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">檢查項目</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={18} /> 新增項目
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">載入中...</p>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([zone, zoneItems]) => (
            <div key={zone} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">{zone}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {zoneItems.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-6">{item.order}</span>
                      <span className={`text-sm ${item.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggle(item.id, item.active)}
                        className={`p-1.5 ${item.active ? 'text-green-500' : 'text-gray-300'}`}
                        title={item.active ? '停用' : '啟用'}
                      >
                        {item.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.label)}
                        className="p-1.5 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
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
              <h3 className="text-lg font-semibold">{editId ? '編輯項目' : '新增項目'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">區域</label>
                <select
                  value={form.zone}
                  onChange={(e) => setForm({ ...form, zone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {ZONES.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  min={1}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">項目名稱</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例：冰機/出冰口"
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
                disabled={saving || !form.label.trim()}
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
