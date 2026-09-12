import accountDelete from '../server/api/account/delete.js';
import adminPaymentAction from '../server/api/admin-payment-action.js';
import adminPayments from '../server/api/admin-payments.js';
import automationStatus from '../server/api/automation/status.js';
import automationTestDelivery from '../server/api/automation/test-delivery.js';
import billingCancel from '../server/api/billing/cancel.js';
import billingChangePlan from '../server/api/billing/change-plan.js';
import billingCreateSubscription from '../server/api/billing/create-subscription.js';
import billingStatus from '../server/api/billing/status.js';
import billingSync from '../server/api/billing/sync.js';
import billingVerifyPayment from '../server/api/billing/verify-payment.js';
import billingWebhook from '../server/api/billing/webhook.js';
import clientError from '../server/api/client-error.js';
import cronAutomations from '../server/api/cron/automations.js';
import health from '../server/api/health.js';
import manualPayment from '../server/api/manual-payment.js';
import teamAccept from '../server/api/team/accept.js';
import teamInvite from '../server/api/team/invite.js';
import teamList from '../server/api/team/list.js';
import teamRemove from '../server/api/team/remove.js';
import teamRevokeInvite from '../server/api/team/revoke-invite.js';
import teamUpdate from '../server/api/team/update.js';
import upiConfig from '../server/api/upi-config.js';

const handlers = Object.freeze({
  'account/delete': accountDelete,
  'admin-payment-action': adminPaymentAction,
  'admin-payments': adminPayments,
  'automation/status': automationStatus,
  'automation/test-delivery': automationTestDelivery,
  'billing/cancel': billingCancel,
  'billing/change-plan': billingChangePlan,
  'billing/create-subscription': billingCreateSubscription,
  'billing/status': billingStatus,
  'billing/sync': billingSync,
  'billing/verify-payment': billingVerifyPayment,
  'billing/webhook': billingWebhook,
  'client-error': clientError,
  'create-subscription': billingCreateSubscription,
  'cron/automations': cronAutomations,
  'health': health,
  'manual-payment': manualPayment,
  'team/accept': teamAccept,
  'team/invite': teamInvite,
  'team/list': teamList,
  'team/remove': teamRemove,
  'team/revoke-invite': teamRevokeInvite,
  'team/update': teamUpdate,
  'upi-config': upiConfig,
  'verify-payment': billingVerifyPayment
});

export default async function router(req, res) {
  const raw = Array.isArray(req.query?.route) ? req.query.route.join('/') : String(req.query?.route || '');
  const route = raw.replace(/^\/+|\/+$/g, '');
  const handler = handlers[route];
  if (!handler) {
    res.statusCode = 404;
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({error: 'API route not found'}));
  }
  try {
    return await handler(req, res);
  } catch (error) {
    console.error('Salesventory API router failure', {route, message: error?.message || String(error)});
    if (res.headersSent) return;
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({error: 'Internal server error'}));
  }
}
