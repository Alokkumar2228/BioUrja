
-- Roles enum + table (separate to prevent privilege escalation)
CREATE TYPE public.app_role AS ENUM ('admin', 'operator');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- user_roles policies (read own, admin reads all; no client writes)
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Waste logs
CREATE TABLE public.waste_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  food_kg NUMERIC NOT NULL CHECK (food_kg >= 0),
  garden_kg NUMERIC NOT NULL CHECK (garden_kg >= 0),
  paper_kg NUMERIC NOT NULL CHECK (paper_kg >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_waste_logs_user_date ON public.waste_logs(user_id, date DESC);

CREATE POLICY "Users view own waste logs" ON public.waste_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own waste logs" ON public.waste_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own waste logs" ON public.waste_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own waste logs" ON public.waste_logs
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all waste logs" ON public.waste_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Biogas readings
CREATE TABLE public.biogas_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waste_log_id UUID NOT NULL REFERENCES public.waste_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_waste NUMERIC NOT NULL,
  volatile_solids NUMERIC NOT NULL,
  biogas_m3 NUMERIC NOT NULL,
  methane_m3 NUMERIC NOT NULL,
  kwh NUMERIC NOT NULL,
  lpg_cylinders NUMERIC NOT NULL,
  rupee_savings NUMERIC NOT NULL,
  co2_avoided NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.biogas_readings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_biogas_readings_user_date ON public.biogas_readings(user_id, date DESC);

CREATE POLICY "Users view own readings" ON public.biogas_readings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own readings" ON public.biogas_readings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all readings" ON public.biogas_readings
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Chat history
CREATE TABLE public.chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_chat_history_user_created ON public.chat_history(user_id, created_at);

CREATE POLICY "Users view own chat" ON public.chat_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own chat" ON public.chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile + default operator role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operator');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
