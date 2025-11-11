import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "ordenes@rematesonlines.mx";

export interface OrderConfirmationData {
  orderId: string;
  email: string;
  customerName?: string;
  items: Array<{
    title: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
  shippingAddress: {
    street1: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface ShipmentNotificationData {
  orderId: string;
  email: string;
  customerName?: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery?: Date;
  trackingUrl?: string;
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmation(data: OrderConfirmationData) {
  if (!process.env.RESEND_API_KEY) {
    console.log("📧 [MOCK] Order confirmation email:", data.email, data.orderId);
    return { success: true, messageId: "mock-" + Date.now() };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `✅ Confirmación de pedido #${data.orderId.slice(-8)}`,
      html: renderOrderConfirmationEmail(data),
    });

    console.log("✅ Order confirmation email sent:", result.id);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error("❌ Failed to send order confirmation:", error);
    throw error;
  }
}

/**
 * Send shipment notification email
 */
export async function sendShipmentNotification(data: ShipmentNotificationData) {
  if (!process.env.RESEND_API_KEY) {
    console.log("📧 [MOCK] Shipment notification email:", data.email, data.trackingNumber);
    return { success: true, messageId: "mock-" + Date.now() };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `📦 Tu pedido #${data.orderId.slice(-8)} está en camino`,
      html: renderShipmentNotificationEmail(data),
    });

    console.log("✅ Shipment notification sent:", result.id);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error("❌ Failed to send shipment notification:", error);
    throw error;
  }
}

/**
 * HTML template for order confirmation
 */
function renderOrderConfirmationEmail(data: OrderConfirmationData): string {
  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
        ${item.title}
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">
        $${item.price.toFixed(2)}
      </td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de pedido</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: #18181b; color: white; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700;">RematesOnlines.mx</h1>
      <p style="margin: 8px 0 0; font-size: 16px; opacity: 0.9;">¡Gracias por tu compra!</p>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px;">
      <h2 style="margin: 0 0 16px; font-size: 20px; color: #18181b;">
        Pedido confirmado #${data.orderId.slice(-8)}
      </h2>

      <p style="margin: 0 0 24px; color: #52525b; line-height: 1.6;">
        ${data.customerName ? `Hola ${data.customerName},` : "Hola,"}<br>
        Tu pedido ha sido confirmado y está siendo preparado para envío.
      </p>

      <!-- Items -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="border-bottom: 2px solid #18181b;">
            <th style="padding: 12px 0; text-align: left; color: #18181b; font-size: 14px;">Producto</th>
            <th style="padding: 12px 0; text-align: center; color: #18181b; font-size: 14px;">Cant.</th>
            <th style="padding: 12px 0; text-align: right; color: #18181b; font-size: 14px;">Precio</th>
          </tr>
        </thead>
        <tbody style="font-size: 14px; color: #52525b;">
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="border-top: 2px solid #e5e5e5; padding-top: 16px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #52525b;">
          <span>Subtotal:</span>
          <span>$${data.subtotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #52525b;">
          <span>Envío:</span>
          <span>$${data.shipping.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: #18181b;">
          <span>Total:</span>
          <span>$${data.total.toFixed(2)} MXN</span>
        </div>
      </div>

      <!-- Shipping Address -->
      <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #18181b;">
          Dirección de envío
        </h3>
        <p style="margin: 0; font-size: 14px; color: #52525b; line-height: 1.6;">
          ${data.shippingAddress.street1}<br>
          ${data.shippingAddress.city}, ${data.shippingAddress.state}<br>
          CP ${data.shippingAddress.zip}
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align: center;">
        <a href="${process.env.NEXTAUTH_URL}/admin" style="display: inline-block; background: #18181b; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Ver detalles del pedido
        </a>
      </div>

      <!-- Info -->
      <p style="margin: 24px 0 0; font-size: 13px; color: #a1a1aa; line-height: 1.6;">
        Recibirás otro email cuando tu pedido sea enviado con el número de rastreo.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e5e5;">
      <p style="margin: 0; font-size: 12px; color: #71717a;">
        RematesOnlines.mx &bull; Electrónicos verificados a precio de remate<br>
        <a href="${process.env.NEXTAUTH_URL}" style="color: #18181b; text-decoration: none;">rematesonlines.mx</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * HTML template for shipment notification
 */
function renderShipmentNotificationEmail(data: ShipmentNotificationData): string {
  const trackingUrl =
    data.trackingUrl ||
    `https://www.google.com/search?q=${data.carrier}+${data.trackingNumber}`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pedido enviado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: #18181b; color: white; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700;">📦 Tu pedido está en camino</h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px;">
      <h2 style="margin: 0 0 16px; font-size: 20px; color: #18181b;">
        Pedido #${data.orderId.slice(-8)} enviado
      </h2>

      <p style="margin: 0 0 24px; color: #52525b; line-height: 1.6;">
        ${data.customerName ? `Hola ${data.customerName},` : "Hola,"}<br>
        ¡Buenas noticias! Tu pedido ha sido enviado y está en camino.
      </p>

      <!-- Tracking Info -->
      <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #71717a; text-transform: uppercase; font-weight: 600;">
          Número de rastreo
        </p>
        <p style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #18181b; letter-spacing: 1px;">
          ${data.trackingNumber}
        </p>
        <p style="margin: 0 0 4px; font-size: 14px; color: #52525b;">
          <strong>Paquetería:</strong> ${data.carrier}
        </p>
        ${
          data.estimatedDelivery
            ? `
        <p style="margin: 0; font-size: 14px; color: #52525b;">
          <strong>Entrega estimada:</strong> ${data.estimatedDelivery.toLocaleDateString("es-MX", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        `
            : ""
        }
      </div>

      <!-- CTA -->
      <div style="text-align: center;">
        <a href="${trackingUrl}" target="_blank" style="display: inline-block; background: #18181b; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-bottom: 16px;">
          Rastrear mi pedido
        </a>
      </div>

      <!-- Timeline -->
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
        <h3 style="margin: 0 0 16px; font-size: 16px; color: #18181b;">¿Qué sigue?</h3>
        <ul style="margin: 0; padding: 0; list-style: none; font-size: 14px; color: #52525b;">
          <li style="margin-bottom: 12px; padding-left: 24px; position: relative;">
            <span style="position: absolute; left: 0; top: 2px;">✅</span>
            Pedido confirmado y pagado
          </li>
          <li style="margin-bottom: 12px; padding-left: 24px; position: relative;">
            <span style="position: absolute; left: 0; top: 2px;">✅</span>
            Paquete en tránsito
          </li>
          <li style="margin-bottom: 12px; padding-left: 24px; position: relative; color: #a1a1aa;">
            <span style="position: absolute; left: 0; top: 2px;">⏳</span>
            Entrega en tu domicilio
          </li>
          <li style="padding-left: 24px; position: relative; color: #a1a1aa;">
            <span style="position: absolute; left: 0; top: 2px;">💬</span>
            Déjanos tu reseña
          </li>
        </ul>
      </div>

      <!-- Support -->
      <p style="margin: 24px 0 0; font-size: 13px; color: #a1a1aa; line-height: 1.6;">
        ¿Tienes alguna pregunta? Responde a este email o contáctanos en
        <a href="mailto:soporte@rematesonlines.mx" style="color: #18181b;">soporte@rematesonlines.mx</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e5e5;">
      <p style="margin: 0; font-size: 12px; color: #71717a;">
        RematesOnlines.mx &bull; Electrónicos verificados a precio de remate<br>
        <a href="${process.env.NEXTAUTH_URL}" style="color: #18181b; text-decoration: none;">rematesonlines.mx</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
