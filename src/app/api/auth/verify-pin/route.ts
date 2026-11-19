import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    const serverPin = process.env.APP_ACCESS_PIN;

    // If no PIN is configured on server, open access is allowed
    if (!serverPin || serverPin.trim() === '') {
      return NextResponse.json({ success: true, message: 'No PIN configured' });
    }

    if (pin === serverPin) {
      return NextResponse.json({ success: true, message: 'PIN valid' });
    } else {
      return NextResponse.json(
        { success: false, message: 'PIN salah. Silakan coba lagi.' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
