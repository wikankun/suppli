'use client';

import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { useSimpleSync } from '@/contexts/sync-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  QrCode,
  Link,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface SimpleQRProps {
  children?: React.ReactNode;
  trigger?: React.ReactNode;
  mode?: 'generate' | 'join';
}

export function SimpleQR({ children, trigger, mode = 'generate' }: SimpleQRProps) {
  const {
    syncToken,
    generateSync,
    joinSync,
    syncInProgress,
  } = useSimpleSync();

  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleGenerateQR = async () => {
    await generateSync();
  };

  const handleCopyToken = async () => {
    if (syncToken) {
      try {
        await navigator.clipboard.writeText(syncToken);
        setCopied(true);
        toast.success('Token copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy token');
      }
    }
  };

  const handleJoinSync = async () => {
    if (!token.trim()) {
      toast.error('Please enter a sync token');
      return;
    }

    setJoining(true);
    const success = await joinSync(token.trim());

    if (success) {
      setToken('');
      setOpen(false);
    }

    setJoining(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <QrCode className="h-4 w-4" />
            {children || (mode === 'generate' ? 'Generate Sync' : 'Join Sync')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {mode === 'generate' ? 'Generate Sync' : 'Join Sync'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'generate'
              ? 'Generate a sync token to share your inventory across devices'
              : 'Enter a sync token to join an existing sync group'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={mode} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="join" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Join
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Generate Sync Token</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  {syncToken ? (
                    <>
                      <div className="p-4 bg-white rounded-lg border">
                        <QRCode
                          value={syncToken}
                          size={200}
                          level="M"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Scan this QR code or copy the token below
                      </p>
                      <div className="w-full space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="sync-token">Sync Token:</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyToken}
                            className="ml-auto"
                          >
                            {copied ? (
                              <>
                                <Check className="mr-2 h-3 w-3" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="mr-2 h-3 w-3" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                        <Input
                          id="sync-token"
                          value={syncToken}
                          readOnly
                          className="font-mono text-xs"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="w-full text-center space-y-4">
                      <QrCode className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click the button below to generate a sync token
                      </p>
                      <Button
                        onClick={handleGenerateQR}
                        disabled={syncInProgress}
                        className="w-full"
                      >
                        {syncInProgress ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          'Generate Sync Token'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Join Sync</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="join-token">Sync Token:</Label>
                  <Input
                    id="join-token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter sync token from another device"
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can get this token by generating a sync on another device
                  </p>
                </div>
                <Button
                  onClick={handleJoinSync}
                  disabled={joining || !token.trim() || syncInProgress}
                  className="w-full"
                >
                  {joining ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Sync'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
