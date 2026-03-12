import { createClient } from '@/lib/supabase-server';
import { sendInspectionReport } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const body = await request.json();
    const { storeId, inspectorEmail, items } = body;

    if (!storeId || !inspectorEmail || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: '資料格式錯誤' }, { status: 400 });
    }

    // Validate all items have status, fail items have photos
    for (const item of items) {
      if (!item.status) {
        return NextResponse.json({ error: '所有項目都必須選擇狀態' }, { status: 400 });
      }
      if (item.status === 'fail' && !item.photoUrl) {
        return NextResponse.json({ error: '不通過項目必須拍照' }, { status: 400 });
      }
    }

    // Insert inspection
    const { data: inspection, error: inspError } = await supabase
      .from('inspections')
      .insert({
        store_id: storeId,
        inspector_email: inspectorEmail,
      })
      .select()
      .single();

    if (inspError) {
      console.error('Insert inspection failed:', inspError);
      return NextResponse.json({ error: '建立巡店記錄失敗' }, { status: 500 });
    }

    // Insert inspection items
    const inspectionItems = items.map((item: any) => ({
      inspection_id: inspection.id,
      item_id: item.itemId,
      status: item.status,
      photo_url: item.photoUrl || null,
      notes: item.notes || null,
    }));

    const { error: itemsError } = await supabase
      .from('inspection_items')
      .insert(inspectionItems);

    if (itemsError) {
      console.error('Insert inspection items failed:', itemsError);
      return NextResponse.json({ error: '儲存檢查項目失敗' }, { status: 500 });
    }

    // Generate PDF URL (will be generated on demand)
    const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : ''}/api/pdf/${inspection.id}`;

    // Update inspection with PDF URL
    await supabase
      .from('inspections')
      .update({ pdf_url: pdfUrl })
      .eq('id', inspection.id);

    // Send email report
    const { data: store } = await supabase
      .from('stores')
      .select('name, report_emails')
      .eq('id', storeId)
      .single();

    // Send email to inspector + store report_emails
    const recipients = [inspectorEmail];
    if (store?.report_emails && store.report_emails.length > 0) {
      recipients.push(...(store.report_emails as string[]).filter((e: string) => e !== inspectorEmail));
    }
    const fullPdfUrl = `${request.headers.get('origin') || ''}/api/pdf/${inspection.id}`;
    await sendInspectionReport(recipients, store?.name || '', fullPdfUrl, inspectorEmail);

    return NextResponse.json({ inspectionId: inspection.id });
  } catch (err: any) {
    console.error('Submit error:', err);
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 });
  }
}
