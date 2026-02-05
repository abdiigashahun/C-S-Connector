import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-md px-2 py-1 transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-amber-400 via-amber-500 to-orange-500 text-sm font-bold text-neutral-900 shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:scale-105 group-hover:shadow-md">
            SC
          </span>
          <span className="sr-only">ShopConnect</span>
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
