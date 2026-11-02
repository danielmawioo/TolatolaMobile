import { buildNavigationMapHtml } from '@/src/lib/navigationMapHtml';

describe('buildNavigationMapHtml', () => {
  const baseConfig = {
    styleUrl: 'mapbox://styles/mapbox/navigation-day-v1',
    route: [
      { latitude: -6.8, longitude: 39.2 },
      { latitude: -6.7, longitude: 39.3 },
    ],
    driver: { latitude: -6.79, longitude: 39.21, heading: 45 },
    pickup: { latitude: -6.8, longitude: 39.2, name: 'Kariakoo Shop' },
    dropoff: { latitude: -6.75, longitude: 39.25, name: 'Asha' },
    activeTarget: 'pickup' as const,
    productWithDriver: false,
    follow: true,
  };

  it('renders a Mapbox map when a public token is configured', () => {
    const html = buildNavigationMapHtml({ ...baseConfig, accessToken: 'pk.test-token' });

    expect(html).toContain('mapbox-gl-js');
    expect(html).toContain('mapbox://styles/mapbox/navigation-day-v1');
    expect(html).toContain('pk.test-token');
    expect(html).toContain('initMapbox');
    expect(html).toContain('tola-route-casing');
    expect(html).toContain('Kariakoo Shop');
    expect(html).toContain('-6.75');
    expect(html).toContain('39.25');
  });

  it('falls back to Leaflet/OpenStreetMap without a token', () => {
    const html = buildNavigationMapHtml({ ...baseConfig, accessToken: null });

    expect(html).toContain('initLeaflet');
    expect(html).toContain('unpkg.com/leaflet');
    expect(html).toContain('tile.openstreetmap.org');
    expect(html).toContain("if (CONFIG.accessToken) initMapbox();\n        else initLeaflet();");
  });

  it('exposes a state bridge so React Native can stream GPS updates', () => {
    const html = buildNavigationMapHtml({ ...baseConfig, accessToken: null });

    expect(html).toContain('window.__tolaSetState');
    expect(html).toContain("window.ReactNativeWebView.postMessage");
    expect(html).toContain('followChanged');
  });

  it('escapes embedded markup so destination names cannot break out of the script', () => {
    const html = buildNavigationMapHtml({
      ...baseConfig,
      accessToken: 'pk.test-token',
      pickup: {
        latitude: -6.8,
        longitude: 39.2,
        name: '</script><script>alert("xss")</script>',
      },
    });

    expect(html).not.toContain('</script><script>alert');
    expect(html).toContain('\\u003c/script>');
  });

  it('uses the drop-off route colour when that leg is active', () => {
    const html = buildNavigationMapHtml({
      ...baseConfig,
      accessToken: null,
      activeTarget: 'dropoff',
    });

    expect(html).toContain("state.activeTarget === 'dropoff' ? '#7c3aed' : '#0284c7'");
  });
});
