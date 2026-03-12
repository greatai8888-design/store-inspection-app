import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import ReactPDF from '@react-pdf/renderer';
import { InspectionPDF } from '@/components/pdf/InspectionPDF';

export async function GET(
  request: Request,
  { params }: { params: { inspectionId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 });
    }

    const inspectionId = params.inspectionId;

    // Fetch inspection with store info
    const { data: inspection } = await supabase
      .from('inspections')
      .select('*, stores(name)')
      .eq('id', inspectionId)
      .single();

    if (!inspection) {
      return NextResponse.json({ error: '找不到巡店記錄' }, { status: 404 });
    }

    // Fetch inspection items with checklist info
    const { data: items } = await supabase
      .from('inspection_items')
      .select('*, checklist_items(zone, label, "order")')
      .eq('inspection_id', inspectionId)
      .order('item_id');

    // Group items by zone
    const zoneMap = new Map<string, any[]>();
    for (const item of items || []) {
      const zone = item.checklist_items?.zone || '其他';
      if (!zoneMap.has(zone)) zoneMap.set(zone, []);
      zoneMap.get(zone)!.push(item);
    }

    // Sort zones
    const ZONE_ORDER = ['店外/入口', '候位區/點餐區', '吧台作業區', '食材區', '後場/倉庫', '廁所/洗手台'];
    const sortedZones: { zone: string; items: any[] }[] = [];
    for (const zone of ZONE_ORDER) {
      if (zoneMap.has(zone)) {
        sortedZones.push({ zone, items: zoneMap.get(zone)! });
        zoneMap.delete(zone);
      }
    }
    for (const [zone, items] of zoneMap) {
      sortedZones.push({ zone, items });
    }

    // Count stats
    let passCount = 0, warningCount = 0, failCount = 0;
    for (const item of items || []) {
      if (item.status === 'pass') passCount++;
      else if (item.status === 'warning') warningCount++;
      else if (item.status === 'fail') failCount++;
    }

    const storeName = (inspection.stores as any)?.name || '未知門市';
    const pdfData = {
      storeName,
      inspectorEmail: inspection.inspector_email,
      submittedAt: inspection.submitted_at,
      zones: sortedZones,
      stats: { pass: passCount, warning: warningCount, fail: failCount, total: (items || []).length },
    };

    // Generate PDF
    const pdfStream = await ReactPDF.renderToStream(
      InspectionPDF(pdfData) as any
    );

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of pdfStream as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="inspection-${inspectionId.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('PDF generation error:', err);
    return NextResponse.json({ error: 'PDF 生成失敗: ' + err.message }, { status: 500 });
  }
}
