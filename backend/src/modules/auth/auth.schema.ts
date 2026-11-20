import { z } from 'zod';

// Emails are normalized before they reach the service layer: a user who
// signs up as "Rajesh@Spices.In" and later types "rajesh@spices.in" must
// land on the same account. Without this, Postgres compares emails
// case-sensitively and capital-letter logins fail with "Invalid email or
// password".
const emailSchema = z.string().trim().toLowerCase().email();

export const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  companyName: z.string().min(2).max(200),
  companyType: z.enum(['Manufacturer', 'Trader', 'MSME', 'Exporter', 'Distributor', 'Other']),
  industry: z.string().min(2).max(100),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  companyName: z.string().min(2).max(200).optional(),
  companyType: z.enum(['Manufacturer', 'Trader', 'MSME', 'Exporter', 'Distributor', 'Other']).optional(),
  industry: z.string().min(2).max(100).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field required' });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type SignupDto = z.infer<typeof signupSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
