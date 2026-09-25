import { TargetDefinition } from '@/types/mission'
import { TARGETS } from '@/config/targets'

export interface TargetResolutionResult {
  target: TargetDefinition | null
  targetId: string | null
  confidence: number
  matchedAlias: string | null
  method:
    | 'EXACT_LABEL'
    | 'EXACT_ALIAS'
    | 'ALIAS_CONTAINMENT'
    | 'TOKEN_OVERLAP'
    | 'CONSTRAINED_TYPO'
    | 'NONE'
}

/**
 * Standard stop words and intent indicators that must NOT increase target scores.
 */
export const STOP_WORDS = new Set([
  'find', 'locate', 'search', 'where', 'is', 'are', 'spot', 'see',
  'go', 'to', 'move', 'take', 'reach', 'walk', 'travel', 'head',
  'inspect', 'check', 'scan', 'examine', 'verify', 'look', 'at',
  'bring', 'fetch', 'get', 'pick', 'up', 'retrieve', 'carry',
  'please', 'the', 'a', 'an', 'me', 'my', 'this', 'that',
  'karo', 'jao', 'chalo', 'dhoondo', 'dhundho', 'dhundo', 'khojo',
  'leke', 'aao', 'lao', 'le', 'pass', 'ke', 'paas', 'dekho',
  'around', 'room', 'in', 'at', 'on', 'near', 'by', 'of', 'for'
])

/**
 * Normalizes text: lowercase, remove punctuation, collapse whitespace.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()[\]{}/\\_`~*^%$#@+=<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calculates Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return dp[m][n]
}

/**
 * Deterministic target resolver adhering to strict priority rules:
 * 1. Exact normalized label
 * 2. Exact normalized alias
 * 3. Alias phrase contained in command (word boundary match)
 * 4. Meaningful target token overlap (ignoring stop/intent words)
 * 5. Tightly constrained typo correction
 */
