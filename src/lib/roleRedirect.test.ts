/**
 * Run: npx --yes tsx src/lib/roleRedirect.test.ts
 */
import assert from 'node:assert/strict';
import {
  normalizeUserType,
  roleFromRecord,
  sanitizePostAuthRedirect,
  resolvePostLoginDestination,
  needsCompleteProfileUser,
  mapWebPathToExpo,
} from './roleRedirect';

function main() {
  assert.equal(normalizeUserType('customer'), 'customer');
  assert.equal(normalizeUserType('VENDOR'), 'vendor');
  assert.equal(normalizeUserType('transporter'), 'transporter');
  assert.equal(normalizeUserType('admin'), 'admin');
  assert.equal(normalizeUserType('unknown_label'), 'customer');
  assert.equal(normalizeUserType('logistics_provider'), 'transporter');
  assert.equal(normalizeUserType('LOGISTICS'), 'transporter');

  assert.equal(roleFromRecord({ user_type: 'transporter', type: 'user' }), 'transporter');
  assert.equal(roleFromRecord({ type: 'user' }), undefined);
  assert.equal(roleFromRecord({ role: 'user' }), undefined);
  assert.equal(roleFromRecord({ user_role: 'member' }), undefined);
  assert.equal(roleFromRecord({ account_type: 'personal', user_type: 'transporter' }), 'transporter');
  assert.equal(roleFromRecord({ account_type: 'personal' }), undefined);

  assert.equal(roleFromRecord({ user_type: 'vendor', type: 'user' }), 'vendor');
  assert.equal(roleFromRecord({ type: 'seller' }), 'seller');
  assert.equal(roleFromRecord({ account_type: 'business' }), undefined);
  assert.equal(normalizeUserType('shop_owner'), 'vendor');
  assert.equal(normalizeUserType('retailer'), 'vendor');

  assert.equal(mapWebPathToExpo('/shop'), '/(tabs)');
  assert.equal(sanitizePostAuthRedirect('/shop'), '/(tabs)');
  assert.equal(sanitizePostAuthRedirect('https://evil.com'), null);
  assert.equal(sanitizePostAuthRedirect('/checkout'), '/checkout');
  assert.equal(sanitizePostAuthRedirect('/'), null);

  assert.equal(
    resolvePostLoginDestination({
      user: { user_type: 'vendor' },
      returnUrl: '/checkout',
    }),
    '/checkout'
  );

  assert.equal(
    resolvePostLoginDestination({
      user: { user_type: 'vendor' },
      next: '/(tabs)/cart',
    }),
    '/(tabs)/cart'
  );

  assert.equal(
    resolvePostLoginDestination({
      user: { user_type: 'vendor' },
    }),
    '/(vendor)/dashboard'
  );

  assert.equal(
    resolvePostLoginDestination({
      user: { user_type: 'transporter' },
    }),
    '/(transporter)/dashboard'
  );

  assert.equal(
    resolvePostLoginDestination({
      user: { user_type: 'admin' },
    }),
    '/(admin)'
  );

  assert.equal(
    resolvePostLoginDestination({
      user: { user_type: 'customer' },
    }),
    '/(tabs)'
  );

  assert.equal(needsCompleteProfileUser({}), true);
  assert.equal(needsCompleteProfileUser({ user_type: '' }), true);
  assert.equal(needsCompleteProfileUser({ user_type: 'customer' }), false);

  // returnUrl wins over role
  assert.equal(
    resolvePostLoginDestination({
      user: { user_type: 'admin' },
      returnUrl: '/(tabs)',
    }),
    '/(tabs)'
  );

  // eslint-disable-next-line no-console
  console.log('roleRedirect tests passed');
}

main();
