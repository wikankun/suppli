# Auto Sync Setup Guide

This document explains how to set up and use the automatic sync feature for your Suppli inventory management app.

## Overview

The auto sync feature allows you to synchronize your inventory data across multiple devices using Vercel Blob storage with end-to-end encryption.

## Features

- **Automatic Sync**: Syncs every 15 minutes when online
- **QR Code Pairing**: Easy device connection via QR codes
- **Encryption**: All data encrypted at rest using AES-GCM
- **Conflict Resolution**: Automatic and manual conflict handling
- **Offline Support**: Works offline and syncs when back online
- **Web Interface**: Browser-based sync management

## Setup Instructions

### 1. Vercel Blob Configuration

1. Go to your Vercel dashboard
2. Navigate to your project
3. Go to Storage tab
4. Add Vercel Blob storage
5. Generate a read/write token
6. Add the token to your environment variables:

```bash
# Create .env.local file
cp .env.local.example .env.local

# Edit .env.local and add your token
BLOB_READ_WRITE_TOKEN=BLOB_READ_WRITE_TOKEN_...
```

### 2. Initial Sync Setup

1. Open the app on your primary device
2. Navigate to the Sync page
3. Click "Add Device" in the Auto Sync section
4. Choose your pairing method:
   - **QR Code**: Scan with your other device's camera
   - **Pairing Code**: Copy the URL or code to your other device

### 3. Pairing Additional Devices

For each additional device:

1. Install and open the app
2. Go to the Sync page
3. Click "Join Sync Group"
4. Enter the pairing code or scan the QR code
5. The device will automatically sync

## Usage

### Automatic Sync

- Sync runs automatically every 15 minutes when online
- Status is shown in the navigation bar
- Green dot = synced, Orange dot = needs sync, Gray dot = offline

### Manual Sync

1. Click the sync button in the navigation bar
2. Or go to Sync page and click "Sync Now"

### QR Code Pairing

1. Click "Add Device" on the primary device
2. Choose "QR Code" tab
3. Scan with your other device
4. Devices will be paired and start syncing

### Pairing Code

1. Click "Add Device" on the primary device
2. Copy the pairing URL or code
3. On the secondary device, go to Sync page
4. Click "Join Sync Group" and paste the code

### Manual Import/Export

For one-time transfers or backups:

1. Go to Sync page
2. Switch to "Manual Sync" tab
3. Generate export code
4. Copy or download the file
5. Import on the other device

## Security

### Encryption

- All data is encrypted using AES-GCM encryption
- Keys are derived from device IDs and user secrets
- Data is encrypted before upload to Vercel Blob

### Privacy

- No personal data stored without encryption
- Device-based access control
- Tokens expire after 24 hours for pairing

### Data Integrity

- Checksums verify data integrity
- Conflict detection and resolution
- Audit trail through sync history

## Troubleshooting

### Sync Not Working

1. Check internet connection
2. Verify Vercel Blob token is configured
3. Try manual sync
4. Check browser console for errors

### Device Not Pairing

1. Ensure QR code is scanned within 24 hours
2. Check pairing code is entered correctly
3. Verify both devices are online
4. Try generating a new QR code

### Conflicts

1. Conflicts are resolved automatically using "last write wins"
2. Manual conflict resolution dialog will appear if needed
3. Choose which version to keep for each conflict

### Leaving Sync Group

1. Go to Sync page
2. Click "Leave Sync Group"
3. Confirm your decision
4. Local data remains, only sync connection is removed

## API Endpoints

The sync feature uses these internal API endpoints:

- `POST /api/sync/upload` - Upload encrypted data
- `GET/POST /api/sync/download` - Download encrypted data
- `GET/POST /api/sync/pair` - Generate pairing tokens
- `GET/POST /api/sync/status` - Get sync status

## File Structure

```
suppli/
├── lib/
│   ├── database.ts          # Extended with sync methods
│   ├── sync-service.ts      # Core sync logic
│   ├── encryption.ts        # Encryption utilities
│   └── device-manager.ts    # Device management
├── contexts/
│   └── sync-context.tsx     # Sync state management
├── components/sync/
│   ├── sync-button.tsx      # Sync button UI
│   ├── sync-status.tsx      # Status display
│   ├── qr-pair.tsx          # QR code pairing
│   └── conflict-dialog.tsx  # Conflict resolution
└── app/api/sync/
    ├── upload/route.ts      # Upload endpoint
    ├── download/route.ts    # Download endpoint
    ├── pair/route.ts        # Pairing endpoint
    └── status/route.ts      # Status endpoint
```

## Best Practices

1. **Regular Backups**: Use manual export for additional backups
2. **Test Before Production**: Test with sample data first
3. **Monitor Storage**: Check Vercel Blob usage regularly
4. **Keep Updated**: Update app versions consistently across devices
5. **Secure Tokens**: Never share your BLOB_READ_WRITE_TOKEN

## Limitations

- Maximum file size: Vercel Blob limits apply
- Sync interval: 15 minutes minimum (configurable in code)
- Device limit: No hard limit, but performance may degrade with many devices
- Offline duration: Changes queue locally until online again

## Support

For issues or questions:

1. Check the browser console for error messages
2. Verify all setup steps are completed
3. Test with a single device first
4. Check Vercel Blob storage status

## Future Enhancements

Planned improvements:

- Real-time sync using WebSockets
- More granular conflict resolution
- Device management UI
- Sync analytics and history
- Custom sync intervals
- End-to-end encryption with user passwords