import ky from "ky";

const SKYDROPX_API_URL = "https://api.skydropx.com/v1";

export interface ShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
}

export interface ShippingQuoteRequest {
  zipFrom: string;
  zipTo: string;
  weight: number; // kg
  length: number; // cm
  width: number;  // cm
  height: number; // cm
}

export interface ShippingQuote {
  carrier: string;
  service: string;
  price: number;
  currency: string;
  estimatedDays: number;
  rateId?: string;
}

export interface ShipmentLabelRequest {
  orderId: string;
  rateId?: string;
  carrier?: string;
  addressFrom: ShippingAddress;
  addressTo: ShippingAddress;
  parcel: {
    weight: number;
    length: number;
    width: number;
    height: number;
  };
  insuredAmount?: number;
}

export interface ShipmentLabel {
  trackingNumber: string;
  labelUrl: string;
  carrier: string;
  cost: number;
  estimatedDelivery?: Date;
}

/**
 * Get shipping quotes from Skydropx
 */
export async function getSkydropxQuotes(
  request: ShippingQuoteRequest
): Promise<ShippingQuote[]> {
  const token = process.env.SKYDROPX_TOKEN;

  if (!token) {
    console.warn("SKYDROPX_TOKEN not set, returning mock quotes");
    return getMockQuotes(request);
  }

  try {
    const response = await ky.post(`${SKYDROPX_API_URL}/rates`, {
      headers: {
        Authorization: `Token token=${token}`,
        "Content-Type": "application/json",
      },
      json: {
        zip_from: request.zipFrom,
        zip_to: request.zipTo,
        parcel: {
          weight: request.weight,
          distance_unit: "CM",
          mass_unit: "KG",
          length: request.length,
          width: request.width,
          height: request.height,
        },
      },
      timeout: 10000,
    }).json<any>();

    return (response.data || []).map((rate: any) => ({
      carrier: rate.provider,
      service: rate.service_level_name,
      price: parseFloat(rate.amount_local),
      currency: rate.currency_local,
      estimatedDays: rate.days || 3,
      rateId: rate.id,
    }));
  } catch (error) {
    console.error("Skydropx quotes error:", error);
    return getMockQuotes(request);
  }
}

/**
 * Purchase shipping label from Skydropx
 */
export async function purchaseSkydropxLabel(
  request: ShipmentLabelRequest
): Promise<ShipmentLabel> {
  const token = process.env.SKYDROPX_TOKEN;

  if (!token) {
    console.warn("SKYDROPX_TOKEN not set, returning mock label");
    return getMockLabel(request);
  }

  try {
    const response = await ky.post(`${SKYDROPX_API_URL}/shipments`, {
      headers: {
        Authorization: `Token token=${token}`,
        "Content-Type": "application/json",
      },
      json: {
        rate_id: request.rateId,
        address_from: {
          name: request.addressFrom.name,
          street1: request.addressFrom.street1,
          street2: request.addressFrom.street2,
          city: request.addressFrom.city,
          province: request.addressFrom.state,
          zip: request.addressFrom.zip,
          country: request.addressFrom.country,
          phone: request.addressFrom.phone,
          email: request.addressFrom.email,
        },
        address_to: {
          name: request.addressTo.name,
          street1: request.addressTo.street1,
          street2: request.addressTo.street2,
          city: request.addressTo.city,
          province: request.addressTo.state,
          zip: request.addressTo.zip,
          country: request.addressTo.country,
          phone: request.addressTo.phone,
          email: request.addressTo.email,
        },
        parcels: [{
          weight: request.parcel.weight,
          distance_unit: "CM",
          mass_unit: "KG",
          length: request.parcel.length,
          width: request.parcel.width,
          height: request.parcel.height,
        }],
        consignment_note_class_code: "53131600",
        consignment_note_packaging_code: "1H1",
      },
      timeout: 15000,
    }).json<any>();

    const shipment = response.data;

    return {
      trackingNumber: shipment.tracking_number,
      labelUrl: shipment.label_url,
      carrier: shipment.carrier,
      cost: parseFloat(shipment.total_pricing),
      estimatedDelivery: shipment.estimated_delivery
        ? new Date(shipment.estimated_delivery)
        : undefined,
    };
  } catch (error) {
    console.error("Skydropx label purchase error:", error);
    throw new Error(`Failed to purchase shipping label: ${error}`);
  }
}

/**
 * Mock quotes for development without Skydropx token
 */
function getMockQuotes(request: ShippingQuoteRequest): ShippingQuote[] {
  const basePrice = 79;
  const weightMultiplier = request.weight > 2 ? request.weight * 10 : 0;

  return [
    {
      carrier: "99minutos",
      service: "express",
      price: basePrice + weightMultiplier,
      currency: "MXN",
      estimatedDays: 1,
      rateId: "mock-99min-" + Date.now(),
    },
    {
      carrier: "DHL",
      service: "standard",
      price: basePrice + 50 + weightMultiplier,
      currency: "MXN",
      estimatedDays: 2,
      rateId: "mock-dhl-" + Date.now(),
    },
    {
      carrier: "Estafeta",
      service: "standard",
      price: basePrice + 30 + weightMultiplier,
      currency: "MXN",
      estimatedDays: 3,
      rateId: "mock-estafeta-" + Date.now(),
    },
  ];
}

/**
 * Mock label for development
 */
function getMockLabel(request: ShipmentLabelRequest): ShipmentLabel {
  const trackingNumber = "MOCK" + Date.now().toString().slice(-10);

  return {
    trackingNumber,
    labelUrl: `https://placehold.co/400x600/png?text=Label+${trackingNumber}`,
    carrier: request.carrier || "99minutos",
    cost: 79,
    estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  };
}

/**
 * Get warehouse "from" address
 * TODO: Move to DB config
 */
export function getWarehouseAddress(): ShippingAddress {
  return {
    name: "RematesOnlines Warehouse",
    street1: "Av. Insurgentes Sur 123",
    street2: "Col. Del Valle",
    city: "Ciudad de México",
    state: "CDMX",
    zip: "03100",
    country: "MX",
    phone: "5512345678",
    email: "warehouse@rematesonlines.mx",
  };
}
