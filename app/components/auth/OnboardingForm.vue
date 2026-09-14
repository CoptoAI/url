<script setup lang="ts">
import { AlertCircle, Building2, Check, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Plus, Sparkles, Trash2, Users } from '@lucide/vue'
import { useDebounceFn } from '@vueuse/core'
import { UsernameSchema } from '#shared/schemas/saas'
import { setActiveOrganizationId, setAuthToken } from '@/utils/auth-token'

const emit = defineEmits<{
  success: []
}>()

const { userName, userEmail, setAuthSession } = useAuthSession()

const currentStep = shallowRef(1)
const isSubmitting = shallowRef(false)
const submitError = shallowRef('')

// Form State
const formData = reactive({
  name: userName.value || '',
  username: '',
  action: 'create_workspace' as 'create_workspace' | 'join_workspace',
  workspaceName: '',
  workspaceSlug: '',
  teamSize: 'solo' as 'solo' | 'small' | 'medium' | 'enterprise',
  joinOrganizationId: '',
  invites: [] as Array<{ email: string, role: 'admin' | 'member' }>,
})

// Validation & Live Check States
const usernameChecking = shallowRef(false)
const usernameAvailable = shallowRef<boolean | null>(null)
const usernameError = shallowRef('')

const slugChecking = shallowRef(false)
const slugAvailable = shallowRef<boolean | null>(null)
const slugError = shallowRef('')

// Domain Discovery State
const discoveredCompany = ref<{
  id: string
  name: string
  slug: string
  logo?: string | null
} | null>(null)

// Debounced Username Checker
const checkUsernameAvailability = useDebounceFn(async (val: string) => {
  const trimmed = val.trim().toLowerCase()
  if (!trimmed) {
    usernameAvailable.value = null
    usernameError.value = ''
    return
  }

  const parse = UsernameSchema.safeParse(trimmed)
  if (!parse.success) {
    usernameAvailable.value = false
    usernameError.value = parse.error.issues[0]?.message || 'Invalid username'
    return
  }

  usernameChecking.value = true
  try {
    const res = await $fetch<{ available: boolean, reason?: string }>(`/api/auth/check-username?username=${encodeURIComponent(trimmed)}`)
    usernameAvailable.value = res.available
    usernameError.value = res.available ? '' : (res.reason || 'Username is not available')
  }
  catch {
    usernameAvailable.value = false
    usernameError.value = 'Failed to check username'
  }
  finally {
    usernameChecking.value = false
  }
}, 300)

// Debounced Slug Checker
const checkSlugAvailability = useDebounceFn(async (val: string) => {
  const trimmed = val.trim().toLowerCase()
  if (!trimmed || trimmed.length < 2) {
    slugAvailable.value = null
    slugError.value = ''
    return
  }

  slugChecking.value = true
  try {
    const res = await useAPI<{ available: boolean, reason?: string }>(`/api/organizations/check-slug?slug=${encodeURIComponent(trimmed)}`)
    slugAvailable.value = res.available
    slugError.value = res.available ? '' : (res.reason || 'Slug is not available')
  }
  catch {
    slugAvailable.value = false
    slugError.value = 'Failed to check slug'
  }
  finally {
    slugChecking.value = false
  }
}, 300)

// Initialize defaults from user session
onMounted(async () => {
  if (userName.value && !formData.name) {
    formData.name = userName.value
  }

  // Pre-fill a slug-friendly username from email or name
  if (userEmail.value && !formData.username) {
    const raw = userEmail.value.split('@')[0]!.replace(/[^\w-]/g, '').toLowerCase()
    formData.username = raw.slice(0, 30)
    checkUsernameAvailability(formData.username)
  }

  // Pre-fill workspace name
  if (formData.name && !formData.workspaceName) {
    formData.workspaceName = `${formData.name}'s Workspace`
    const rawSlug = formData.name.replace(/[^a-z0-9]/gi, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '')
    formData.workspaceSlug = rawSlug || 'my-workspace'
    checkSlugAvailability(formData.workspaceSlug)
  }

  // Check domain discovery
  try {
    const res = await useAPI<{
      found: boolean
      domain?: string
      organization?: { id: string, name: string, slug: string, logo?: string | null }
    }>('/api/onboarding/discover-domain')

    if (res?.found && res.organization) {
      discoveredCompany.value = res.organization
      formData.joinOrganizationId = res.organization.id
      formData.action = 'join_workspace'
    }
  }
  catch (err) {
    console.warn('Domain discovery check failed:', err)
  }
})

function onUsernameInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  formData.username = val
  checkUsernameAvailability(val)
}

function onSlugInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  formData.workspaceSlug = val
  checkSlugAvailability(val)
}

function onWorkspaceNameInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  formData.workspaceName = val
  // Automatically generate slug if not customized yet
  if (!formData.workspaceSlug || slugAvailable.value === null) {
    const autoSlug = val.replace(/[^a-z0-9]/gi, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (autoSlug) {
      formData.workspaceSlug = autoSlug
      checkSlugAvailability(autoSlug)
    }
  }
}

// Invite Management
function addInvite() {
  if (formData.invites.length < 20) {
    formData.invites.push({ email: '', role: 'member' })
  }
}

function removeInvite(index: number) {
  formData.invites.splice(index, 1)
}

// Step Validation & Navigation
function canProceed(): boolean {
  if (currentStep.value === 1) {
    return Boolean(
      formData.username
      && usernameAvailable.value === true
      && !usernameChecking.value
      && formData.name.trim().length >= 2,
    )
  }
  if (currentStep.value === 2) {
    if (formData.action === 'join_workspace') {
      return Boolean(formData.joinOrganizationId)
    }
    return Boolean(
      formData.workspaceName.trim().length >= 2
      && formData.workspaceSlug.trim().length >= 2
      && slugAvailable.value === true
      && !slugChecking.value,
    )
  }
  return true
}

function nextStep() {
  if (!canProceed())
    return
  submitError.value = ''
  if (currentStep.value < 4) {
    // If user chose to join company workspace, skip step 3 (invite team) straight to ready
    if (currentStep.value === 2 && formData.action === 'join_workspace') {
      currentStep.value = 4
    }
    else {
      currentStep.value++
    }
  }
}

function prevStep() {
  submitError.value = ''
  if (currentStep.value > 1) {
    if (currentStep.value === 4 && formData.action === 'join_workspace') {
      currentStep.value = 2
    }
    else {
      currentStep.value--
    }
  }
}

