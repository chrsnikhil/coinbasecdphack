import { NextResponse } from 'next/server';

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, fileSize } = body;

    if (!name || !type || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', new Blob([], { type }), name);

    // Upload file directly to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        'pinata_api_key': PINATA_API_KEY!,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY!
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Pinata API error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file to IPFS' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Pinata API response:', data);

    if (!data.IpfsHash) {
      console.error('No IPFS hash in Pinata response:', data);
      return NextResponse.json(
        { error: 'Invalid response from Pinata API' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: `https://pink-fantastic-cod-307.mypinata.cloud/ipfs/${data.IpfsHash}`,
      gateway: 'https://pink-fantastic-cod-307.mypinata.cloud',
      ipfsHash: data.IpfsHash
    });
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 