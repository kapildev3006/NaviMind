import { CommandIntent } from '@/types/mission'
import { normalizeText } from './targetResolver'

export interface IntentParseResult {
  intent: CommandIntent | null
  confidence: number
  matchedPattern?: string
  ambiguous?: boolean
  conflictingIntents?: CommandIntent[]
}

interface PatternRule {
  intent: CommandIntent
  pattern: RegExp
  rawPattern: string
  confidence: number
  priority: number // Higher priority matches first
}

/**
 * Deterministic Intent Parsing Rules.
 * Ordered by specific multi-word patterns first, then single-word patterns.
 */
const INTENT_RULES: PatternRule[] = [
  // --- HIGHEST PRIORITY: SPECIFIC MULTI-WORD PHRASES ---
  // NAVIGATE multi-word
  { intent: 'NAVIGATE', pattern: /\bget\s+to\b/i, rawPattern: 'get to', confidence: 1.0, priority: 100 },
  { intent: 'NAVIGATE', pattern: /\bgo\s+to\b/i, rawPattern: 'go to', confidence: 1.0, priority: 100 },
  { intent: 'NAVIGATE', pattern: /\bmove\s+to\b/i, rawPattern: 'move to', confidence: 1.0, priority: 100 },
  { intent: 'NAVIGATE', pattern: /\bnavigate\s+to\b/i, rawPattern: 'navigate to', confidence: 1.0, priority: 100 },
  { intent: 'NAVIGATE', pattern: /\btake\s+me\s+to\b/i, rawPattern: 'take me to', confidence: 1.0, priority: 100 },
  { intent: 'NAVIGATE', pattern: /\bwalk\s+to\b/i, rawPattern: 'walk to', confidence: 1.0, priority: 100 },
  { intent: 'NAVIGATE', pattern: /\bhead\s+to\b/i, rawPattern: 'head to', confidence: 1.0, priority: 100 },
  { intent: 'NAVIGATE', pattern: /\btravel\s+to\b/i, rawPattern: 'travel to', confidence: 1.0, priority: 100 },
  { intent: 'NAVIGATE', pattern: /\bke\s+paas\s+jao\b/i, rawPattern: 'ke paas jao', confidence: 1.0, priority: 100 },
  { intent: 'NAVIGATE', pattern: /\bke\s+pass\s+jao\b/i, rawPattern: 'ke pass jao', confidence: 1.0, priority: 100 },
  { intent: 'NAVIGATE', pattern: /\bpaas\s+jao\b/i, rawPattern: 'paas jao', confidence: 1.0, priority: 95 },
  { intent: 'NAVIGATE', pattern: /\bpass\s+jao\b/i, rawPattern: 'pass jao', confidence: 1.0, priority: 95 },

  // FETCH multi-word
  { intent: 'FETCH', pattern: /\bbring\s+me\b/i, rawPattern: 'bring me', confidence: 1.0, priority: 100 },
  { intent: 'FETCH', pattern: /\bbring\s+back\b/i, rawPattern: 'bring back', confidence: 1.0, priority: 100 },
  { intent: 'FETCH', pattern: /\bpick\s+up\b/i, rawPattern: 'pick up', confidence: 1.0, priority: 100 },
  { intent: 'FETCH', pattern: /\bget\s+me\b/i, rawPattern: 'get me', confidence: 1.0, priority: 100 },
  { intent: 'FETCH', pattern: /\bfetch\s+me\b/i, rawPattern: 'fetch me', confidence: 1.0, priority: 100 },
  { intent: 'FETCH', pattern: /\bleke\s+aao\b/i, rawPattern: 'leke aao', confidence: 1.0, priority: 100 },
  { intent: 'FETCH', pattern: /\ble\s+aao\b/i, rawPattern: 'le aao', confidence: 1.0, priority: 100 },
  { intent: 'FETCH', pattern: /\buthake\s+lao\b/i, rawPattern: 'uthake lao', confidence: 1.0, priority: 100 },

  // FIND multi-word
  { intent: 'FIND', pattern: /\bcheck\s+where\b/i, rawPattern: 'check where', confidence: 1.0, priority: 100 },
  { intent: 'FIND', pattern: /\bwhere\s+is\b/i, rawPattern: 'where is', confidence: 1.0, priority: 100 },
  { intent: 'FIND', pattern: /\bwhere\s+are\b/i, rawPattern: 'where are', confidence: 1.0, priority: 100 },
  { intent: 'FIND', pattern: /\blook\s+for\b/i, rawPattern: 'look for', confidence: 1.0, priority: 100 },
  { intent: 'FIND', pattern: /\bsearch\s+for\b/i, rawPattern: 'search for', confidence: 1.0, priority: 100 },

  // INSPECT multi-word
  { intent: 'INSPECT', pattern: /\bcheck\s+karo\b/i, rawPattern: 'check karo', confidence: 1.0, priority: 100 },
  { intent: 'INSPECT', pattern: /\binspect\s+karo\b/i, rawPattern: 'inspect karo', confidence: 1.0, priority: 100 },
  { intent: 'INSPECT', pattern: /\bscan\s+karo\b/i, rawPattern: 'scan karo', confidence: 1.0, priority: 100 },
  { intent: 'INSPECT', pattern: /\bjaanch\s+karo\b/i, rawPattern: 'jaanch karo', confidence: 1.0, priority: 100 },
  { intent: 'INSPECT', pattern: /\bcheck\s+out\b/i, rawPattern: 'check out', confidence: 0.95, priority: 95 },
  { intent: 'INSPECT', pattern: /\bcheck\s+on\b/i, rawPattern: 'check on', confidence: 0.95, priority: 95 },
  { intent: 'INSPECT', pattern: /\blook\s+at\b/i, rawPattern: 'look at', confidence: 0.90, priority: 90 },

  // --- MEDIUM PRIORITY: SINGLE-WORD DISTINCT INDICATORS ---
  // FIND single-word
  { intent: 'FIND', pattern: /\bfind\b/i, rawPattern: 'find', confidence: 0.95, priority: 70 },
  { intent: 'FIND', pattern: /\blocate\b/i, rawPattern: 'locate', confidence: 0.95, priority: 70 },
  { intent: 'FIND', pattern: /\bsearch\b/i, rawPattern: 'search', confidence: 0.90, priority: 70 },
  { intent: 'FIND', pattern: /\bspot\b/i, rawPattern: 'spot', confidence: 0.85, priority: 70 },
  { intent: 'FIND', pattern: /\bdhoondo\b/i, rawPattern: 'dhoondo', confidence: 0.95, priority: 70 },
  { intent: 'FIND', pattern: /\bdhundho\b/i, rawPattern: 'dhundho', confidence: 0.95, priority: 70 },
  { intent: 'FIND', pattern: /\bdhundo\b/i, rawPattern: 'dhundo', confidence: 0.95, priority: 70 },
  { intent: 'FIND', pattern: /\bkhojo\b/i, rawPattern: 'khojo', confidence: 0.95, priority: 70 },

  // NAVIGATE single-word
  { intent: 'NAVIGATE', pattern: /\bnavigate\b/i, rawPattern: 'navigate', confidence: 0.90, priority: 65 },
  { intent: 'NAVIGATE', pattern: /\breach\b/i, rawPattern: 'reach', confidence: 0.85, priority: 65 },
  { intent: 'NAVIGATE', pattern: /\bjao\b/i, rawPattern: 'jao', confidence: 0.85, priority: 65 },
  { intent: 'NAVIGATE', pattern: /\bchalo\b/i, rawPattern: 'chalo', confidence: 0.85, priority: 65 },

  // INSPECT single-word
  { intent: 'INSPECT', pattern: /\binspect\b/i, rawPattern: 'inspect', confidence: 0.95, priority: 70 },
  { intent: 'INSPECT', pattern: /\bexamine\b/i, rawPattern: 'examine', confidence: 0.90, priority: 70 },
  { intent: 'INSPECT', pattern: /\bscan\b/i, rawPattern: 'scan', confidence: 0.90, priority: 70 },
  { intent: 'INSPECT', pattern: /\bverify\b/i, rawPattern: 'verify', confidence: 0.90, priority: 70 },
  { intent: 'INSPECT', pattern: /\bcheck\b/i, rawPattern: 'check', confidence: 0.85, priority: 60 },
  { intent: 'INSPECT', pattern: /\bdekho\b/i, rawPattern: 'dekho', confidence: 0.80, priority: 60 },

  // FETCH single-word
  { intent: 'FETCH', pattern: /\bfetch\b/i, rawPattern: 'fetch', confidence: 0.95, priority: 70 },
  { intent: 'FETCH', pattern: /\bbring\b/i, rawPattern: 'bring', confidence: 0.90, priority: 65 },
  { intent: 'FETCH', pattern: /\bretrieve\b/i, rawPattern: 'retrieve', confidence: 0.90, priority: 65 },
  { intent: 'FETCH', pattern: /\bget\b/i, rawPattern: 'get', confidence: 0.80, priority: 50 }, // lower priority than 'get to'
  { intent: 'FETCH', pattern: /\blao\b/i, rawPattern: 'lao', confidence: 0.85, priority: 60 }
]

