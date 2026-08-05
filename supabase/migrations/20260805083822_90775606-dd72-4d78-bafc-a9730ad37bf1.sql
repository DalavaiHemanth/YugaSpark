CREATE POLICY "own_files_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('photos','resumes') AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "own_files_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('photos','resumes') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own_files_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('photos','resumes') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own_files_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('photos','resumes') AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));