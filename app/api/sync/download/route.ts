import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import EncryptionService from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blobFilename, syncToken } = body;

    if (!blobFilename || !syncToken) {
      return NextResponse.json(
        { error: 'Missing blobFilename or syncToken' },
        { status: 400 }
      );
    }

    // Find the blob
    const blobs = await list({ prefix: blobFilename });

    if (blobs.blobs.length === 0) {
      return NextResponse.json(
        { error: 'No data found' },
        { status: 404 }
      );
    }

    // Download and decrypt
    const response = await fetch(blobs.blobs[0].url);
    const encryptedData = await response.json();

    const result = await EncryptionService.decrypt(
      encryptedData.encryptedData,
      syncToken,
      encryptedData.iv,
      encryptedData.salt
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        lastModified: blobs.blobs[0].uploadedAt,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to decrypt data' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const blobFilename = searchParams.get('blobFilename');

    if (!blobFilename) {
      return NextResponse.json(
        { error: 'blobFilename is required' },
        { status: 400 }
      );
    }

    // Check if blob exists
    const blobs = await list({ prefix: blobFilename });

    if (blobs.blobs.length === 0) {
      return NextResponse.json({
        success: true,
        exists: false,
      });
    }

    return NextResponse.json({
      success: true,
      exists: true,
      lastModified: blobs.blobs[0].uploadedAt,
    });
  } catch (error) {
    console.error('Check error:', error);
    return NextResponse.json(
      { error: 'Check failed' },
      { status: 500 }
    );
  }
}