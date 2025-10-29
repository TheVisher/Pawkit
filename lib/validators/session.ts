import { z } from "zod";

/**
 * Session heartbeat validation schema
 * Used for POST /api/sessions/heartbeat
 */
export const sessionHeartbeatSchema = z.object({
  deviceId: z
    .string()
    .min(1, "Device ID is required")
    .max(255, "Device ID must be 255 characters or less"),
  deviceName: z
    .string()
    .min(1, "Device name is required")
    .max(200, "Device name must be 200 characters or less"),
  browser: z
    .string()
    .max(100, "Browser name must be 100 characters or less")
    .optional()
    .nullable(),
  os: z
    .string()
    .max(100, "OS name must be 100 characters or less")
    .optional()
    .nullable(),
});

export type SessionHeartbeatInput = z.infer<typeof sessionHeartbeatSchema>;
