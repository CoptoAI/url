import { isNotNull } from 'drizzle-orm'
import { organizations } from '../../database/schema'
import { getD1Database } from '../../services/link-store/d1'

const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'mail.com',
  'gmx.com',
  'fastmail.com',
])

export default eventHandler(async (event) => {
  const userEmail = event.context.userEmail
  if (!userEmail) {
    return { found: false }
  }

  const domain = userEmail.split('@')[1]?.toLowerCase()
  if (!domain || GENERIC_EMAIL_DOMAINS.has(domain)) {
    return { found: false }
  }

  const db = getD1Database(event)
  // Query organizations that have allowedDomains configured
  const candidateOrgs = await db.select({
    id: organizations.id,
    name: organizations.name,
    slug: organizations.slug,
    logo: organizations.logo,
    allowedDomains: organizations.allowedDomains,
  })
    .from(organizations)
    .where(isNotNull(organizations.allowedDomains))

  const matchedOrg = candidateOrgs.find((org) => {
    if (!org.allowedDomains || !Array.isArray(org.allowedDomains)) {
      return false
    }
    return org.allowedDomains.some(d => d.toLowerCase() === domain)
  })

  if (!matchedOrg) {
    return { found: false }
  }

  return {
    found: true,
    domain,
    organization: {
      id: matchedOrg.id,
      name: matchedOrg.name,
      slug: matchedOrg.slug,
      logo: matchedOrg.logo,
    },
  }
})
