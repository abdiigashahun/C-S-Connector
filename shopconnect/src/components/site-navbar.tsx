import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-wide md:text-base">
          ShopConnect
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild size="sm" variant="ghost">
            <Link href="/#discover">Discover</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/#featured">Featured</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/#latest-products">Products</Link>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
