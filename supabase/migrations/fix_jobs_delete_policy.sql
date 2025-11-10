-- Simplify RLS policies - once authenticated, user can do anything

-- Drop all existing job policies
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can create their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;

-- Create simple authenticated-only policies
CREATE POLICY "Authenticated users can view jobs"
ON jobs
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert jobs"
ON jobs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update jobs"
ON jobs
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete jobs"
ON jobs
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Do the same for customers table
DROP POLICY IF EXISTS "Users can view their own customers" ON customers;
DROP POLICY IF EXISTS "Users can create their own customers" ON customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;

CREATE POLICY "Authenticated users can view customers"
ON customers
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert customers"
ON customers
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update customers"
ON customers
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete customers"
ON customers
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- And for cars table
DROP POLICY IF EXISTS "Users can view their own cars" ON cars;
DROP POLICY IF EXISTS "Users can create their own cars" ON cars;
DROP POLICY IF EXISTS "Users can update their own cars" ON cars;
DROP POLICY IF EXISTS "Users can delete their own cars" ON cars;

CREATE POLICY "Authenticated users can view cars"
ON cars
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert cars"
ON cars
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cars"
ON cars
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete cars"
ON cars
FOR DELETE
USING (auth.uid() IS NOT NULL);
