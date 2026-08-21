<script setup lang="ts">
import { KeyRound, Mail, UserPlus } from '@lucide/vue'

const props = withDefaults(defineProps<{
  initialTab?: 'login' | 'register' | 'token'
}>(), {
  initialTab: 'login',
})

const activeTab = shallowRef<'login' | 'register' | 'token'>(props.initialTab)
const forgotModalOpen = shallowRef(false)
</script>

<template>
  <Card class="w-full max-w-md shadow-lg">
    <CardHeader class="space-y-1.5 pb-4 text-center">
      <div
        class="
          mx-auto mb-1 flex size-10 items-center justify-center rounded-xl
          bg-primary text-primary-foreground shadow-sm
        "
      >
        <span class="text-lg font-bold tracking-wider">S</span>
      </div>
      <CardTitle class="text-2xl font-bold tracking-tight">
        {{ activeTab === 'register' ? $t('register.title') : $t('login.title') }}
      </CardTitle>
      <CardDescription>
        {{ activeTab === 'register' ? $t('register.description') : $t('login.description') }}
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="login" class="flex items-center gap-1.5 text-xs">
            <Mail class="size-3.5" />
            <span>{{ $t('login.email_tab') }}</span>
          </TabsTrigger>
          <TabsTrigger
            value="register" class="flex items-center gap-1.5 text-xs"
          >
            <UserPlus class="size-3.5" />
            <span>{{ $t('login.sign_up') }}</span>
          </TabsTrigger>
          <TabsTrigger value="token" class="flex items-center gap-1.5 text-xs">
            <KeyRound class="size-3.5" />
            <span>{{ $t('login.site_token_tab') }}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login" class="pt-4">
          <AuthLoginForm @open-forgot="forgotModalOpen = true" />
        </TabsContent>

        <TabsContent value="register" class="pt-4">
          <AuthRegisterForm />
        </TabsContent>

        <TabsContent value="token" class="pt-4">
          <AuthSiteTokenForm />
        </TabsContent>
      </Tabs>
    </CardContent>

    <CardFooter
      class="
        flex flex-col border-t pt-4 text-center text-xs text-muted-foreground
      "
    >
      <p v-if="activeTab === 'login'">
        {{ $t('login.need_account') }}
        <button
          type="button"
          class="
            font-medium text-foreground underline underline-offset-4
            hover:text-primary
          "
          @click="activeTab = 'register'"
        >
          {{ $t('login.sign_up') }}
        </button>
      </p>
      <p v-else-if="activeTab === 'register'">
        {{ $t('register.have_account') }}
        <button
          type="button"
          class="
            font-medium text-foreground underline underline-offset-4
            hover:text-primary
          "
          @click="activeTab = 'login'"
        >
          {{ $t('register.log_in') }}
        </button>
      </p>
      <p v-else>
        {{ $t('login.root_admin') }} &bull; Sink Self-Hosted
      </p>
    </CardFooter>

    <AuthForgotPasswordModal v-model:open="forgotModalOpen" />
  </Card>
</template>
