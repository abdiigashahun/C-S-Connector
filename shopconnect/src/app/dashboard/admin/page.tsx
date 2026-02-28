"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getAuthSessionUser } from "@/lib/auth-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type OwnerRow = {
  email: string;
  addedAt: string | null;
  ownerUpdatedAt: string | null;
  paymentStatus: "pending" | "paid" | "overdue";
  paymentNote: string;
  isActive: boolean;
  controlUpdatedAt: string | null;
};

type OwnerDraft = {
  paymentStatus: "pending" | "paid" | "overdue";
  paymentNote: string;
  isActive: boolean;
};

export default function AdminOwnersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, OwnerDraft>>({});
  const [savingEmail, setSavingEmail] = useState<string | null>(null);
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [addingOwner, setAddingOwner] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  const loadOwners = async (normalizedEmail: string) => {
    const response = await fetch(
      `/api/admin/owners?adminEmail=${encodeURIComponent(normalizedEmail)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (response.status === 403) {
      setError("You are not allowed to open admin controls.");
      setLoading(false);
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Failed to load owner records.");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { data?: OwnerRow[] };
    const rows = payload.data ?? [];

    setOwners(rows);
    setDrafts(
      rows.reduce<Record<string, OwnerDraft>>((acc, row) => {
        acc[row.email] = {
          paymentStatus: row.paymentStatus,
          paymentNote: row.paymentNote ?? "",
          isActive: row.isActive,
        };
        return acc;
      }, {})
    );
    setLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      setError(null);
      const session = await authClient.getSession();
      const user = getAuthSessionUser(session);

      if (!user?.email) {
        router.replace("/login");
        return;
      }

      const normalizedEmail = user.email.toLowerCase();
      setAdminEmail(normalizedEmail);

      await loadOwners(normalizedEmail);
    };

    load();
  }, [router]);

  const counts = useMemo(() => {
    const total = owners.length;
    const active = owners.filter((owner) => owner.isActive).length;
    const pendingPayment = owners.filter(
      (owner) => owner.paymentStatus !== "paid"
    ).length;

    return { total, active, pendingPayment };
  }, [owners]);

  const updateDraft = (email: string, value: Partial<OwnerDraft>) => {
    setDrafts((current) => ({
      ...current,
      [email]: {
        paymentStatus: current[email]?.paymentStatus ?? "pending",
        paymentNote: current[email]?.paymentNote ?? "",
        isActive: current[email]?.isActive ?? true,
        ...value,
      },
    }));
  };

  const handleSave = async (ownerEmail: string) => {
    const draft = drafts[ownerEmail];
    if (!draft || !adminEmail) {
      return;
    }

    setSavingEmail(ownerEmail);
    setError(null);

    const response = await fetch("/api/admin/owners", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminEmail,
        ownerEmail,
        paymentStatus: draft.paymentStatus,
        paymentNote: draft.paymentNote,
        isActive: draft.isActive,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? `Failed to save controls for ${ownerEmail}.`);
      setSavingEmail(null);
      return;
    }

    setOwners((current) =>
      current.map((row) =>
        row.email === ownerEmail
          ? {
              ...row,
              paymentStatus: draft.paymentStatus,
              paymentNote: draft.paymentNote,
              isActive: draft.isActive,
              controlUpdatedAt: new Date().toISOString(),
            }
          : row
      )
    );

    setSavingEmail(null);
  };

  const handleAddOwner = async () => {
    const normalizedOwnerEmail = newOwnerEmail.trim().toLowerCase();
    if (!adminEmail || !normalizedOwnerEmail) {
      return;
    }

    setAddingOwner(true);
    setError(null);

    const response = await fetch("/api/admin/owners", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminEmail,
        ownerEmail: normalizedOwnerEmail,
        paymentStatus: "pending",
        paymentNote: "",
        isActive: true,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Failed to add owner email.");
      setAddingOwner(false);
      return;
    }

    setNewOwnerEmail("");
    await loadOwners(adminEmail);
    setAddingOwner(false);
  };

  const handleRemoveOwner = async (ownerEmail: string) => {
    if (!adminEmail) {
      return;
    }

    setRemovingEmail(ownerEmail);
    setError(null);

    const response = await fetch("/api/admin/owners", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminEmail,
        ownerEmail,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? `Failed to remove ${ownerEmail}.`);
      setRemovingEmail(null);
      return;
    }

    setOwners((current) => current.filter((owner) => owner.email !== ownerEmail));
    setRemovingEmail(null);
  };

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Controls</h1>
          <p className="text-sm text-muted-foreground">
            Manage shop owner access and payment status.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>Back</Button>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total owners</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{counts.total}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active owners</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{counts.active}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending / overdue payments</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {counts.pendingPayment}
          </CardContent>
        </Card>
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Loading owners...</p> : null}
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Add owner email</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="email"
            placeholder="owner@example.com"
            value={newOwnerEmail}
            onChange={(event) => setNewOwnerEmail(event.target.value)}
          />
          <Button onClick={handleAddOwner} disabled={addingOwner}>
            {addingOwner ? "Adding..." : "Add owner"}
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-4">
        {owners.map((owner) => {
          const draft = drafts[owner.email] ?? {
            paymentStatus: owner.paymentStatus,
            paymentNote: owner.paymentNote,
            isActive: owner.isActive,
          };

          return (
            <Card key={owner.email}>
              <CardHeader>
                <CardTitle className="text-base">{owner.email}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Payment status</p>
                    <Select
                      value={draft.paymentStatus}
                      onValueChange={(value) =>
                        updateDraft(owner.email, {
                          paymentStatus: value as OwnerDraft["paymentStatus"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Access</p>
                    <Select
                      value={draft.isActive ? "active" : "disabled"}
                      onValueChange={(value) =>
                        updateDraft(owner.email, {
                          isActive: value === "active",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select access" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p>Added: {owner.addedAt ? new Date(owner.addedAt).toLocaleString() : "-"}</p>
                    <p>Owner updated: {owner.ownerUpdatedAt ? new Date(owner.ownerUpdatedAt).toLocaleString() : "-"}</p>
                    <p>Control updated: {owner.controlUpdatedAt ? new Date(owner.controlUpdatedAt).toLocaleString() : "-"}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Payment note</p>
                  <Textarea
                    value={draft.paymentNote}
                    onChange={(event) =>
                      updateDraft(owner.email, { paymentNote: event.target.value })
                    }
                    placeholder="Add note (invoice, due date, transaction info)"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleSave(owner.email)}
                    disabled={savingEmail === owner.email}
                  >
                    {savingEmail === owner.email ? "Saving..." : "Save controls"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRemoveOwner(owner.email)}
                    disabled={removingEmail === owner.email}
                  >
                    {removingEmail === owner.email ? "Removing..." : "Remove owner"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
