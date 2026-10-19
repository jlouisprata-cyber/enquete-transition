"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, LogOut } from "lucide-react";

export function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "La connexion a échoué.");
        return;
      }
      setPassword("");
      router.refresh();
    } catch {
      setError("Connexion interrompue. Réessayez dans quelques instants.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={login} className="admin-login profile-form">
      <label>
        Mot de passe administrateur
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          maxLength={1024}
          disabled={!configured || busy}
        />
      </label>
      {!configured && (
        <p className="error-message" role="alert">
          L’accès administrateur n’est pas encore configuré.
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <button
        className="button primary"
        disabled={!configured || busy}
        type="submit"
      >
        {busy ? "Connexion…" : "Se connecter"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}

export function AdminControls() {
  const router = useRouter();
  const [busy, setBusy] = useState<"export" | "logout" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function download() {
    setBusy("export");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/export", { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) router.refresh();
        throw new Error(data.error || "L’export a échoué.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `enquete-transitions-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("L’export complet a été téléchargé.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Connexion interrompue. Réessayez.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    setBusy("logout");
    setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) throw new Error("La déconnexion a échoué. Réessayez.");
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Connexion interrompue. Réessayez.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-controls">
      <div className="admin-buttons">
        <button className="button primary" disabled={!!busy} onClick={download}>
          <Download size={17} />
          {busy === "export"
            ? "Préparation de l’export…"
            : "Exporter toutes les données (CSV)"}
        </button>
        <button className="button secondary" disabled={!!busy} onClick={logout}>
          <LogOut size={16} />
          {busy === "logout" ? "Déconnexion…" : "Se déconnecter"}
        </button>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <p className="admin-status" role="status">
        {message}
      </p>
    </div>
  );
}