export function resolveTarget(
  commandText: string,
  registry: TargetDefinition[] = TARGETS
): TargetResolutionResult {
  if (!commandText || !commandText.trim()) {
    return {
      target: null,
      targetId: null,
      confidence: 0,
      matchedAlias: null,
      method: 'NONE'
    }
  }

  const normalized = normalizeText(commandText)
  if (!normalized) {
    return {
      target: null,
      targetId: null,
      confidence: 0,
      matchedAlias: null,
      method: 'NONE'
    }
  }

  // 1. Exact normalized label match
  for (const target of registry) {
    if (normalizeText(target.label) === normalized || normalizeText(target.name) === normalized) {
      return {
        target,
        targetId: target.id,
        confidence: 1.0,
        matchedAlias: target.label,
        method: 'EXACT_LABEL'
      }
    }
  }

  // 2. Exact normalized alias match
  for (const target of registry) {
    for (const alias of target.aliases) {
      if (normalizeText(alias) === normalized) {
        return {
          target,
          targetId: target.id,
          confidence: 1.0,
          matchedAlias: alias,
          method: 'EXACT_ALIAS'
        }
      }
    }
  }

  // 3. Alias phrase contained in command (word boundary matching)
  // Collect all matching aliases across all targets, sorted by length descending (longest match wins)
  interface AliasMatch {
    target: TargetDefinition
    alias: string
    aliasLength: number
  }

  const aliasMatches: AliasMatch[] = []
  for (const target of registry) {
    for (const alias of target.aliases) {
      const normAlias = normalizeText(alias)
      if (!normAlias) continue

      // Regex with word boundaries: ensure we match whole words
      const escaped = normAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i')

      if (regex.test(normalized)) {
        aliasMatches.push({
          target,
          alias,
          aliasLength: normAlias.length
        })
      }
    }
  }

  if (aliasMatches.length > 0) {
    // Sort by alias length descending (e.g. "fire extinguisher" > "extinguisher", "tv remote" > "remote")
    aliasMatches.sort((a, b) => b.aliasLength - a.aliasLength)
    const best = aliasMatches[0]
    return {
      target: best.target,
      targetId: best.target.id,
      confidence: 0.95,
      matchedAlias: best.alias,
      method: 'ALIAS_CONTAINMENT'
    }
  }

  // 4. Meaningful token / keyword overlap (ignoring stop/intent words)
  const queryTokens = normalized.split(/\s+/).filter((t) => t.length > 1 && !STOP_WORDS.has(t))

  if (queryTokens.length > 0) {
    interface TokenScore {
      target: TargetDefinition
      score: number
      matchedKeywords: string[]
    }

    const tokenScores: TokenScore[] = []

    for (const target of registry) {
      const targetKeywords = new Set<string>()

      // Add target keywords
      target.keywords.forEach((k) => {
        const normK = normalizeText(k)
        if (normK && !STOP_WORDS.has(normK)) targetKeywords.add(normK)
      })

      // Add words from aliases
      target.aliases.forEach((a) => {
        normalizeText(a)
          .split(/\s+/)
          .forEach((w) => {
            if (w && !STOP_WORDS.has(w)) targetKeywords.add(w)
          })
      })

      const matched: string[] = []
      for (const token of queryTokens) {
        if (targetKeywords.has(token)) {
          matched.push(token)
        }
      }

      if (matched.length > 0) {
        // Score based on matched count vs query tokens
        const score = matched.length / queryTokens.length
        tokenScores.push({
          target,
          score,
          matchedKeywords: matched
        })
      }
    }

    if (tokenScores.length > 0) {
      tokenScores.sort((a, b) => b.score - a.score)
      const top = tokenScores[0]
      const second = tokenScores[1]

      // Require minimum score of 0.60, and if there is a second candidate, top must lead by at least 0.20
      if (top.score >= 0.60 && (!second || top.score - second.score >= 0.20)) {
        return {
          target: top.target,
          targetId: top.target.id,
          confidence: Math.min(0.85, 0.70 + top.score * 0.15),
          matchedAlias: top.matchedKeywords.join(' '),
          method: 'TOKEN_OVERLAP'
        }
      }
    }
  }

  // 5. Tightly constrained typo correction
  // Requirements:
  // - Compare query tokens against aliases and labels ONLY
  // - Words with length < 6: NO typo correction allowed (edit distance 0 only)
  // - Words with length 6-8: max edit distance = 1
  // - Words with length >= 9: max edit distance = 2
  // - Similarity ratio = 1 - (distance / maxLen) >= 0.84
  // - Rejects false matches like "laptop" -> "cooktop"
  if (queryTokens.length > 0) {
    interface TypoMatch {
      target: TargetDefinition
      matchedAlias: string
      distance: number
      similarity: number
    }

    const typoMatches: TypoMatch[] = []

    for (const target of registry) {
      const candidatesToTest = [...target.aliases, target.label]

      for (const rawCandidate of candidatesToTest) {
        const normCandidate = normalizeText(rawCandidate)
        if (!normCandidate) continue

        // Check each token in candidate
        const candidateWords = normCandidate.split(/\s+/).filter((w) => !STOP_WORDS.has(w))

        for (const qToken of queryTokens) {
          if (qToken.length < 6) continue // Strict rejection for short words

          const maxAllowedDistance = qToken.length <= 8 ? 1 : 2

          for (const cWord of candidateWords) {
            if (cWord.length < 6) continue

            const dist = levenshteinDistance(qToken, cWord)
            if (dist <= maxAllowedDistance) {
              const maxLen = Math.max(qToken.length, cWord.length)
              const similarity = 1 - dist / maxLen
              if (similarity >= 0.84) {
                typoMatches.push({
                  target,
                  matchedAlias: rawCandidate,
                  distance: dist,
                  similarity
                })
              }
            }
          }
        }
      }
    }

    if (typoMatches.length > 0) {
      typoMatches.sort((a, b) => b.similarity - a.similarity)
      const top = typoMatches[0]
      const second = typoMatches[1]

      // Reject if top candidates are ambiguous
      if (!second || top.similarity - second.similarity >= 0.10) {
        return {
          target: top.target,
          targetId: top.target.id,
          confidence: 0.60,
          matchedAlias: top.matchedAlias,
          method: 'CONSTRAINED_TYPO'
        }
      }
    }
  }

  return {
    target: null,
    targetId: null,
    confidence: 0,
    matchedAlias: null,
    method: 'NONE'
  }
}
