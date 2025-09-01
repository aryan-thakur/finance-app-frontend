"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";

export function AppNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-12 items-center justify-between px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[80vw] sm:max-w-xs p-0 flex flex-col"
          >
            <SheetHeader className="p-4">
              <SheetTitle>Navigate</SheetTitle>
            </SheetHeader>
            <nav className="flex-1 px-4 py-2 space-y-1">
              <Link href="/accounts" className="block rounded px-3 py-2 hover:bg-accent" onClick={() => setOpen(false)}>Accounts</Link>
              <Link href="/institutions" className="block rounded px-3 py-2 hover:bg-accent" onClick={() => setOpen(false)}>Institutions</Link>
              <Link href="/transactions" className="block rounded px-3 py-2 hover:bg-accent" onClick={() => setOpen(false)}>Transactions</Link>
            </nav>
            <SheetFooter className="p-4">
              <Button asChild variant="destructive" className="w-full">
                <a href="/api/logout" onClick={() => setOpen(false)}>Log out</a>
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <div className="text-sm text-muted-foreground">Finance App</div>
        <div className="w-10" />
      </div>
    </div>
  );
}
