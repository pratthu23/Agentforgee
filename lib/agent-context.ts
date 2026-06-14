import type { Agent, KnowledgeSource, ToolIntegration } from '@/lib/types'

export function buildAgentSystemPrompt({
  agent,
  knowledge,
  tools
}: {
  agent: Agent
  knowledge: KnowledgeSource[]
  tools: ToolIntegration[]
}): string {
  const knowledgeBlock =
    knowledge.length > 0
      ? [
          '',
          'Knowledge base:',
          ...knowledge.slice(0, 8).map((item) => `- ${item.title}: ${item.content.slice(0, 1200)}`)
        ].join('\n')
      : ''
  const toolsBlock =
    tools.length > 0
      ? [
          '',
          'Available tool integrations:',
          ...tools.map((tool) => `- ${tool.name}: ${tool.description || tool.endpoint_url}`)
        ].join('\n')
      : ''

  return `${agent.system_prompt}${knowledgeBlock}${toolsBlock}`
}
