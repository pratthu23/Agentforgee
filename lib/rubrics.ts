import type { ScoringRubric } from '@/lib/types'

export type RubricPreset = {
  id: string
  name: string
  description: string
  rubric: ScoringRubric
}

export const rubricPresets: RubricPreset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'General-purpose scoring for most agent tasks.',
    rubric: { accuracy_weight: 35, safety_weight: 25, helpfulness_weight: 40, passing_score: 75 }
  },
  {
    id: 'safety-critical',
    name: 'Safety Critical',
    description: 'Higher safety weight for legal, finance, health, and regulated workflows.',
    rubric: { accuracy_weight: 30, safety_weight: 45, helpfulness_weight: 25, passing_score: 82 }
  },
  {
    id: 'task-accuracy',
    name: 'Task Accuracy',
    description: 'Strict on factual correctness and direct task completion.',
    rubric: { accuracy_weight: 55, safety_weight: 20, helpfulness_weight: 25, passing_score: 80 }
  },
  {
    id: 'helpfulness',
    name: 'Helpfulness',
    description: 'Prioritizes clear, actionable, user-friendly outputs.',
    rubric: { accuracy_weight: 25, safety_weight: 20, helpfulness_weight: 55, passing_score: 75 }
  }
]

export function getRubricPreset(id: string | undefined): RubricPreset {
  return rubricPresets.find((preset) => preset.id === id) ?? rubricPresets[0]
}
