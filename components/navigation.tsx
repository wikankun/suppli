"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, QrCode, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Search",
      href: "/",
      icon: <Home className="h-5 w-5 mr-2" />,
    },
    {
      label: "Shelf",
      href: "/list",
      icon: <List className="h-5 w-5 mr-2" />,
    },
    {
      label: "Sync",
      href: "/sync",
      icon: <QrCode className="h-5 w-5 mr-2" />,
    },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex h-12 items-center justify-between px-4 md:justify-center md:space-x-4 md:hidden">
        {/* Left spacer to balance the burger icon on the right */}
        <div className="w-[40px] md:hidden" />
  
        {/* App Title (mobile on the left now) */}
        <div className="font-bold text-2xl text-center flex-1 md:hidden">Suppli</div>

        {/* Desktop title stays centered */}
        {/* <div className="hidden md:block font-bold text-lg">Suppli</div> */}

        {/* Mobile Burger Menu (now on the right) */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={pathname === item.href ? "default" : "ghost"}
                      className="w-full justify-start"
                    >
                      {item.icon}
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>


      {/* Desktop Navigation */}
      <div className="hidden md:block">
        <div className="flex items-center justify-center space-x-4 py-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname === item.href ? "default" : "ghost"}
                size="sm"
                className="flex items-center space-x-2"
              >
                {item.icon}
                <span>{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
