// Публичный entrypoint пакета @vendor/identity.
export { identityApi, type AuthUser } from './api';
export { FormField } from './components/FormField';
export { LoginForm } from './components/LoginForm';
export { ProfileForm } from './components/ProfileForm';
export { RecoveryForm } from './components/RecoveryForm';
export { RegisterForm } from './components/RegisterForm';
export { IdentityProvider, useApiClient, useAuth } from './hooks/useAuth';
export {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type ProfileInput,
  type RegisterInput,
  type ResetPasswordInput,
} from './schemas/auth';
