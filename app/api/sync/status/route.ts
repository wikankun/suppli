import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import SimpleSyncService from '@/lib/sync-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const blobFilename = searchParams.get('blobFilename');

    const syncConfig = SimpleSyncService.getSyncConfig();

    if (!syncConfig) {
      return NextResponse.json({
        success: true,
        isConfigured: false,
        message: 'Sync is not configured',
      });
    }

    // Check for remote data
    let hasRemoteData = false;
    let lastRemoteSync: number | undefined;

    try {
      const blobs = await list({
        prefix: syncConfig.blobFilename,
      });

      if (blobs.blobs.length > 0) {
        hasRemoteData = true;
        lastRemoteSync = blobs.blobs[0].uploadedAt;
      }
    } catch (error) {
      console.error('Failed to check remote data:', error);
    }

    return NextResponse.json({
      success: true,
      isConfigured: true,
      syncToken: syncConfig.token,
      blobFilename: syncConfig.blobFilename,
      hasRemoteData,
      lastRemoteSync,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'reset':
        // Clear sync configuration
        SimpleSyncService.clearSyncConfig();
        return NextResponse.json({
          success: true,
          message: 'Sync configuration cleared successfully',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Status action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}