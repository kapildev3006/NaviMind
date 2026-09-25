import { ParsedCommand, TargetDefinition } from '@/types/mission'
import { TARGETS } from '@/config/targets'
import { parseIntent } from './intentParser'
import { resolveTarget } from './targetResolver'
import { validateCommand } from './commandValidator'

/**
 * Unified Command Parser for NaviMind.
 * Coordinates deterministic intent parsing, target resolution, and command validation.
 */
export function parseCommand(
  rawText: string,
  registry: TargetDefinition[] = TARGETS
): ParsedCommand {
  const trimmed = rawText?.trim() || ''

  const intentResult = parseIntent(trimmed)
  const targetResult = resolveTarget(trimmed, registry)

  const validation = validateCommand(
    trimmed,
    intentResult.intent,
    targetResult.target,
    {
      ambiguousIntent: intentResult.ambiguous,
      conflictingIntents: intentResult.conflictingIntents
    }
  )

  return {
    rawText: trimmed,
    intent: intentResult.intent,
    targetId: targetResult.targetId,
    target: targetResult.target,
    intentConfidence: intentResult.confidence,
    targetConfidence: targetResult.confidence,
    matchedIntentPattern: intentResult.matchedPattern,
    matchedTargetAlias: targetResult.matchedAlias || undefined,
    resolutionMethod: targetResult.method,
    valid: validation.valid,
    errors: validation.errors
  }
}
