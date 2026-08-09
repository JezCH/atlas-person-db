BEGIN;

DO $$
BEGIN
  IF to_regclass('public.person_politics') IS NULL THEN
    RAISE EXCEPTION 'public.person_politics does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'person_politics'
      AND policyname = 'public read person politics'
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'expected public read policy is missing; refusing write-policy lockdown';
  END IF;
END
$$;

DROP POLICY IF EXISTS "public insert person politics" ON public.person_politics;
DROP POLICY IF EXISTS "public update person politics" ON public.person_politics;
DROP POLICY IF EXISTS "public delete person politics" ON public.person_politics;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.person_politics FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON TABLE public.person_politics FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON TABLE public.person_politics FROM authenticated';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'person_politics'
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'unexpected write-capable RLS policy remains on public.person_politics';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'person_politics'
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'read policy disappeared during write-policy lockdown';
  END IF;
END
$$;

COMMIT;
