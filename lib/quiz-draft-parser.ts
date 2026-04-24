export type ParsedQuizQuestion = {
  /** 1-based question number from the draft */
  num: number
  prompt: string
  /** Display strings in order, e.g. "A) Cairo" */
  options: string[]
  correctIndex: number
}

function letterToIndex(letter: string, lettersInOrder: string[]): number {
  const L = letter.toUpperCase()
  const i = lettersInOrder.indexOf(L)
  return i
}

/**
 * Parse teacher-typed quiz + answer key.
 *
 * Draft format (one block per question):
 * ```
 * 1. What is 2 + 2?
 * A) 3
 * B) 4
 * C) 5
 *
 * 2) Next question text?
 * A. First
 * B. Second
 * ```
 *
 * Answer key examples (all equivalent):
 * `1=b 2=a` or `1 = B , 2 = a` or `1=B 2=A`
 */
export function parseQuizDraft(draft: string, answerKey: string): ParsedQuizQuestion[] {
  const keyByNum = new Map<number, string>()
  const keyText = answerKey.trim()
  for (const m of keyText.matchAll(/(\d+)\s*=\s*([A-Za-z])/g)) {
    keyByNum.set(Number(m[1]), String(m[2]).toUpperCase())
  }
  if (keyByNum.size === 0) {
    throw new Error('Answer key is empty or invalid. Use e.g. "1=a 2=c 3=b" (question number = letter).')
  }

  const lines = draft.trim().replace(/\r\n/g, "\n").split("\n")
  const blocks: string[][] = []
  let cur: string[] = []

  for (const line of lines) {
    if (/^\s*\d+\s*[\.)]\s/.test(line)) {
      if (cur.length) blocks.push(cur)
      cur = [line]
    } else if (cur.length) {
      cur.push(line)
    }
  }
  if (cur.length) blocks.push(cur)

  const out: ParsedQuizQuestion[] = []

  for (const block of blocks) {
    const first = block[0] || ""
    const m0 = first.match(/^\s*(\d+)\s*[\.)]\s*(.*)$/)
    if (!m0) continue
    const num = Number(m0[1])
    let prompt = String(m0[2] || "").trim()
    const optionLines = block.slice(1)

    type Opt = { letter: string; label: string }
    const opts: Opt[] = []
    for (const ln of optionLines) {
      const t = ln.trim()
      if (!t) continue
      const mo = t.match(/^([A-Za-z])\s*[\.)]\s*(.*)$/)
      if (mo) {
        opts.push({ letter: String(mo[1]).toUpperCase(), label: `${String(mo[1]).toUpperCase()}) ${String(mo[2] || "").trim()}`.trim() })
      } else if (opts.length === 0) {
        prompt = [prompt, t].filter(Boolean).join("\n").trim()
      }
    }

    if (!prompt) continue
    if (opts.length < 2) {
      throw new Error(`Question ${num} needs at least two choices (lines like "A) ...", "B) ...").`)
    }

    const want = keyByNum.get(num)
    if (!want) {
      throw new Error(`Missing answer for question ${num} in the answer key (e.g. add "${num}=a").`)
    }

    const lettersInOrder = opts.map((o) => o.letter)
    const correctIndex = letterToIndex(want, lettersInOrder)
    if (correctIndex < 0) {
      throw new Error(`Answer key for question ${num} is "${want}" but that letter is not among the choices.`)
    }

    out.push({
      num,
      prompt,
      options: opts.map((o) => o.label),
      correctIndex,
    })
  }

  out.sort((a, b) => a.num - b.num)

  for (const [n] of keyByNum) {
    if (!out.some((q) => q.num === n)) {
      throw new Error(`Answer key mentions question ${n}, but that question was not found in the draft.`)
    }
  }

  if (!out.length) throw new Error("No questions found. Start each question with a number, e.g. `1. ...` or `2) ...`.")

  return out
}