/**
 * Deterministic intent parser.
 * Evaluates phrase priority, differentiates ambiguous terms (e.g. 'get to' vs 'get'),
 * and detects conflicting intents.
 */
export function parseIntent(commandText: string): IntentParseResult {
  if (!commandText || !commandText.trim()) {
    return { intent: null, confidence: 0 }
  }

  const normalized = normalizeText(commandText)
  if (!normalized) {
    return { intent: null, confidence: 0 }
  }

  // Find all matching rules
  const matchedRules: PatternRule[] = []
  for (const rule of INTENT_RULES) {
    if (rule.pattern.test(normalized)) {
      matchedRules.push(rule)
    }
  }

  if (matchedRules.length === 0) {
    return { intent: null, confidence: 0 }
  }

  // Sort matched rules by priority descending
  matchedRules.sort((a, b) => b.priority - a.priority || b.confidence - a.confidence)

  const top = matchedRules[0]

  // Check for ambiguous conflicting intents at the same priority level
  const samePriorityConflicts = matchedRules.filter(
    (r) => r.priority === top.priority && r.intent !== top.intent
  )

  if (samePriorityConflicts.length > 0) {
    const conflicting = Array.from(new Set([top.intent, ...samePriorityConflicts.map((c) => c.intent)]))
    return {
      intent: null,
      confidence: 0,
      ambiguous: true,
      conflictingIntents: conflicting,
      matchedPattern: `${top.rawPattern} vs ${samePriorityConflicts[0].rawPattern}`
    }
  }

  return {
    intent: top.intent,
    confidence: top.confidence,
    matchedPattern: top.rawPattern
  }
}
