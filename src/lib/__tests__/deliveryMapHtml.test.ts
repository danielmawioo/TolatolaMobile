import { buildDeliveryLeafletHtml } from '@/src/lib/deliveryMapHtml';

describe('buildDeliveryLeafletHtml', () => {
  const route = [
    { latitude: -6.8, longitude: 39.2 },
    { latitude: -6.7, longitude: 39.3 },
  ];

  it('embeds the route, shop, customer, and driver', () => {
    const html = buildDeliveryLeafletHtml(
      { latitude: -6.79, longitude: 39.21 },
      -6.8,
      39.2,
      'Kariakoo Shop',
      -6.75,
      39.25,
      'Asha',
      route,
      false,
    );

    expect(html).toContain('leaflet');
    expect(html).toContain('[-6.8,39.2]');
    expect(html).toContain('Kariakoo Shop');
    expect(html).toContain('Asha');
    expect(html).toContain('#0284c7');
    expect(html).toContain('-6.79');
  });

  it('uses the customer route color when heading to the customer and escapes names', () => {
    const html = buildDeliveryLeafletHtml(
      null,
      -6.8,
      39.2,
      'Shop "A"',
      -6.7,
      39.2,
      "O'Neil",
      [],
      true,
    );

    expect(html).toContain('#7c3aed');
    expect(html).toContain(JSON.stringify('Shop "A"'));
    expect(html).toContain(JSON.stringify("O'Neil"));
  });
});
