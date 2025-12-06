import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import EncryptionService from '@/lib/encryption';
import { StockItem, Category } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blobFilename, items, categories, deviceId, syncToken } = body;

    if (!blobFilename || !items || !categories || !syncToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create sync data
    const syncData = {
      items,
      categories,
      lastModified: Date.now(),
      deviceId,
    };

    // Encrypt data with sync token
    const encrypted = await EncryptionService.encrypt(syncData, syncToken);

    // Upload to Vercel Blob
    const blob = await put(blobFilename, JSON.stringify(encrypted), {
      access: 'public',
      allowOverwrite: true,
    });

    if (blob.url) {
      return NextResponse.json({
        success: true,
        message: 'Data uploaded successfully',
        uploadedAt: Date.now(),
      });
    }

    return NextResponse.json(
      { error: 'Failed to upload to blob' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
