import { CheckoutScreen } from "../_components/checkout-screen";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_session_token?: string }>;
}) {
  const params = await searchParams;
  return <CheckoutScreen customerSessionToken={params?.customer_session_token ?? null} />;
}