// Final Submission
async function completeOnboarding() {
  if (isSubmitting.value)
    return

  submitError.value = ''
  isSubmitting.value = true

  try {
    // Filter out empty invites
    const validInvites = formData.invites.filter(i => i.email.trim() && i.email.includes('@'))

    const payload = {
      username: formData.username.trim().toLowerCase(),
      name: formData.name.trim(),
      action: formData.action,
      workspaceName: formData.action === 'create_workspace' ? formData.workspaceName.trim() : undefined,
      workspaceSlug: formData.action === 'create_workspace' ? formData.workspaceSlug.trim().toLowerCase() : undefined,
      teamSize: formData.teamSize,
      invites: validInvites.length > 0 ? validInvites : undefined,
      joinOrganizationId: formData.action === 'join_workspace' ? formData.joinOrganizationId : undefined,
    }

    const response = await useAPI<{
      token: string
      user: { id: string, email: string, name: string, username?: string }
      organization: { id: string, name: string, slug: string }
    }>('/api/onboarding/complete', {
      method: 'POST',
      body: payload,
    })

    if (response.token) {
      setAuthToken(response.token)
      if (response.organization?.id) {
        setActiveOrganizationId(response.organization.id)
      }
      const verifyData = await useAPI<any>('/api/verify')
      setAuthSession(verifyData)
      emit('success')
      await navigateTo('/dashboard')
    }
  }
  catch (err: any) {
    console.error('Onboarding completion failed:', err)
    submitError.value = err.data?.message || err.statusText || 'Failed to complete onboarding'
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Card class="w-full max-w-xl shadow-xl transition-all">
    <!-- Stepper Indicator -->
    <CardHeader class="border-b pb-6">
      <div class="mb-4 flex items-center justify-between">
        <div
          v-for="step in 4"
          :key="step"
          class="flex items-center"
          :class="step < 4 ? 'flex-1' : ''"
        >
          <div
            class="
              flex size-8 shrink-0 items-center justify-center rounded-full
              text-xs font-semibold transition-all
            "
            :class="[
              currentStep === step
                ? `
                  bg-primary text-primary-foreground shadow-sm ring-4
                  ring-primary/15
                `
                : currentStep > step
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground',
            ]"
          >
            <Check v-if="currentStep > step" class="size-4" />
            <span v-else>{{ step }}</span>
          </div>
          <div
            v-if="step < 4"
            class="mx-2 h-0.5 flex-1 transition-colors"
            :class="currentStep > step ? 'bg-primary/30' : 'bg-muted'"
          />
        </div>
      </div>

      <CardTitle class="text-2xl font-bold tracking-tight">
        <span v-if="currentStep === 1">{{ $t('onboarding.step_profile_title') }}</span>
        <span v-else-if="currentStep === 2">{{ $t('onboarding.step_workspace_title') }}</span>
        <span v-else-if="currentStep === 3">{{ $t('onboarding.step_team_title') }}</span>
        <span v-else>{{ $t('onboarding.step_ready_title') }}</span>
      </CardTitle>
      <CardDescription>
        <span v-if="currentStep === 1">{{ $t('onboarding.step_profile_desc') }}</span>
        <span v-else-if="currentStep === 2">{{ $t('onboarding.step_workspace_desc') }}</span>
        <span v-else-if="currentStep === 3">{{ $t('onboarding.step_team_desc') }}</span>
        <span v-else>{{ $t('onboarding.step_ready_desc') }}</span>
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-6 pt-6">
      <Alert v-if="submitError" variant="destructive" role="alert">
        <AlertCircle class="size-4" />
        <AlertTitle>{{ submitError }}</AlertTitle>
      </Alert>

      <!-- STEP 1: Profile & Handle -->
      <div v-if="currentStep === 1" class="space-y-4">
        <div class="space-y-1.5">
          <Label for="onboard-name">{{ $t('onboarding.display_name_label') }}</Label>
          <Input
            id="onboard-name"
            v-model="formData.name"
            placeholder="Jane Doe"
            required
          />
        </div>

        <div class="space-y-1.5">
          <Label for="onboard-username">{{ $t('onboarding.username_label') }}</Label>
          <div class="relative">
            <span
              class="
                absolute inset-y-0 left-3 flex items-center text-sm
                text-muted-foreground
              "
            >@</span>
            <Input
              id="onboard-username"
              class="pl-7"
              :value="formData.username"
              placeholder="jane_doe"
              required
              @input="onUsernameInput"
            />
            <div class="absolute inset-y-0 right-3 flex items-center">
              <Loader2
                v-if="usernameChecking" class="
                  size-4 text-muted-foreground
                  motion-safe:animate-spin
                "
              />
              <Check
                v-else-if="usernameAvailable === true" class="
                  size-4 text-emerald-500
                "
              />
            </div>
          </div>
          <p v-if="usernameError" class="text-xs text-destructive">
            {{ usernameError }}
          </p>
          <p
            v-else-if="usernameAvailable === true" class="
              text-xs text-emerald-500
            "
          >
            {{ $t('onboarding.username_available') }}
          </p>
          <p v-else class="text-xs text-muted-foreground">
            {{ $t('onboarding.username_hint') }}
          </p>
        </div>
      </div>

      <!-- STEP 2: Workspace Setup & Corporate Domain Discovery -->
      <div v-else-if="currentStep === 2" class="space-y-5">
        <!-- Corporate Domain Discovery Card -->
        <div
          v-if="discoveredCompany"
          class="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4"
        >
          <div class="flex items-start gap-3">
            <div
              class="
                flex size-9 shrink-0 items-center justify-center rounded-md
                bg-primary text-primary-foreground shadow-xs
              "
            >
              <Building2 class="size-5" />
            </div>
            <div class="flex-1 text-sm">
              <h4 class="font-semibold text-foreground">
                {{ $t('onboarding.domain_discovery_title') }}
              </h4>
              <p class="text-xs text-muted-foreground">
                {{ $t('onboarding.domain_discovery_desc') }} <strong
                  class="text-foreground"
                >{{ discoveredCompany.name }}</strong>
              </p>
            </div>
          </div>

          <div class="grid gap-2 pt-2">
            <button
              type="button"
              class="
                flex items-center justify-between rounded-md border p-3
                text-left text-sm transition-all
              "
              :class="formData.action === 'join_workspace' ? `
                border-primary bg-primary/10 font-medium
              ` : `
                border-border bg-card
                hover:border-primary/50
              `"
              @click="formData.action = 'join_workspace'"
            >
              <span>{{ $t('onboarding.join_company_workspace', { company: discoveredCompany.name }) }}</span>
              <Check
                v-if="formData.action === 'join_workspace'" class="
                  size-4 text-primary
                "
              />
            </button>

            <button
              type="button"
              class="
                flex items-center justify-between rounded-md border p-3
                text-left text-sm transition-all
              "
              :class="formData.action === 'create_workspace' ? `
                border-primary bg-primary/10 font-medium
              ` : `
                border-border bg-card
                hover:border-primary/50
              `"
              @click="formData.action = 'create_workspace'"
            >
              <span>{{ $t('onboarding.create_own_workspace') }}</span>
              <Check
                v-if="formData.action === 'create_workspace'" class="
                  size-4 text-primary
                "
              />
            </button>
          </div>
        </div>

        <!-- Custom Workspace Creation Fields -->
        <div v-if="formData.action === 'create_workspace'" class="space-y-4">
          <div class="space-y-1.5">
            <Label for="onboard-ws-name">{{ $t('onboarding.workspace_name_label') }}</Label>
            <Input
              id="onboard-ws-name"
              :value="formData.workspaceName"
              placeholder="Acme Technologies"
              required
              @input="onWorkspaceNameInput"
            />
          </div>

          <div class="space-y-1.5">
            <Label for="onboard-ws-slug">{{ $t('onboarding.workspace_slug_label') }}</Label>
            <div class="relative">
              <Input
                id="onboard-ws-slug"
                :value="formData.workspaceSlug"
                placeholder="acme"
                required
                @input="onSlugInput"
              />
              <div class="absolute inset-y-0 right-3 flex items-center">
                <Loader2
                  v-if="slugChecking" class="
                    size-4 text-muted-foreground
                    motion-safe:animate-spin
                  "
                />
                <Check
                  v-else-if="slugAvailable === true" class="
                    size-4 text-emerald-500
                  "
                />
              </div>
            </div>
            <p v-if="slugError" class="text-xs text-destructive">
              {{ slugError }}
            </p>
            <p
              v-else-if="slugAvailable === true" class="
                text-xs text-emerald-500
              "
            >
              {{ $t('onboarding.slug_available') }}
            </p>
          </div>

          <div class="space-y-1.5">
            <Label>{{ $t('onboarding.team_size_label') }}</Label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="
                  flex items-center justify-center rounded-lg border p-2.5
                  text-xs transition-all
                "
                :class="formData.teamSize === 'solo' ? `
                  border-primary bg-primary/10 font-semibold text-foreground
                ` : `
                  border-border text-muted-foreground
                  hover:border-primary/50
                `"
                @click="formData.teamSize = 'solo'"
              >
                {{ $t('onboarding.team_solo') }}
              </button>
              <button
                type="button"
                class="
                  flex items-center justify-center rounded-lg border p-2.5
                  text-xs transition-all
                "
                :class="formData.teamSize === 'small' ? `
                  border-primary bg-primary/10 font-semibold text-foreground
                ` : `
                  border-border text-muted-foreground
                  hover:border-primary/50
                `"
                @click="formData.teamSize = 'small'"
              >
                {{ $t('onboarding.team_small') }}
              </button>
              <button
                type="button"
                class="
                  flex items-center justify-center rounded-lg border p-2.5
                  text-xs transition-all
                "
                :class="formData.teamSize === 'medium' ? `
                  border-primary bg-primary/10 font-semibold text-foreground
                ` : `
                  border-border text-muted-foreground
                  hover:border-primary/50
                `"
                @click="formData.teamSize = 'medium'"
              >
                {{ $t('onboarding.team_medium') }}
              </button>
              <button
                type="button"
                class="
                  flex items-center justify-center rounded-lg border p-2.5
                  text-xs transition-all
                "
                :class="formData.teamSize === 'enterprise' ? `
                  border-primary bg-primary/10 font-semibold text-foreground
                ` : `
                  border-border text-muted-foreground
                  hover:border-primary/50
                `"
                @click="formData.teamSize = 'enterprise'"
              >
                {{ $t('onboarding.team_enterprise') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- STEP 3: Team Collaboration (Invites) -->
      <div v-else-if="currentStep === 3" class="space-y-4">
        <div
          v-if="formData.invites.length === 0" class="
            rounded-lg border border-dashed p-6 text-center
          "
        >
          <Users class="mx-auto size-8 text-muted-foreground/60" />
          <p class="mt-2 text-sm font-medium text-foreground">
            No teammates added yet
          </p>
          <p class="text-xs text-muted-foreground">
            Invite coworkers to collaborate, manage custom domains, and shorten links together.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="mt-3 gap-1.5"
            @click="addInvite"
          >
            <Plus class="size-3.5" />
            {{ $t('onboarding.add_invite') }}
          </Button>
        </div>

        <div v-else class="space-y-2.5">
          <div
            v-for="(invite, idx) in formData.invites"
            :key="idx"
            class="flex items-center gap-2"
          >
            <Input
              v-model="invite.email"
              type="email"
              placeholder="colleague@company.com"
              class="flex-1"
            />
            <select
              v-model="invite.role"
              class="
                h-9 rounded-md border border-input bg-background px-3 text-xs
                font-medium shadow-xs
                focus:ring-2 focus:ring-ring focus:outline-hidden
              "
            >
              <option value="member">
                {{ $t('onboarding.role_member') }}
              </option>
              <option value="admin">
                {{ $t('onboarding.role_admin') }}
              </option>
            </select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="
                size-9 shrink-0 text-muted-foreground
                hover:text-destructive
              "
              @click="removeInvite(idx)"
            >
              <Trash2 class="size-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            class="gap-1.5"
            @click="addInvite"
          >
            <Plus class="size-3.5" />
            {{ $t('onboarding.add_invite') }}
          </Button>
        </div>
      </div>

      <!-- STEP 4: Ready to Launch -->
      <div v-else class="space-y-4 text-center">
        <div
          class="
            mx-auto flex size-14 items-center justify-center rounded-2xl
            bg-emerald-500/10 text-emerald-500 shadow-xs
          "
        >
          <CheckCircle2 class="size-8" />
        </div>

        <div class="space-y-1">
          <h3 class="text-xl font-bold tracking-tight">
            {{ $t('onboarding.step_ready_title') }}
          </h3>
          <p class="text-xs text-muted-foreground">
            {{ $t('onboarding.step_ready_desc') }}
          </p>
        </div>

        <div
          class="grid gap-2 rounded-lg border bg-muted/40 p-4 text-left text-xs"
        >
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Account Handle:</span>
            <span class="font-semibold text-foreground">@{{ formData.username }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Active Workspace:</span>
            <span class="font-semibold text-foreground">
              {{ formData.action === 'join_workspace' ? discoveredCompany?.name : formData.workspaceName }}
            </span>
          </div>
          <div
            v-if="formData.action === 'create_workspace' && formData.invites.length > 0" class="
              flex items-center justify-between
            "
          >
            <span class="text-muted-foreground">Pending Invitations:</span>
            <span class="font-semibold text-foreground">{{ formData.invites.filter(i => i.email.trim()).length }} members</span>
          </div>
        </div>
      </div>
    </CardContent>

    <CardFooter class="flex items-center justify-between border-t pt-4">
      <Button
        v-if="currentStep > 1"
        type="button"
        variant="ghost"
        size="sm"
        class="gap-1"
        :disabled="isSubmitting"
        @click="prevStep"
      >
        <ChevronLeft class="size-4" />
        {{ $t('onboarding.prev_step') }}
      </Button>
      <div v-else />

      <div class="flex items-center gap-2">
        <Button
          v-if="currentStep === 3"
          type="button"
          variant="ghost"
          size="sm"
          @click="nextStep"
        >
          {{ $t('onboarding.skip_step') }}
        </Button>

        <Button
          v-if="currentStep < 4"
          type="button"
          size="sm"
          class="gap-1"
          :disabled="!canProceed()"
          @click="nextStep"
        >
          {{ $t('onboarding.next_step') }}
          <ChevronRight class="size-4" />
        </Button>

        <Button
          v-else
          type="button"
          size="sm"
          class="gap-1.5"
          :disabled="isSubmitting"
          @click="completeOnboarding"
        >
          <Loader2
            v-if="isSubmitting" class="
              size-4
              motion-safe:animate-spin
            "
          />
          <Sparkles v-else class="size-4" />
          {{ $t(isSubmitting ? 'onboarding.completing' : 'onboarding.launch_dashboard') }}
        </Button>
      </div>
    </CardFooter>
  </Card>
</template>
