import {
  bearingDegrees,
  defaultTargetForStatus,
  formatDistanceText,
  formatDurationText,
  getNextNavigationStep,
  getProductPosition,
  getRouteProgress,
  haversineMeters,
  maneuverIcon,
  productPositionDescription,
  productPositionLabel,
} from '@/src/lib/navigation';
import type { NavigationRoute } from '@/src/schemas/navigation';

const route: NavigationRoute = {
  provider: 'mapbox',
  coordinates: [
    { latitude: -6.8, longitude: 39.2 },
    { latitude: -6.775, longitude: 39.2 },
    { latitude: -6.75, longitude: 39.2 },
    { latitude: -6.725, longitude: 39.2 },
    { latitude: -6.7, longitude: 39.2 },
  ],
  distanceMeters: 11_100,
  durationSeconds: 1_200,
  distanceText: '11.1 km',
  durationText: '20 min',
  steps: [
    {
      instruction: 'Head out on Msimbazi Street',
      maneuver: 'depart',
      modifier: null,
      distanceMeters: 5_500,
      durationSeconds: 600,
      location: { latitude: -6.8, longitude: 39.2 },
    },
    {
      instruction: 'Turn left onto Morogoro Road',
      maneuver: 'turn',
      modifier: 'left',
      distanceMeters: 5_600,
      durationSeconds: 600,
      location: { latitude: -6.75, longitude: 39.2 },
    },
    {
      instruction: 'You have arrived',
      maneuver: 'arrive',
      modifier: null,
      distanceMeters: 0,
      durationSeconds: 0,
      location: { latitude: -6.7, longitude: 39.2 },
    },
  ],
};

describe('navigation math', () => {
  it('measures great-circle distance in metres', () => {
    const metres = haversineMeters(
      { latitude: -6.8, longitude: 39.2 },
      { latitude: -6.8, longitude: 39.3 },
    );
    // One hundredth of a degree of longitude at ~6.8°S.
    expect(metres).toBeGreaterThan(11_000);
    expect(metres).toBeLessThan(11_200);
    expect(haversineMeters({ latitude: -6.8, longitude: 39.2 }, { latitude: -6.8, longitude: 39.2 })).toBe(0);
  });

  it('computes compass bearings', () => {
    expect(
      Math.round(bearingDegrees({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })),
    ).toBe(0);
    expect(
      Math.round(bearingDegrees({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })),
    ).toBe(90);
    expect(
      Math.round(bearingDegrees({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: -1 })),
    ).toBe(270);
  });

  describe('getRouteProgress', () => {
    it('reports half the route remaining at the midpoint', () => {
      const progress = getRouteProgress(route, { latitude: -6.75, longitude: 39.2 });

      expect(progress.nearestIndex).toBe(2);
      expect(progress.fractionComplete).toBeCloseTo(0.5, 1);
      expect(progress.remainingMeters).toBeGreaterThan(4_000);
      expect(progress.remainingMeters).toBeLessThan(7_000);
      expect(progress.remainingSeconds).toBeGreaterThan(400);
      expect(progress.remainingSeconds).toBeLessThan(800);
    });

    it('returns the full route when there is no driver fix yet', () => {
      const progress = getRouteProgress(route, null);
      expect(progress.remainingMeters).toBe(route.distanceMeters);
      expect(progress.remainingSeconds).toBe(route.durationSeconds);
      expect(progress.fractionComplete).toBe(0);
    });

    it('handles a missing route without throwing', () => {
      const progress = getRouteProgress(null, { latitude: -6.75, longitude: 39.2 });
      expect(progress.remainingMeters).toBe(0);
      expect(progress.fractionComplete).toBe(0);
    });
  });

  describe('getNextNavigationStep', () => {
    it('skips the depart step and returns the next manoeuvre', () => {
      const next = getNextNavigationStep(route, { latitude: -6.8, longitude: 39.2 });

      expect(next?.step.instruction).toBe('Turn left onto Morogoro Road');
      expect(next?.routeIndex).toBe(2);
      expect(next?.distanceToStepMeters).toBeGreaterThan(4_000);
    });

    it('advances to the arrival step once the driver is past the turn', () => {
      const next = getNextNavigationStep(route, { latitude: -6.72, longitude: 39.2 });
      expect(next?.step.instruction).toBe('You have arrived');
    });

    it('returns null without a route, steps or driver', () => {
      expect(getNextNavigationStep(null, { latitude: -6.8, longitude: 39.2 })).toBeNull();
      expect(getNextNavigationStep(route, null)).toBeNull();
      expect(
        getNextNavigationStep({ ...route, steps: [] }, { latitude: -6.8, longitude: 39.2 }),
      ).toBeNull();
    });
  });
});

describe('maneuverIcon', () => {
  it('maps manoeuvre types to FontAwesome names', () => {
    const step = (maneuver: string | null, modifier: string | null = null) => ({
      instruction: 'x',
      maneuver,
      modifier,
      distanceMeters: 0,
      durationSeconds: 0,
      location: null,
    });

    expect(maneuverIcon(null)).toBe('location-arrow');
    expect(maneuverIcon(step('arrive'))).toBe('flag-checkered');
    expect(maneuverIcon(step('turn', 'left'))).toBe('arrow-left');
    expect(maneuverIcon(step('turn', 'right'))).toBe('arrow-right');
    expect(maneuverIcon(step('roundabout'))).toBe('refresh');
    expect(maneuverIcon(step('uturn'))).toBe('undo');
    expect(maneuverIcon(step('turn'))).toBe('arrow-up');
  });
});

describe('product position', () => {
  it('derives where the package is from the assignment status', () => {
    expect(getProductPosition('assigned')).toBe('at_pickup');
    expect(getProductPosition('ready_for_pickup')).toBe('at_pickup');
    expect(getProductPosition('picked_up')).toBe('with_driver');
    expect(getProductPosition('in_transit')).toBe('with_driver');
    expect(getProductPosition('delivered')).toBe('delivered');
    expect(getProductPosition(undefined)).toBe('unknown');
  });

  it('labels and explains each position', () => {
    expect(productPositionLabel('with_driver')).toBe('With you');
    expect(productPositionLabel('unknown')).toBe('Status unavailable');
    expect(productPositionDescription('at_pickup')).toContain('pickup point');
    expect(productPositionDescription('delivered')).toContain('complete');
  });

  it('picks the default navigation leg from the status', () => {
    expect(defaultTargetForStatus('accepted')).toBe('pickup');
    expect(defaultTargetForStatus('assigned')).toBe('pickup');
    expect(defaultTargetForStatus('picked_up')).toBe('dropoff');
    expect(defaultTargetForStatus('in_transit')).toBe('dropoff');
    expect(defaultTargetForStatus(null)).toBe('pickup');
  });
});

describe('formatting', () => {
  it('formats distances', () => {
    expect(formatDistanceText(0)).toBe('0 m');
    expect(formatDistanceText(850)).toBe('850 m');
    expect(formatDistanceText(1_500)).toBe('1.5 km');
  });

  it('formats durations', () => {
    expect(formatDurationText(0)).toBe('0 min');
    expect(formatDurationText(20)).toBe('<1 min');
    expect(formatDurationText(90)).toBe('2 min');
    expect(formatDurationText(3_600)).toBe('1 hr');
    expect(formatDurationText(3_900)).toBe('1 hr 5 min');
  });
});
