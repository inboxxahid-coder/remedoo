
-- Add auto-increment ticket_number to support_tickets
ALTER TABLE public.support_tickets ADD COLUMN ticket_number SERIAL;

-- Create unique index on ticket_number
CREATE UNIQUE INDEX idx_support_tickets_ticket_number ON public.support_tickets(ticket_number);
