import { CommandIntent, TargetDefinition } from '@/types/mission'

export interface CommandValidationResult {
  valid: boolean
  errors: string[]
}

export function validateCommand(
  rawText: string,
  intent: CommandIntent | null,
  target: TargetDefinition | null,
  meta?: { ambiguousIntent?: boolean; conflictingIntents?: CommandIntent[] }
): CommandValidationResult {
  const errors: string[] = []

  // 1. Check for empty command text
  if (!rawText || !rawText.trim()) {
    return {
      valid: false,
      errors: ['Command cannot be empty. Please enter an autonomous mission command.']
    }
  }

  // 2. Validate Intent
  if (!intent) {
    if (meta?.ambiguousIntent) {
      const conflicting = meta.conflictingIntents?.join(' / ') || 'multiple intents'
      errors.push(
        `Ambiguous command: conflicting actions detected (${conflicting}). Please specify a single clear intent.`
      )
    } else if (target) {
      errors.push(
        `No actionable intent specified for "${target.label}". Please include a supported action like FIND, NAVIGATE, INSPECT, or FETCH (e.g. "Find ${target.label}" or "Go to ${target.label}").`
      )
    } else {
      errors.push(
        'Unsupported command: unrecognized intent. Supported actions are FIND, NAVIGATE, INSPECT, and FETCH.'
      )
    }
  }

  // 3. Validate Target
  if (!target) {
    errors.push('Target not found in NaviMind target registry.')
  } else {
    // 4. Validate Target Searchability
    if (!target.searchable) {
      errors.push(`Target "${target.label}" is not configured for autonomous search.`)
    }

    // 5. Validate Action Capabilities
    if (intent === 'FETCH' && !target.pickupAllowed) {
      errors.push(
        `${target.label} can be located or inspected, but is not configured as a retrievable object.`
      )
    }

    if (intent === 'INSPECT' && !target.inspectable) {
      errors.push(`${target.label} is not configured for autonomous inspection.`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
