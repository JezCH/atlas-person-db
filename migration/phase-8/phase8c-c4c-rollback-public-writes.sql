BEGIN;

DROP POLICY IF EXISTS "public insert person politics" ON public.person_politics;
DROP POLICY IF EXISTS "public update person politics" ON public.person_politics;
DROP POLICY IF EXISTS "public delete person politics" ON public.person_politics;

CREATE POLICY "public insert person politics"
  ON public.person_politics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public update person politics"
  ON public.person_politics FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "public delete person politics"
  ON public.person_politics FOR DELETE
  USING (true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'GRANT INSERT, UPDATE, DELETE ON TABLE public.person_politics TO anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT INSERT, UPDATE, DELETE ON TABLE public.person_politics TO authenticated';
  END IF;
END
$$;

COMMIT;
