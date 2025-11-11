import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  const { zip, weight } = await req.json();
  return NextResponse.json({
    carriers: [
      { name: "99minutos", price: 79, etaDays: 1 },
      { name: "DHL", price: 129, etaDays: 2 }
    ],
    input: { zip, weight }
  });
}
