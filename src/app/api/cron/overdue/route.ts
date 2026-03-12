import { createAdminClient } from '@/lib/supabase-admin';
import { sendOverdueWarning } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && cronSecret !== 'YOUR_CRON_SECRET_HERE') {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = createAdminClient();

    // Get all active stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, overdue_days, warning_emails')
      .eq('active', true);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ message: 'No stores to check', warnings: 0 });
    }

    let warningsSent = 0;

    for (const store of stores) {
      if (!store.warning_emails || store.warning_emails.length === 0) continue;

      // Get most recent inspection for this store
      const { data: lastInspection } = await supabase
        .from('inspections')
        .select('submitted_at')
        .eq('store_id', store.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      let daysSince: number;

      if (!lastInspection) {
        // Never inspected — treat as overdue
        daysSince = 999;
      } else {
        const lastDate = new Date(lastInspection.submitted_at);
        const now = new Date();
        daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (daysSince >= store.overdue_days) {
        await sendOverdueWarning(store.warning_emails, store.name, daysSince);
        warningsSent++;
        console.log(`Overdue warning sent for ${store.name} (${daysSince} days)`);
      }
    }

    return NextResponse.json({
      message: `Checked ${stores.length} stores, sent ${warningsSent} warnings`,
      warnings: warningsSent,
    });
  } catch (err: any) {
    console.error('Cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
