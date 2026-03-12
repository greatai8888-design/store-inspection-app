'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { ChecklistItem, InspectionFormItem, Store, ZoneGroup } from '@/types';
import { ArrowLeft, Camera, Check, AlertTriangle, X, ChevronDown, ChevronUp, Send } from 'lucide-react';

const ZONE_ORDER = ['店外/入口', '候位區/點餐區', '吧台作業區', '食材區', '後場/倉庫', '廁所/洗手台'];
const ZONE_EMOJI = ['①', '②', '③', '④', '⑤', '⑥'];

export default function InspectPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.storeId as string;
  const supabase = createClient();

  const [store, setStore] = useState<Store | null>(null);
  const [zones, setZones] = useState<ZoneGroup[]>([]);
  const [formData, setFormData] = useState<Map<string, InspectionFormItem>>(new Map());
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set(ZONE_ORDER));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    async function load() {
      const [storeRes, itemsRes] = await Promise.all([
        supabase.from('stores').select('*').eq('id', storeId).single(),
        supabase.from('checklist_items').select('*').eq('active', true).order('order'),
      ]);

      if (storeRes.data) setStore(storeRes.data);
      if (itemsRes.data) {
        const grouped: ZoneGroup[] = [];
        const zoneMap = new Map<string, ChecklistItem[]>();

        for (const item of itemsRes.data) {
          if (!zoneMap.has(item.zone)) zoneMap.set(item.zone, []);
          zoneMap.get(item.zone)!.push(item);
        }

        for (const zone of ZONE_ORDER) {
          if (zoneMap.has(zone)) {
            grouped.push({ zone, items: zoneMap.get(zone)! });
          }
        }
        // Any zones not in ZONE_ORDER
        for (const [zone, items] of zoneMap) {
          if (!ZONE_ORDER.includes(zone)) {
            grouped.push({ zone, items });
          }
        }

        setZones(grouped);

        const initial = new Map<string, InspectionFormItem>();
        for (const item of itemsRes.data) {
          initial.set(item.id, { itemId: item.id, status: null, photoUrl: null, notes: '' });
        }
        setFormData(initial);
      }
    }
    load();
  }, [storeId]);

  const setStatus = (itemId: string, status: InspectionFormItem['status']) => {
    setFormData((prev) => {
      const next = new Map(prev);
      const item = next.get(itemId)!;
      next.set(itemId, { ...item, status: item.status === status ? null : status });
      return next;
    });
  };

  const setNotes = (itemId: string, notes: string) => {
    setFormData((prev) => {
      const next = new Map(prev);
      const item = next.get(itemId)!;
      next.set(itemId, { ...item, notes });
      return next;
    });
  };

  const handlePhotoCapture = async (itemId: string, file: File) => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${storeId}/${Date.now()}_${itemId}.${ext}`;

    const { data, error } = await supabase.storage
      .from('inspection-photos')
      .upload(path, file, { contentType: file.type });

    if (error) {
      console.error('Upload failed:', error);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('inspection-photos')
      .getPublicUrl(data.path);

    setFormData((prev) => {
      const next = new Map(prev);
      const item = next.get(itemId)!;
      next.set(itemId, { ...item, photoUrl: urlData.publicUrl });
      return next;
    });
  };

  const toggleZone = (zone: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) next.delete(zone);
      else next.add(zone);
      return next;
    });
  };

  const getZoneProgress = (zone: ZoneGroup) => {
    let completed = 0;
    for (const item of zone.items) {
      if (formData.get(item.id)?.status) completed++;
    }
    return { completed, total: zone.items.length };
  };

  const canSubmit = () => {
    for (const [, item] of formData) {
      if (!item.status) return false;
      if (item.status === 'fail' && !item.photoUrl) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) {
      setError('請完成所有項目檢查，❌ 不通過項目需拍照');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未登入');

      const items = Array.from(formData.values()).map((item) => ({
        itemId: item.itemId,
        status: item.status,
        photoUrl: item.photoUrl,
        notes: item.notes || null,
      }));

      const res = await fetch('/api/inspections/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          inspectorEmail: user.email,
          items,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '送出失敗');
      }

      const { inspectionId } = await res.json();
      router.push(`/confirmation/${inspectionId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!store) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">載入中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/stores')} className="p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 truncate">{store.name}</h1>
      </header>

      {/* Zones */}
      <main className="max-w-lg mx-auto p-4 space-y-3">
        {zones.map((zone, zoneIdx) => {
          const { completed, total } = getZoneProgress(zone);
          const isExpanded = expandedZones.has(zone.zone);
          const allDone = completed === total;

          return (
            <div key={zone.zone} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Zone Header */}
              <button
                onClick={() => toggleZone(zone.zone)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{ZONE_EMOJI[zoneIdx] || '⬜'}</span>
                  <span className="font-semibold text-gray-900">{zone.zone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm px-2 py-0.5 rounded-full ${allDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {completed}/{total}
                  </span>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {/* Zone Items */}
              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {zone.items.map((item) => {
                    const fd = formData.get(item.id);
                    if (!fd) return null;

                    return (
                      <div key={item.id} className="p-4">
                        {/* Item Label */}
                        <div className="font-medium text-gray-800 mb-3">{item.label}</div>

                        {/* Status Buttons */}
                        <div className="flex gap-2 mb-2">
                          <button
                            onClick={() => setStatus(item.id, 'pass')}
                            className={`flex-1 py-3 rounded-lg text-base font-medium flex items-center justify-center gap-1.5 transition-colors ${
                              fd.status === 'pass'
                                ? 'bg-green-500 text-white'
                                : 'bg-green-50 text-green-600 border border-green-200'
                            }`}
                          >
                            <Check size={20} /> 通過
                          </button>
                          <button
                            onClick={() => setStatus(item.id, 'warning')}
                            className={`flex-1 py-3 rounded-lg text-base font-medium flex items-center justify-center gap-1.5 transition-colors ${
                              fd.status === 'warning'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                            }`}
                          >
                            <AlertTriangle size={20} /> 待改善
                          </button>
                          <button
                            onClick={() => setStatus(item.id, 'fail')}
                            className={`flex-1 py-3 rounded-lg text-base font-medium flex items-center justify-center gap-1.5 transition-colors ${
                              fd.status === 'fail'
                                ? 'bg-red-500 text-white'
                                : 'bg-red-50 text-red-600 border border-red-200'
                            }`}
                          >
                            <X size={20} /> 不通過
                          </button>
                        </div>

                        {/* Photo Required for Fail */}
                        {fd.status === 'fail' && (
                          <div className="mt-3">
                            {fd.photoUrl ? (
                              <div className="relative">
                                <img
                                  src={fd.photoUrl}
                                  alt="inspection"
                                  className="w-full h-48 object-cover rounded-lg"
                                />
                                <button
                                  onClick={() => {
                                    const ref = fileInputRefs.current.get(item.id);
                                    ref?.click();
                                  }}
                                  className="absolute bottom-2 right-2 bg-white/90 px-3 py-1.5 rounded-lg text-sm font-medium"
                                >
                                  重拍
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  const ref = fileInputRefs.current.get(item.id);
                                  ref?.click();
                                }}
                                className="w-full py-4 border-2 border-dashed border-red-300 rounded-lg text-red-500 flex items-center justify-center gap-2 bg-red-50"
                              >
                                <Camera size={24} /> 請拍照（必填）
                              </button>
                            )}
                            <input
                              ref={(el) => {
                                if (el) fileInputRefs.current.set(item.id, el);
                              }}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoCapture(item.id, file);
                              }}
                            />
                          </div>
                        )}

                        {/* Notes */}
                        {fd.status && (
                          <textarea
                            value={fd.notes}
                            onChange={(e) => setNotes(item.id, e.target.value)}
                            placeholder="備註（選填）"
                            rows={2}
                            className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}
      </main>

      {/* Sticky Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit()}
            className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed active:bg-blue-800 transition-colors flex items-center justify-center gap-2"
          >
            <Send size={20} />
            {submitting ? '送出中...' : '送出巡店報告'}
          </button>
        </div>
      </div>
    </div>
  );
}
