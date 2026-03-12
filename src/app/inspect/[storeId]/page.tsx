'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { ChecklistItem, InspectionFormItem, Store, ZoneGroup } from '@/types';
import { ArrowLeft, Camera, Check, AlertTriangle, X, Send } from 'lucide-react';

const ZONE_ORDER = ['店外/入口', '候位區/點餐區', '吧台作業區', '食材區', '後場/倉庫', '廁所/洗手台'];

export default function InspectPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.storeId as string;
  const supabase = createClient();

  const [store, setStore] = useState<Store | null>(null);
  const [zones, setZones] = useState<ZoneGroup[]>([]);
  const [formData, setFormData] = useState<Map<string, InspectionFormItem>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step-by-step state: flatten all items across zones
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [waitingForPhoto, setWaitingForPhoto] = useState(false);

  // Build flat list of items with zone info
  const flatItems = zones.flatMap((zone, zoneIdx) =>
    zone.items.map((item) => ({ item, zone: zone.zone, zoneIdx }))
  );
  const totalItems = flatItems.length;
  const currentEntry = flatItems[currentIndex];

  // Compute current zone index (1-based) and total zones
  const totalZones = zones.length;
  const currentZoneIdx = currentEntry ? currentEntry.zoneIdx + 1 : 1;

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

  const handlePhotoCapture = async (itemId: string, file: File) => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${storeId}/${Date.now()}_${itemId}.${ext}`;

    setFormData((prev) => {
      const next = new Map(prev);
      const item = next.get(itemId)!;
      next.set(itemId, { ...item, photoUrl: 'uploading' });
      return next;
    });

    const { data, error } = await supabase.storage
      .from('inspection-photos')
      .upload(path, file, { contentType: file.type });

    if (error) {
      console.error('Upload failed:', error);
      setError(`照片上傳失敗: ${error.message}`);
      setFormData((prev) => {
        const next = new Map(prev);
        const item = next.get(itemId)!;
        next.set(itemId, { ...item, photoUrl: null });
        return next;
      });
      setWaitingForPhoto(false);
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

    // Photo done, advance to next
    setWaitingForPhoto(false);
    goNext();
  };

  const goNext = () => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setShowComplete(true);
    }
  };

  const handleStatusSelect = (itemId: string, status: InspectionFormItem['status']) => {
    setFormData((prev) => {
      const next = new Map(prev);
      const item = next.get(itemId)!;
      next.set(itemId, { ...item, status });
      return next;
    });

    if (status === 'fail') {
      // Need photo before advancing
      setWaitingForPhoto(true);
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    } else {
      // pass or warning — advance immediately
      goNext();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const inspectorEmail = localStorage.getItem('inspectorEmail') || '';
      if (!inspectorEmail) {
        router.push('/login');
        return;
      }

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
          inspectorEmail,
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

  if (!store || totalItems === 0) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">載入中...</div>;
  }

  // All done — show submit screen
  if (showComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => { setShowComplete(false); setCurrentIndex(totalItems - 1); }} className="p-1">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">{store.name}</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">檢查完成！</h2>
          <p className="text-gray-500 mb-8">共 {totalItems} 題已全部作答</p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4 w-full max-w-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full max-w-sm py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed active:bg-blue-800 transition-colors flex items-center justify-center gap-2"
          >
            <Send size={20} />
            {submitting ? '送出中...' : '送出巡店報告'}
          </button>
        </div>
      </div>
    );
  }

  const fd = formData.get(currentEntry.item.id);
  if (!fd) return null;

  const progressPercent = ((currentIndex + 1) / totalItems) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => {
            if (currentIndex > 0) {
              setCurrentIndex((i) => i - 1);
            } else {
              router.push('/stores');
            }
          }}
          className="p-1"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 truncate">{store.name}</h1>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-gray-100 px-4 py-2">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center text-sm text-gray-500 mb-1.5">
            <span className="font-medium text-gray-700">{currentEntry.zone}</span>
            <span>第 {currentZoneIdx} 類 / {totalZones} 類 · 第 {currentIndex + 1} 題 / {totalItems} 題</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <p className="text-2xl font-bold text-gray-900 leading-relaxed">
              {currentEntry.item.label}
            </p>
          </div>

          {/* Status Buttons — large */}
          <div className="space-y-3">
            <button
              onClick={() => handleStatusSelect(currentEntry.item.id, 'pass')}
              disabled={waitingForPhoto}
              className="w-full py-5 rounded-2xl text-xl font-semibold flex items-center justify-center gap-3 transition-colors bg-green-50 text-green-600 border-2 border-green-200 hover:bg-green-100 active:bg-green-500 active:text-white disabled:opacity-40"
            >
              <Check size={28} /> 通過
            </button>
            <button
              onClick={() => handleStatusSelect(currentEntry.item.id, 'warning')}
              disabled={waitingForPhoto}
              className="w-full py-5 rounded-2xl text-xl font-semibold flex items-center justify-center gap-3 transition-colors bg-yellow-50 text-yellow-600 border-2 border-yellow-200 hover:bg-yellow-100 active:bg-yellow-500 active:text-white disabled:opacity-40"
            >
              <AlertTriangle size={28} /> 待改善
            </button>
            <button
              onClick={() => handleStatusSelect(currentEntry.item.id, 'fail')}
              disabled={waitingForPhoto}
              className="w-full py-5 rounded-2xl text-xl font-semibold flex items-center justify-center gap-3 transition-colors bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100 active:bg-red-500 active:text-white disabled:opacity-40"
            >
              <X size={28} /> 不通過
            </button>
          </div>

          {/* Waiting for photo indicator */}
          {waitingForPhoto && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600">
                <Camera size={20} />
                <span className="font-medium">
                  {fd.photoUrl === 'uploading' ? '照片上傳中...' : '請拍照後繼續'}
                </span>
              </div>
              {fd.photoUrl && fd.photoUrl !== 'uploading' && (
                <div className="mt-3">
                  <img src={fd.photoUrl} alt="已拍照" className="w-32 h-32 object-cover rounded-lg mx-auto" />
                </div>
              )}
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handlePhotoCapture(currentEntry.item.id, file);
              } else {
                // User cancelled — keep waiting
              }
              // Reset so same file can be re-selected
              e.target.value = '';
            }}
          />

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
