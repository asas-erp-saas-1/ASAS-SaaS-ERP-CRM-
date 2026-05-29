// src/types/decimal.ts
// Precision-safe decimal arithmetic for financial calculations.
// JavaScript native `number` CANNOT represent monetary values accurately.
// 0.1 + 0.2 = 0.30000000000000004 — this is a financial system.
//
// CONSTRAINT: Edge-compatible (no Node.js APIs, no external libs).
// Implementation: integers scaled by 100 (cents), using BigInt for
// intermediate arithmetic to prevent overflow on large DZD amounts.

// =============================================================================
// DECIMAL TYPE — immutable, serializable, precision-safe
// =============================================================================

const SCALE = 100n  // 2 decimal places (DZD has fils = 1/100)

export class Decimal {
  // Stored as integer cents (BigInt) — never as float
  private readonly _cents: bigint

  private constructor(cents: bigint) {
    this._cents = cents
  }

  // ==========================================================================
  // CONSTRUCTORS
  // ==========================================================================

  static fromString(s: string): Decimal {
    if (!/^-?\d+(\.\d{1,2})?$/.test(s.trim())) {
      throw new DecimalError(`Invalid decimal string: "${s}"`)
    }
    const clean = s.trim()
    const negative = clean.startsWith('-')
    const abs = negative ? clean.slice(1) : clean
    const [whole, fraction = ''] = abs.split('.')
    const paddedFraction = fraction.padEnd(2, '0').slice(0, 2)
    const cents = BigInt(whole!) * SCALE + BigInt(paddedFraction)
    return new Decimal(negative ? -cents : cents)
  }

  static fromNumber(n: number): Decimal {
    // Convert via string to avoid float imprecision
    if (!Number.isFinite(n)) throw new DecimalError(`Cannot convert non-finite number: ${n}`)
    // Round to 2 decimal places before converting
    const rounded = Math.round(n * 100) / 100
    return Decimal.fromString(rounded.toFixed(2))
  }

  static zero(): Decimal {
    return new Decimal(0n)
  }

  static fromCents(cents: bigint): Decimal {
    return new Decimal(cents)
  }

  // ==========================================================================
  // ARITHMETIC — all return new Decimal (immutable)
  // ==========================================================================

  add(other: Decimal): Decimal {
    return new Decimal(this._cents + other._cents)
  }

  sub(other: Decimal): Decimal {
    return new Decimal(this._cents - other._cents)
  }

  mul(factor: number): Decimal {
    // Multiply by a factor (e.g., tax rate, commission %)
    // Use string-based precision: factor is usually small (0.01–1.5)
    const factorStr = factor.toFixed(8)
    const [whole, frac = ''] = factorStr.split('.')
    const paddedFrac = frac.padEnd(8, '0').slice(0, 8)
    const factorBig = BigInt(whole!) * 100_000_000n + BigInt(paddedFrac)
    // result_cents = (this._cents * factorBig) / 100_000_000n
    // Round half-up
    const raw = this._cents * factorBig
    const result = (raw + 50_000_000n) / 100_000_000n  // round
    return new Decimal(result)
  }

  div(divisor: number): Decimal {
    if (divisor === 0) throw new DecimalError('Division by zero')
    return this.mul(1 / divisor)
  }

  pct(percentage: number): Decimal {
    return this.mul(percentage / 100)
  }

  abs(): Decimal {
    return new Decimal(this._cents < 0n ? -this._cents : this._cents)
  }

  negate(): Decimal {
    return new Decimal(-this._cents)
  }

  // ==========================================================================
  // COMPARISON
  // ==========================================================================

  eq(other: Decimal): boolean { return this._cents === other._cents }
  lt(other: Decimal): boolean { return this._cents <  other._cents }
  lte(other: Decimal): boolean { return this._cents <= other._cents }
  gt(other: Decimal): boolean { return this._cents >  other._cents }
  gte(other: Decimal): boolean { return this._cents >= other._cents }
  isZero(): boolean { return this._cents === 0n }
  isNegative(): boolean { return this._cents < 0n }
  isPositive(): boolean { return this._cents > 0n }

