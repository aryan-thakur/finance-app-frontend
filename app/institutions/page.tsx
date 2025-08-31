"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Institution = {
  id: string;
  name: string;
  kind: string | null;
  logo_url?: string | null;
};

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/institutions", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to load institutions");
      }
      const data = await res.json();
      setInstitutions(data || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    const prev = institutions;
    setInstitutions((list) => list.filter((i) => i.id !== id));
    const res = await fetch(`/api/institutions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      // revert on failure
      setInstitutions(prev);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Institutions</h1>
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button>New Institution</Button>
            </DialogTrigger>
            <NewInstitutionForm
              onClose={() => setNewOpen(false)}
              onCreated={(inst) => setInstitutions((l) => [inst, ...l])}
            />
          </Dialog>
        </header>

        {error && (
          <p className="text-red-600 mb-4" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading institutions…</p>
        ) : institutions.length === 0 ? (
          <p className="text-muted-foreground">No institutions found.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {institutions.map((inst) => (
              <Card
                key={inst.id}
                className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.666rem)]"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {inst.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={inst.logo_url}
                        alt={inst.name}
                        className="h-20 w-20 object-contain rounded"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded bg-muted" />
                    )}
                    <div>
                      <div className="text-lg">{inst.name}</div>
                      <div className="text-md text-muted-foreground">
                        {inst.kind || "—"}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent></CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Dialog
                    open={editOpen && editing?.id === inst.id}
                    onOpenChange={(o) => {
                      if (!o) setEditing(null);
                      setEditOpen(o);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(inst);
                          setEditOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </DialogTrigger>
                    {editing && editing.id === inst.id && (
                      <EditInstitutionForm
                        institution={editing}
                        onClose={() => {
                          setEditOpen(false);
                          setEditing(null);
                        }}
                        onUpdated={(updated) =>
                          setInstitutions((list) =>
                            list.map((i) => (i.id === updated.id ? updated : i))
                          )
                        }
                      />
                    )}
                  </Dialog>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(inst.id)}
                  >
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function NewInstitutionForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (inst: Institution) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : ""),
    [file]
  );

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("name", name);
      if (kind) form.append("kind", kind);
      if (file) form.append("logo", file);
      const res = await fetch("/api/institutions", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      onCreated(data);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md w-[95vw] max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>New Institution</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kind">Kind</Label>
          <Input
            id="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            placeholder="bank, broker, card…"
          />
        </div>
        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="preview"
                className="h-12 w-12 object-contain rounded bg-muted"
              />
            ) : (
              <div className="h-12 w-12 rounded bg-muted" />
            )}
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

function EditInstitutionForm({
  institution,
  onClose,
  onUpdated,
}: {
  institution: Institution;
  onClose: () => void;
  onUpdated: (inst: Institution) => void;
}) {
  const [name, setName] = useState(institution.name || "");
  const [kind, setKind] = useState(institution.kind || "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const current = institution.logo_url || "";
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : current),
    [file, current]
  );

  useEffect(() => {
    return () => {
      if (file && preview && preview !== current) URL.revokeObjectURL(preview);
    };
  }, [file, preview, current]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const form = new FormData();
      if (name !== institution.name) form.append("name", name);
      if (kind !== (institution.kind || "")) form.append("kind", kind);
      if (file) form.append("logo", file);
      const res = await fetch(`/api/institutions/${institution.id}`, {
        method: "PATCH",
        body: form,
      });
      if (!res.ok) throw new Error("Failed to update");
      const data = await res.json();
      onUpdated(data);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md w-[95vw] max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Institution</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kind">Kind</Label>
          <Input
            id="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="logo"
                className="h-12 w-12 object-contain rounded bg-muted"
              />
            ) : (
              <div className="h-12 w-12 rounded bg-muted" />
            )}
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
