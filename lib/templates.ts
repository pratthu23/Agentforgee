export type AgentTemplate = {
  id: string
  name: string
  domain: string
  prompt: string
  tone: string
  outputFormat: string
}

export const agentTemplates: AgentTemplate[] = [
  {
    id: 'saas-support',
    name: 'SaaS Customer Support Agent',
    domain: 'Customer Support',
    prompt: 'Create a SaaS customer support agent that helps users with billing, refunds, duplicate charges, account access, troubleshooting, and escalation. It should write customer-ready replies and ask for required account details securely.',
    tone: 'Friendly, calm, and resolution-focused',
    outputFormat: 'Customer reply, needed information, next steps, and internal note'
  },
  {
    id: 'college-helpdesk',
    name: 'College Helpdesk Agent',
    domain: 'Education Support',
    prompt: 'Create a college helpdesk agent that answers student questions about admissions, fees, exams, documents, attendance, campus services, and escalation paths while avoiding unsupported policy claims.',
    tone: 'Helpful, patient, and clear',
    outputFormat: 'Short answer, required details, steps, and office/contact suggestion'
  },
  {
    id: 'whatsapp-business',
    name: 'Local Business WhatsApp Support Agent',
    domain: 'Local Business Support',
    prompt: 'Create a WhatsApp support agent for a local business that answers product, order, refund, delivery, appointment, and store-hour questions in concise mobile-friendly messages.',
    tone: 'Warm, concise, and practical',
    outputFormat: 'WhatsApp-ready reply, missing details, and next action'
  }
]
