
CREATE TABLE public.support_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'user',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages on their own tickets
CREATE POLICY "Users can read own ticket messages"
  ON public.support_ticket_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = ticket_id AND st.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Users can insert messages on their own open tickets
CREATE POLICY "Users can send messages on own tickets"
  ON public.support_ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = ticket_id AND st.user_id = auth.uid() AND st.status IN ('open', 'in_progress'))
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;
