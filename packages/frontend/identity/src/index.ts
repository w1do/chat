// Публичный entrypoint пакета @vendor/identity.
export { identityApi, type AuthUser, type ProfileImage } from './api';
export { Field } from './components/Field';
export { EmailForm } from './components/EmailForm';
export { PasswordForm } from './components/PasswordForm';
export { SubmitButton } from './components/SubmitButton';
export { LoginForm } from './components/LoginForm';
export { ProfileForm } from './components/ProfileForm';
export { RecoveryForm } from './components/RecoveryForm';
export { RegisterForm } from './components/RegisterForm';
export { IdentityProvider, useApiClient, useAuth } from './hooks/useAuth';
export { useAvatars, useProfileImageActions } from './hooks/useProfileImages';
export { AvatarPicker } from './components/AvatarPicker';
export { WallpaperPicker } from './components/WallpaperPicker';
export {
  emailSchema,
  passwordChangeSchema,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  type EmailInput,
  type PasswordChangeInput,
  type ForgotPasswordInput,
  type LoginInput,
  type ProfileInput,
  type RegisterInput,
  type ResetPasswordInput,
} from './schemas/auth';
