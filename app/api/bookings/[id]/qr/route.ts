import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { generateQRDataUrl } from "@/lib/utils/qr";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req);
  if (authResult.response) return authResult.response;

  const { id } = await params;
  const { searchParams } = req.nextUrl;
  const segmentDate = searchParams.get("date") ?? "";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  // QR code points to public check-in page with booking ID and date
  const qrData = `${baseUrl}/attendance/${id}?date=${segmentDate}`;

  const qrDataUrl = await generateQRDataUrl(qrData);

  return NextResponse.json({ success: true, data: { qr: qrDataUrl, url: qrData } });
}
