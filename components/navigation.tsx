"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex h-16 items-center justify-center px-4">
        {/* Desktop Navigation */}
        <div className="hidden md:block">
          <div className="flex items-center justify-center space-x-4 py-2">
            <Link href="/">
              <Button
                variant={pathname === "/" ? "default" : "ghost"}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Home className="h-4 w-4" />
                <span>Search</span>
              </Button>
            </Link>
            <Link href="/list">
              <Button
                variant={pathname === "/list" ? "default" : "ghost"}
                size="sm"
                className="flex items-center space-x-2"
              >
                <List className="h-4 w-4" />
                <span>List</span>
              </Button>
            </Link>
            <Link href="/sync">
              <Button
                variant={pathname === "/sync" ? "default" : "ghost"}
                size="sm"
                className="flex items-center space-x-2"
              >
                <QrCode className="h-4 w-4" />
                <span>Sync</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden">
        <div className="flex items-center justify-around">
          <Link href="/" className="flex-1">
            <Button
              variant={pathname === "/" ? "default" : "ghost"}
              size="lg"
              className="w-full flex flex-row items-center space-y-1 h-16 rounded-none"
            >
              <Home className="h-5 w-5" />
              <span className="text-xs">Search</span>
            </Button>
          </Link>
          <Link href="/list" className="flex-1">
            <Button
              variant={pathname === "/list" ? "default" : "ghost"}
              size="lg"
              className="w-full flex flex-row items-center space-y-1 h-16 rounded-none"
            >
              <List className="h-5 w-5" />
              <span className="text-xs">List</span>
            </Button>
          </Link>
          <Link href="/sync" className="flex-1">
            <Button
              variant={pathname === "/sync" ? "default" : "ghost"}
              size="lg"
              className="w-full flex flex-row items-center space-y-1 h-16 rounded-none"
            >
              <QrCode className="h-5 w-5" />
              <span className="text-xs">Sync</span>
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
