import fetch from 'node-fetch';
import { config } from '../config';

const BASE_URL = config.sslcommerz.isLive
  ? 'https://securepay.sslcommerz.com'
  : 'https://sandbox.sslcommerz.com';

interface InitiatePaymentInput {
  tranId: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

interface SSLCommerzInitResponse {
  status: string;
  GatewayPageURL?: string;
  failedreason?: string;
  [key: string]: unknown;
}

export const initiatePayment = async (
  input: InitiatePaymentInput,
): Promise<SSLCommerzInitResponse> => {
  const payload = new URLSearchParams({
    store_id: config.sslcommerz.storeId,
    store_passwd: config.sslcommerz.storePassword,
    total_amount: String(input.amount),
    currency: input.currency,
    tran_id: input.tranId,
    success_url: config.sslcommerz.successUrl,
    fail_url: config.sslcommerz.failUrl,
    cancel_url: config.sslcommerz.cancelUrl,
    ipn_url: config.sslcommerz.ipnUrl,
    shipping_method: 'NO',
    product_name: 'Subscription Plan',
    product_category: 'Service',
    product_profile: 'general',
    cus_name: input.customerName,
    cus_email: input.customerEmail,
    cus_add1: 'N/A',
    cus_city: 'Dhaka',
    cus_country: 'Bangladesh',
    cus_phone: input.customerPhone || '01700000000',
    ship_name: input.customerName,
    ship_add1: 'N/A',
    ship_city: 'Dhaka',
    ship_country: 'Bangladesh',
    ship_postcode: '1000',
  });

  const response = await fetch(`${BASE_URL}/gwprocess/v4/api.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload,
  });

  return (await response.json()) as SSLCommerzInitResponse;
};

export const validatePayment = async (valId: string) => {
  const params = new URLSearchParams({
    val_id: valId,
    store_id: config.sslcommerz.storeId,
    store_passwd: config.sslcommerz.storePassword,
    format: 'json',
  });

  const response = await fetch(
    `${BASE_URL}/validator/api/validationserverAPI.php?${params.toString()}`,
  );

  return (await response.json()) as {
    status: string;
    tran_id: string;
    amount: string;
    currency: string;
    [key: string]: unknown;
  };
};
