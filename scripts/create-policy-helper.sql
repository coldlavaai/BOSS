-- First create a helper function that can modify storage policies
CREATE OR REPLACE FUNCTION create_storage_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enable RLS
  EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';

  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can upload files to their own folder" ON storage.objects;
  DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

  -- Create INSERT policy
  EXECUTE '
    CREATE POLICY "Users can upload files to their own folder"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = ''customer-files'' AND (storage.foldername(name))[1] = auth.uid()::text)
  ';

  -- Create SELECT policy
  EXECUTE '
    CREATE POLICY "Users can read their own files"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = ''customer-files'' AND (storage.foldername(name))[1] = auth.uid()::text)
  ';

  -- Create UPDATE policy
  EXECUTE '
    CREATE POLICY "Users can update their own files"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = ''customer-files'' AND (storage.foldername(name))[1] = auth.uid()::text)
  ';

  -- Create DELETE policy
  EXECUTE '
    CREATE POLICY "Users can delete their own files"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = ''customer-files'' AND (storage.foldername(name))[1] = auth.uid()::text)
  ';

  RAISE NOTICE 'Storage policies created successfully';
END;
$$;

-- Execute the function
SELECT create_storage_policies();

-- Drop the helper function (clean up)
DROP FUNCTION create_storage_policies();
