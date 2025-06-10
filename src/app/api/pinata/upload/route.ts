import { NextResponse } from 'next/server';
import FormData from 'form-data';
import axios from 'axios';

// Validate Pinata API keys
function validatePinataKeys() {
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('Pinata API keys are not configured. Please check your environment variables.');
  }

  return { apiKey, secretKey };
}

export async function POST(request: Request) {
  try {
    // Validate API keys first
    const { apiKey, secretKey } = validatePinataKeys();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create form data for Pinata
    const pinataFormData = new FormData();
    pinataFormData.append('file', buffer, {
      filename: file.name,
      contentType: file.type,
    });

    // Add metadata
    pinataFormData.append('pinataMetadata', JSON.stringify({
      name: file.name,
      keyvalues: {
        type: file.type,
        size: file.size,
      }
    }));

    // Upload to Pinata
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      pinataFormData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'pinata_api_key': apiKey,
          'pinata_secret_api_key': secretKey,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const { IpfsHash } = response.data;
    if (!IpfsHash) {
      throw new Error('No IPFS hash received from Pinata');
    }

    return NextResponse.json({ 
      ipfsHash: IpfsHash,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${IpfsHash}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return NextResponse.json(
          { error: 'Invalid Pinata API credentials' },
          { status: 401 }
        );
      }
      if (error.response?.status === 413) {
        return NextResponse.json(
          { error: 'File size too large' },
          { status: 413 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
} 