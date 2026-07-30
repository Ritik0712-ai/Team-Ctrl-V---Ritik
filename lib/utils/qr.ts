import QRCode from "qrcode";

export async function generateQRDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 256,
    margin: 2,
    color: {
      dark: "#1e3a5f",
      light: "#ffffff",
    },
  });
}

export function generateAttendanceUrl(bookingId: string, segmentDate: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/attendance/${bookingId}?date=${segmentDate}`;
}
