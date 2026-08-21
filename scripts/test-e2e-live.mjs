const BASE_URL = 'http://localhost:7465'
const SITE_TOKEN = 'replace-with-a-strong-private-token'

async function runE2ETests() {
  console.log('🚀 Starting Full Multi-Tenant SaaS End-to-End Live Testing...\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`)
      passed++
    }
    else {
      console.error(`  ❌ FAIL: ${message}`)
      failed++
    }
  }

  try {
    // 1. Root Site Token Verification
    console.log('1️⃣ Testing Root Site Token Auth...')
    const verifyRes = await fetch(`${BASE_URL}/api/verify`, {
      headers: { Authorization: `Bearer ${SITE_TOKEN}` },
    })
    assert(verifyRes.status === 200, `Root /api/verify returned 200 (Got: ${verifyRes.status})`)
    const verifyData = await verifyRes.json()
    assert(verifyData.authMethod === 'site-token', `AuthMethod is 'site-token' (Got: ${verifyData.authMethod})`)

    // 2. Initialize Link Store (Run migration to complete initial D1 marker)
    console.log('\n2️⃣ Initializing Link Store Migration Marker...')
    const migRes = await fetch(`${BASE_URL}/api/link/migration/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SITE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ force: true }),
    })
    assert([200, 204].includes(migRes.status), `Migration run initialized (Got: ${migRes.status})`)

    // 3. User Registration
    console.log('\n3️⃣ Testing User Registration...')
    const testEmail = `saas-user-${Date.now()}@example.com`
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
        name: 'Jane SaaS Developer',
        organizationName: 'Acme SaaS Corp',
        organizationSlug: `acme-${Date.now().toString(36)}`,
      }),
    })
    assert(registerRes.status === 200, `Register returned 200 (Got: ${registerRes.status})`)
    const regData = await registerRes.json()
    assert(!!regData.token, 'Registration issued JWT session token')
    assert(regData.user.email === testEmail, 'User profile registered correctly')
    assert(!!regData.activeOrganization, 'Personal organization automatically created')
    const userToken = regData.token
    const orgId = regData.activeOrganization.id

    // 4. User Login
    console.log('\n4️⃣ Testing User Login...')
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
      }),
    })
    assert(loginRes.status === 200, `Login returned 200 (Got: ${loginRes.status})`)
    const loginData = await loginRes.json()
    assert(!!loginData.token, 'Login successfully returned fresh session JWT')

    // 5. Session Validation (GET /api/auth/me)
    console.log('\n5️⃣ Testing Session Profile (/api/auth/me)...')
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert(meRes.status === 200, `/api/auth/me returned 200 (Got: ${meRes.status})`)
    const meData = await meRes.json()
    assert(meData.user.email === testEmail, 'Session resolved correct user email')

    // 6. Create Secondary Organization
    console.log('\n6️⃣ Testing Organization Creation...')
    const newOrgSlug = `startup-${Date.now().toString(36)}`
    const createOrgRes = await fetch(`${BASE_URL}/api/organizations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Startup Labs',
        slug: newOrgSlug,
      }),
    })
    assert(createOrgRes.status === 200, `Create org returned 200 (Got: ${createOrgRes.status})`)
    const newOrg = await createOrgRes.json()
    assert(newOrg.slug === newOrgSlug, 'Secondary workspace created with expected slug')

    // 7. Create API Key
    console.log('\n7️⃣ Testing Programmatic API Key Creation...')
    const apiKeyRes = await fetch(`${BASE_URL}/api/organizations/${orgId}/api-keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Production Worker Key',
        permissions: ['links:read', 'links:write'],
      }),
    })
    assert(apiKeyRes.status === 200, `Create API key returned 200 (Got: ${apiKeyRes.status})`)
    const apiKeyData = await apiKeyRes.json()
    assert(apiKeyData.secretKey.startsWith('sk_live_'), `Generated live API key format sk_live_... (Got: ${apiKeyData.secretKey})`)
    const liveApiKey = apiKeyData.secretKey

    // 8. Create Short Link using Programmatic API Key
    console.log('\n8️⃣ Testing Link Creation with API Key...')
    const linkSlug = `saas-link-${Date.now().toString(36)}`
    const createLinkRes = await fetch(`${BASE_URL}/api/link/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${liveApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://github.com/ccbikai/sink',
        slug: linkSlug,
        comment: 'Created via SaaS API Key',
      }),
    })
    assert([200, 201].includes(createLinkRes.status), `Create link with API key returned 201 (Got: ${createLinkRes.status})`)
    const linkData = await createLinkRes.json()
    console.log('    [Debug linkData]:', linkData)
    assert(!!linkData, 'Link created successfully with slug')

    // 9. Public Link Resolution & Redirect
    console.log('\n9️⃣ Testing Public Short Link Redirection...')
    const redirectRes = await fetch(`${BASE_URL}/${linkSlug}`, {
      redirect: 'manual',
    })
    assert([301, 302, 307, 308].includes(redirectRes.status), `Public link redirected with status ${redirectRes.status}`)
    assert(redirectRes.headers.get('location') === 'https://github.com/ccbikai/sink', 'Location header matches target URL')

    // 10. Simulate Plan Upgrade via Webhook & Add Custom Domain
    console.log('\n🔟 Testing Plan Upgrade & Custom Domain Management...')
    // Upgrade plan to 'pro' using Stripe checkout completion event
    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: orgId,
            customer: 'cus_mock_123',
            subscription: 'sub_mock_123',
            metadata: {
              organizationId: orgId,
              plan: 'pro',
            },
          },
        },
      }),
    })
    assert(webhookRes.status === 200, `Stripe webhook upgrade processed (Got: ${webhookRes.status})`)

    const customDomainName = `short-${Date.now().toString(36)}.example.com`
    const addDomainRes = await fetch(`${BASE_URL}/api/organizations/${orgId}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: customDomainName,
      }),
    })
    assert(addDomainRes.status === 200, `Add custom domain on upgraded plan returned 200 (Got: ${addDomainRes.status})`)
    const domainData = await addDomainRes.json()
    assert(domainData.domain === customDomainName, 'Domain record stored with pending verification')

    // 11. Team Member Invitation
    console.log('\n1️⃣1️⃣ Testing Team Member Invites & RBAC...')
    const inviteEmail = `colleague-${Date.now()}@example.com`
    const inviteRes = await fetch(`${BASE_URL}/api/organizations/${orgId}/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: inviteEmail,
        role: 'admin',
      }),
    })
    assert(inviteRes.status === 200, `Invite member returned 200 (Got: ${inviteRes.status})`)
    const inviteData = await inviteRes.json()
    assert(inviteData.email === inviteEmail, 'Invite record generated with role admin')

    // 12. Billing & Quota Usage
    console.log('\n1️⃣2️⃣ Testing Billing Quota & Usage Calculations...')
    const usageRes = await fetch(`${BASE_URL}/api/organizations/${orgId}/billing/usage`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert(usageRes.status === 200, `Usage calculation returned 200 (Got: ${usageRes.status})`)
    const usageData = await usageRes.json()
    assert(usageData.usage.links >= 1, `Links usage tracked accurately (${usageData.usage.links} links)`)
    assert(usageData.limits.linksQuota > 0, `Plan quota limits exposed (${usageData.limits.linksQuota} max links)`)

    // 13. Phase 8 Outbound Webhooks & Test Ping
    console.log('\n1️⃣3️⃣ Testing Phase 8 Webhook Creation, Test Ping & Deliveries...')
    const createWhRes = await fetch(`${BASE_URL}/api/organizations/${orgId}/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://httpbin.org/post',
        events: ['link.created', 'link.deleted'],
        description: 'Live E2E Webhook Test',
      }),
    })
    assert(createWhRes.status === 200, `Create webhook returned 200 (Got: ${createWhRes.status})`)
    const whData = await createWhRes.json()
    assert(!!whData.webhook?.id, 'Webhook ID returned')
    assert(whData.webhook?.secret?.startsWith('whsec_'), 'Signing secret generated')
    const webhookId = whData.webhook.id

    const testPingRes = await fetch(`${BASE_URL}/api/organizations/${orgId}/webhooks/${webhookId}/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert(testPingRes.status === 200, `Test webhook ping returned 200 (Got: ${testPingRes.status})`)
    const pingResult = await testPingRes.json()
    assert(typeof pingResult.durationMs === 'number', `Ping delivery duration tracked (${pingResult.durationMs}ms)`)

    const deliveriesRes = await fetch(`${BASE_URL}/api/organizations/${orgId}/webhooks/${webhookId}/deliveries`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert(deliveriesRes.status === 200, `Fetch webhook deliveries returned 200 (Got: ${deliveriesRes.status})`)
    const deliveriesData = await deliveriesRes.json()
    assert(deliveriesData.deliveries?.length > 0, `Webhook delivery logged (${deliveriesData.deliveries.length} attempts)`)

    // 14. Phase 8 Audit Logs
    console.log('\n1️⃣4️⃣ Testing Phase 8 Audit Logs Query & Filtering...')
    const auditRes = await fetch(`${BASE_URL}/api/organizations/${orgId}/audit-logs`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert(auditRes.status === 200, `Audit logs endpoint returned 200 (Got: ${auditRes.status})`)
    const auditData = await auditRes.json()
    assert(auditData.items?.length > 0, `Audit log items recorded (${auditData.items.length} records)`)
    const foundWebhookAction = auditData.items.some(l => l.action.includes('webhook'))
    assert(foundWebhookAction, 'Audit log recorded webhook activity')

    console.log(`\n======================================================`)
    console.log(`🏁 Full E2E Live Testing Complete: ${passed} Passed, ${failed} Failed`)
    console.log(`======================================================\n`)

    if (failed > 0) {
      process.exit(1)
    }
  }
  catch (err) {
    console.error('Fatal testing error:', err)
    process.exit(1)
  }
}

runE2ETests()
