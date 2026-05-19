export type SupportImpact = 'low' | 'medium' | 'high' | 'critical';

export interface SupportTicketInput {
  readonly subject: string;
  readonly message: string;
  readonly impact: SupportImpact;
}

export interface SupportTicketResult {
  readonly ticketId: string;
}
