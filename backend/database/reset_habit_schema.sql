DO
$$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE;', r.table_schema, r.table_name);
    END LOOP;
END
$$;