  // ==========================================================================
  // CONVERSION
  // ==========================================================================

  toNumber(): number {
    // Safe for display only — never use for further arithmetic
    const abs = this._cents < 0n ? -this._cents : this._cents
    const negative = this._cents < 0n
    const whole = abs / SCALE
    const fraction = abs % SCALE
    const result = Number(whole) + Number(fraction) / 100
    return negative ? -result : result
  }

  toString(): string {
    const abs = this._cents < 0n ? -this._cents : this._cents
    const negative = this._cents < 0n
    const whole = abs / SCALE
    const fraction = abs % SCALE
    return `${negative ? '-' : ''}${whole}.${fraction.toString().padStart(2, '0')}`
  }

  toJSON(): string {
    return this.toString()
  }

  toCents(): bigint {
    return this._cents
  }

  // ==========================================================================
  // STATIC HELPERS
  // ==========================================================================

  static sum(values: Decimal[]): Decimal {
    return values.reduce((acc, v) => acc.add(v), Decimal.zero())
  }

  static max(a: Decimal, b: Decimal): Decimal {
    return a.gte(b) ? a : b
  }

  static min(a: Decimal, b: Decimal): Decimal {
    return a.lte(b) ? a : b
  }
}

export class DecimalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DecimalError'
  }
}

// =============================================================================
// MONEY — Decimal with currency attached (CFO-grade)
// =============================================================================

export interface Money {
  readonly amount:   Decimal
  readonly currency: string
}

export function money(amount: Decimal, currency = 'DZD'): Money {
  return Object.freeze({ amount, currency })
}

export function moneyFromString(s: string, currency = 'DZD'): Money {
  return money(Decimal.fromString(s), currency)
}

export function moneyFromNumber(n: number, currency = 'DZD'): Money {
  return money(Decimal.fromNumber(n), currency)
}

export function zeroMoney(currency = 'DZD'): Money {
  return money(Decimal.zero(), currency)
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new DecimalError(`Currency mismatch: ${a.currency} + ${b.currency}`)
  }
  return money(a.amount.add(b.amount), a.currency)
}

export function subMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new DecimalError(`Currency mismatch: ${a.currency} - ${b.currency}`)
  }
  return money(a.amount.sub(b.amount), a.currency)
}

export function sumMoney(values: Money[], currency = 'DZD'): Money {
  if (values.length === 0) return zeroMoney(currency)
  const currencies = new Set(values.map((m) => m.currency))
  if (currencies.size > 1) throw new DecimalError(`Cannot sum mixed currencies: ${[...currencies].join(', ')}`)
  return money(Decimal.sum(values.map((m) => m.amount)), values[0]!.currency)
}

export function formatMoney(m: Money): string {
  const n = m.amount.toNumber()
  return new Intl.NumberFormat('fr-DZ', {
    style:    'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + ' ' + m.currency
}

// =============================================================================
// DB ACL: parse NUMERIC(14,2) strings from Supabase → Decimal
// Supabase returns PostgreSQL NUMERIC as string — NEVER auto-parse to float.
// =============================================================================

/**
 * Parse a value from Supabase NUMERIC column to Decimal.
 * Supabase returns NUMERIC as either string or number depending on driver version.
 * This function handles both safely.
 */
export function parseDbDecimal(value: unknown, fieldName = 'field'): Decimal {
  if (value === null || value === undefined) return Decimal.zero()
  if (typeof value === 'string') {
    if (value === '' || value === 'NaN') return Decimal.zero()
    return Decimal.fromString(value)
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new DecimalError(`Non-finite value in ${fieldName}: ${value}`)
    }
    // Convert via string to avoid float imprecision
    return Decimal.fromString(value.toFixed(2))
  }
  throw new DecimalError(`Cannot parse ${fieldName}: expected string or number, got ${typeof value}`)
}

export function parseDbMoney(value: unknown, currency = 'DZD', fieldName = 'field'): Money {
  return money(parseDbDecimal(value, fieldName), currency)
}
