import { z } from 'zod';

/**
 * Normalized route shape returned by the Tola API (`GET /maps/route`) or
 * built client-side from Mapbox Directions. Keeping one shape means the map,
 * turn-card and ETA code never has to know which provider produced the route.
 */

export const NavigationPointSchema = z
  .object({
    latitude: z.number().finite(),
    longitude: z.number().finite(),
  })
  .passthrough();

export const NavigationStepSchema = z
  .object({
    instruction: z.string().min(1),
    maneuver: z.string().nullish(),
    modifier: z.string().nullish(),
    distanceMeters: z.number().nonnegative(),
    durationSeconds: z.number().nonnegative(),
    location: NavigationPointSchema.nullish(),
  })
  .passthrough();

export const NavigationRouteSchema = z
  .object({
    provider: z.enum(['mapbox', 'google', 'fallback']).default('fallback'),
    coordinates: z.array(NavigationPointSchema).default([]),
    distanceMeters: z.number().nonnegative().default(0),
    durationSeconds: z.number().nonnegative().default(0),
    distanceText: z.string().default('—'),
    durationText: z.string().default('—'),
    steps: z.array(NavigationStepSchema).default([]),
  })
  .passthrough();

export type NavigationPoint = z.infer<typeof NavigationPointSchema>;
export type NavigationStep = z.infer<typeof NavigationStepSchema>;
export type NavigationRoute = z.infer<typeof NavigationRouteSchema>;

export type NavigationTarget = 'pickup' | 'dropoff';
