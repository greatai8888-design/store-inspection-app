'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { CheckCircle, Download, ArrowRight } from 'lucide-react';

interface InspectionSummary {
  storeName: string;
  submittedAt: string;
  inspectorEmail: string;
  pass: number;
  warning: number;
  fail: number;
  total: number;
}

export default function ConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const inspectionId = params.inspectionId as string;
  const [summary, setSummary] = useState<InspectionSummary | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: inspection } = await supabase
        .from('inspections')
        .select('*, stores(name)')
        .eq('id', inspectionId)
        .single();

      if (!inspection) return;

      const { data: items } = await supabase
        .from('inspection_items')
        .select('status')
        .eq('inspection_id', inspectionId);

      let pass = 0, warning = 0, fail = 0;
      for (const item of items || []) {
        if (item.status === 'pass') pass++;
        else if (item.status === 'warning') warning++;
        else if (item.status === 'fail') fail++;
      }

      setSummary({
        storeName: (inspection.stores as any)?.name || '',
        submittedAt: inspection.submitted_at,
        inspectorEmail: inspection.inspector_email,
        pass,
        warning,
        fail,
        total: (items || []).length,
      });
    }
    load();
  }, [inspectionId]);

  if (!summary) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">載入中...</div>;
  }

  const date = new Date(summary.submittedAt).toLocaleString('zh-TW');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Success Icon */}
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={48} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">巡店完成！</h1>
          <p className="text-gray-500 mt-1">{summary.storeName}</p>
          <p className="text-gray-400 text-sm">{date}</p>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{summary.pass}</div>
              <div className="text-xs text-gray-500">通過</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{summary.warning}</div>
              <div className="text-xs text-gray-500">待改善</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{summary.fail}</div>
              <div className="text-xs text-gray-500">不通過</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <a
            href={`/api/pdf/${inspectionId}`}
            target="_blank"
            className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={20} /> 下載 PDF 報告
          </a>

          <button
            onClick={() => router.push('/stores')}
            className="w-full py-4 bg-white text-gray-700 text-lg font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowRight size={20} /> 繼續巡店
          </button>
        </div>
      </div>
    </div>
  );
}
