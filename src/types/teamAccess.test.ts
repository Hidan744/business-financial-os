import { describe, expect, it } from 'vitest'
import { ALL_TEAM_DOMAINS, DOMAIN_KEYS, OWNER_ONLY_ROUTES, ROUTE_REQUIRED_DOMAINS, isRouteUnlockedForMember, type TeamDomain } from './teamAccess'
import { PROTECTABLE_ROUTES } from './access'

describe('DOMAIN_KEYS / ALL_TEAM_DOMAINS consistency', () => {
  it('every domain in ALL_TEAM_DOMAINS has a non-empty key mapping', () => {
    for (const domain of ALL_TEAM_DOMAINS) {
      expect(DOMAIN_KEYS[domain]).toBeDefined()
      expect(DOMAIN_KEYS[domain].length).toBeGreaterThan(0)
    }
  })

  it('no top-level BusinessState key is claimed by more than one domain (unambiguous write ownership)', () => {
    const seen = new Map<string, TeamDomain>()
    for (const domain of ALL_TEAM_DOMAINS) {
      for (const key of DOMAIN_KEYS[domain]) {
        expect(seen.has(key)).toBe(false)
        seen.set(key, domain)
      }
    }
  })
})

describe('ROUTE_REQUIRED_DOMAINS', () => {
  it('only references declared domains', () => {
    for (const domains of Object.values(ROUTE_REQUIRED_DOMAINS)) {
      for (const d of domains) {
        expect(ALL_TEAM_DOMAINS).toContain(d)
      }
    }
  })

  it('every PIN-protectable route (except ones with no persisted write target) has a domain mapping', () => {
    // debts и sales — read-only калькуляторы поверх finance, не пишут отдельных полей,
    // но всё равно нуждаются в domain 'finance' чтобы не рендерить пустую страницу.
    for (const { path } of PROTECTABLE_ROUTES) {
      expect(ROUTE_REQUIRED_DOMAINS[path], `missing domain mapping for ${path}`).toBeDefined()
    }
  })
})

describe('isRouteUnlockedForMember', () => {
  it('unlocks a route with no domain requirement (e.g. dashboard) for anyone', () => {
    expect(isRouteUnlockedForMember('/app/dashboard', [])).toBe(true)
  })

  it('locks a route when none of the required domains are granted', () => {
    expect(isRouteUnlockedForMember('/app/finance', [])).toBe(false)
  })

  it('unlocks a single-domain route once that domain is granted', () => {
    expect(isRouteUnlockedForMember('/app/finance', ['finance'])).toBe(true)
  })

  it('requires ALL domains for a multi-domain route, not just one', () => {
    expect(isRouteUnlockedForMember('/app/unit-economics', ['unitEconomics'])).toBe(false)
    expect(isRouteUnlockedForMember('/app/unit-economics', ['finance'])).toBe(false)
    expect(isRouteUnlockedForMember('/app/unit-economics', ['finance', 'unitEconomics'])).toBe(true)
  })

  it('extra unrelated domains do not unlock a route missing its own requirement', () => {
    expect(isRouteUnlockedForMember('/app/hr', ['finance', 'goals'])).toBe(false)
  })

  it('never unlocks an owner-only route for a member, even with every domain granted', () => {
    for (const route of OWNER_ONLY_ROUTES) {
      expect(isRouteUnlockedForMember(route, ALL_TEAM_DOMAINS)).toBe(false)
    }
  })
})
