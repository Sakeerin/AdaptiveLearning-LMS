import { z } from 'zod';
import { BilingualTextSchema } from './user';

export const BadgeCriteriaSchema = z.object({
  type: z.enum(['streak', 'xp', 'quiz', 'lesson', 'tutor']),
  threshold: z.number(),
});
export type BadgeCriteria = z.infer<typeof BadgeCriteriaSchema>;

export const BadgeSchema = z.object({
  _id: z.string(),
  code: z.string(),
  name: BilingualTextSchema,
  description: BilingualTextSchema,
  icon: z.string(), // URL or icon name
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  criteria: BadgeCriteriaSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Badge = z.infer<typeof BadgeSchema>;

export const QuestTaskSchema = z.object({
  type: z.enum(['lesson_complete', 'quiz_attempt', 'quiz_pass', 'streak', 'tutor_chat']),
  target: z.number(),
  progress: z.number().default(0),
});
export type QuestTask = z.infer<typeof QuestTaskSchema>;

export const QuestRewardSchema = z.object({
  xp: z.number(),
  badgeId: z.string().optional(),
});
export type QuestReward = z.infer<typeof QuestRewardSchema>;

export const QuestSchema = z.object({
  _id: z.string(),
  code: z.string(),
  title: BilingualTextSchema,
  description: BilingualTextSchema,
  tasks: z.array(QuestTaskSchema),
  reward: QuestRewardSchema,
  expiresAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Quest = z.infer<typeof QuestSchema>;

export const StreakSchema = z.object({
  count: z.number().default(0),
  lastActiveDate: z.string(), // ISO date string
});
export type Streak = z.infer<typeof StreakSchema>;

export const EarnedBadgeSchema = z.object({
  badgeId: z.string(),
  earnedAt: z.date(),
});
export type EarnedBadge = z.infer<typeof EarnedBadgeSchema>;

export const ActiveQuestSchema = z.object({
  questId: z.string(),
  progress: z.number(),
  completedAt: z.date().optional(),
});
export type ActiveQuest = z.infer<typeof ActiveQuestSchema>;

export const GamificationProfileSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  xp: z.number().default(0),
  level: z.number().default(1),
  streak: StreakSchema,
  badges: z.array(EarnedBadgeSchema).default([]),
  quests: z.array(ActiveQuestSchema).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type GamificationProfile = z.infer<typeof GamificationProfileSchema>;

// XP sources and caps
export const XP_SOURCES = {
  lesson_complete: 50,
  quiz_attempt: 20, // capped at 3/day
  quiz_perfect: 30,
  streak_day: 10,
  challenge_quest: 100,
} as const;

export const XP_DAILY_CAPS = {
  quiz_attempt: 3,
} as const;

export const XP_COOLDOWN_MS = 60000; // 1 minute

// XP calculation
export function calculateLevel(xp: number): number {
  // XP curve: level = floor(sqrt(xp / 100))
  return Math.floor(Math.sqrt(xp / 100));
}

export const XPEventSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  action: z.enum([
    'lesson_complete',
    'quiz_attempt',
    'quiz_perfect',
    'streak_day',
    'challenge_quest',
  ]),
  xp: z.number(),
  metadata: z.record(z.string(), z.any()).optional(),
  date: z.string(), // ISO date string (YYYY-MM-DD)
  timestamp: z.date(),
});
export type XPEvent = z.infer<typeof XPEventSchema>;
