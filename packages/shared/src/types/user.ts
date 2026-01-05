import { z } from 'zod';

export const UserRoleSchema = z.enum(['learner', 'author', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const LanguageSchema = z.enum(['th', 'en']);
export type Language = z.infer<typeof LanguageSchema>;

export const BilingualTextSchema = z.object({
  th: z.string(),
  en: z.string(),
});
export type BilingualText = z.infer<typeof BilingualTextSchema>;

export const UserProfileSchema = z.object({
  displayName: z.string(),
  language: LanguageSchema,
  timezone: z.string(),
  learningGoals: z.string().optional(),
  initialSkillLevel: z.number().min(1).max(5).optional(),
  dailyTimeBudgetMinutes: z.number().default(30),
  dailyReminderEnabled: z.boolean().default(true),
  leaderboardOptIn: z.boolean().default(false),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const DeviceSessionSchema = z.object({
  deviceId: z.string(),
  platform: z.enum(['web', 'ios', 'android']),
  lastActive: z.date(),
  pushToken: z.string().optional(),
  token: z.string(),
});
export type DeviceSession = z.infer<typeof DeviceSessionSchema>;

export const UserSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  role: UserRoleSchema,
  profile: UserProfileSchema,
  sessions: z.array(DeviceSessionSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

// Auth DTOs
export const RegisterDTOSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string(),
  language: LanguageSchema,
});
export type RegisterDTO = z.infer<typeof RegisterDTOSchema>;

export const LoginDTOSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  deviceId: z.string(),
  platform: z.enum(['web', 'ios', 'android']),
});
export type LoginDTO = z.infer<typeof LoginDTOSchema>;

export const VerifyOTPDTOSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  deviceId: z.string(),
  platform: z.enum(['web', 'ios', 'android']),
});
export type VerifyOTPDTO = z.infer<typeof VerifyOTPDTOSchema>;
