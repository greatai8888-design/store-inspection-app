-- Run these via Supabase Dashboard > Storage, or use the API:
-- 1. Create bucket: inspection-photos (public: false)
-- 2. Create bucket: inspection-pdfs (public: true, for PDF download links)

-- Storage policies (run in SQL editor):
-- Allow authenticated users to upload photos
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-photos', 'inspection-photos', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-pdfs', 'inspection-pdfs', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inspection-photos');

CREATE POLICY "Authenticated users can read photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inspection-photos');

CREATE POLICY "Anyone can read PDFs"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'inspection-pdfs');

CREATE POLICY "Authenticated users can upload PDFs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inspection-pdfs');
