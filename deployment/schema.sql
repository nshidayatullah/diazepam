-- 1. Create members table
CREATE TABLE public.members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    nrp TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create attendance_logs table
CREATE TABLE public.attendance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT,
    clock_in TEXT,
    clock_out TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(member_id, date)
);

-- 3. Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Allow full access to authenticated users - Super Admin)
CREATE POLICY "Enable all access for authenticated users" ON public.members
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.attendance_logs
    FOR ALL USING (auth.role() = 'authenticated');
