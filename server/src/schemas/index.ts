import { z } from 'zod';
import { BUILDING_IDS, FOCUS_KEYS } from '@shared';

export const registerSchema = z.object({
  email: z.string().email('Некорректный email').max(120),
  password: z.string().min(8, 'Пароль должен быть не короче 8 символов').max(128),
});

export const loginSchema = registerSchema;

const focusValue = z.number().int().min(0).max(100);

export const createCivilizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Имя цивилизации: минимум 3 символа')
    .max(40, 'Имя цивилизации: максимум 40 символов'),
  constants: z.object({
    scienceFocus: focusValue,
    expansionFocus: focusValue,
    secrecy: focusValue,
    aggression: focusValue,
    diplomacyFocus: focusValue,
    riskLevel: focusValue,
  }),
});

export const upgradeBuildingSchema = z.object({
  buildingType: z.enum(BUILDING_IDS as unknown as [string, ...string[]]),
});

export const exploreSchema = z.object({
  expeditionType: z.enum(['localScan', 'probeSurvey', 'deepExpedition', 'rift4D']),
});

export const grantResourcesSchema = z.object({
  highEnergy: z.number().int().min(0).max(50_000_000).optional(),
  antimatter: z.number().int().min(0).max(50_000_000).optional(),
  darkEnergy: z.number().int().min(0).max(50_000_000).optional(),
  darkMatter: z.number().int().min(0).max(50_000_000).optional(),
  fermions: z.number().int().min(0).max(50_000_000).optional(),
});

export const debugArtifactSchema = z.object({
  artifactKey: z.string().min(1).max(64).optional(),
});

export const debugLevelSchema = z.object({
  level: z.number().int().min(1).max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCivilizationInput = z.infer<typeof createCivilizationSchema>;
export type UpgradeBuildingInput = z.infer<typeof upgradeBuildingSchema>;
export type GrantResourcesInput = z.infer<typeof grantResourcesSchema>;

void FOCUS_KEYS;
