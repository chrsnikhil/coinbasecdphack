import { NextResponse } from 'next/server';
import { PinataSDK } from 'pinata';

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT as string,
  pinataGateway: process.env.PINATA_GATEWAY as string,
});

export async function POST(request: Request) {
  try {
    const { name, type } = await request.json();

    if (!name || !type) {
      return NextResponse.json({ error: 'File name and type are required.' }, { status: 400 });
    }

    // Create a presigned URL for direct upload
    const presignedUrl = await pinata.upload.public.createSignedURL({
      expires: 300, // URL valid for 300 seconds (5 minutes)
      name,
      mimeTypes: [type],
    });

    if (!presignedUrl) {
      throw new Error('Failed to generate presigned URL');
    }

    console.log('Generated presigned URL:', presignedUrl);

    return NextResponse.json({ url: presignedUrl });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate presigned URL.' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      'Allow': 'POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
} 