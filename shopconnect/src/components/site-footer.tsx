import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t bg-background/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground md:flex-row">
        <p>© {year} ShopConnect. All rights reserved.</p>
        <div className="flex items-center gap-4">
         
        </div>
      </div>
    </footer>
  );
}
