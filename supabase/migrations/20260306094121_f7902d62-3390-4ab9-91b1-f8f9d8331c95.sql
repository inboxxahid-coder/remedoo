
-- Symptoms catalog
CREATE TABLE public.symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_emergency BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read symptoms" ON public.symptoms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage symptoms" ON public.symptoms FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM admin_team WHERE user_id = auth.uid() AND is_active = true)
);

-- Follow-up questions per symptom
CREATE TABLE public.symptom_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_id UUID REFERENCES public.symptoms(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  answer_options JSONB DEFAULT '[]',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.symptom_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read symptom_questions" ON public.symptom_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage symptom_questions" ON public.symptom_questions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM admin_team WHERE user_id = auth.uid() AND is_active = true)
);

-- Rule engine: symptom combos -> specialization
CREATE TABLE public.symptom_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  symptom_combination TEXT[] NOT NULL,
  recommended_specialization TEXT NOT NULL,
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.symptom_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read symptom_rules" ON public.symptom_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage symptom_rules" ON public.symptom_rules FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM admin_team WHERE user_id = auth.uid() AND is_active = true)
);

-- Conversation history
CREATE TABLE public.symptom_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_data JSONB NOT NULL DEFAULT '[]',
  symptoms_identified TEXT[] DEFAULT '{}',
  result_specialization TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.symptom_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own conversations" ON public.symptom_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own conversations" ON public.symptom_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins read all conversations" ON public.symptom_conversations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM admin_team WHERE user_id = auth.uid() AND is_active = true)
);

-- Emergency trigger keywords
CREATE TABLE public.emergency_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_keyword TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.emergency_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read emergency_triggers" ON public.emergency_triggers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage emergency_triggers" ON public.emergency_triggers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM admin_team WHERE user_id = auth.uid() AND is_active = true)
);
