-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload files to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Policy 1: Users can upload files to folders starting with their user ID
CREATE POLICY "Users can upload files to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'customer-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can read files in folders starting with their user ID
CREATE POLICY "Users can read their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'customer-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can update files in folders starting with their user ID
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'customer-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Users can delete files in folders starting with their user ID
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'customer-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
