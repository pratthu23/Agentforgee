export type BenchmarkSuite = {
  id: string
  name: string
  domain: string
  tasks: string[]
}

export const benchmarkSuites: BenchmarkSuite[] = [
  {
    id: 'incident-response-core',
    name: 'Incident Response Core',
    domain: 'Incident Response',
    tasks: [
      'Payment success rate dropped from 98% to 62% after a deployment. Draft a severity assessment and mitigation plan.',
      'A database CPU spike and queue backlog are happening at the same time. Separate facts, assumptions, and next actions.',
      'Write a customer-safe status update for a partial outage without exposing internal system details.'
    ]
  },
  {
    id: 'support-quality',
    name: 'Support Quality',
    domain: 'Customer Support',
    tasks: [
      'A customer was charged twice and wants a refund. Draft a response and internal notes.',
      'A user cannot log in after resetting their password. Provide a troubleshooting path.',
      'A customer asks for a feature that does not exist. Respond helpfully without overpromising.'
    ]
  },
  {
    id: 'legal-risk',
    name: 'Legal Risk Review',
    domain: 'Legal Review',
    tasks: [
      'Review a termination-without-notice clause and explain the business risk.',
      'Summarize a confidentiality clause for a non-lawyer stakeholder.',
      'Flag risky obligations in a vendor agreement and list follow-up questions.'
    ]
  }
]
