"use client";

import { useRef, useTransition } from "react";
import { publicarPost } from "./actions";

export default function Composer() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="card"
      style={{ marginBottom: 24 }}
      action={(fd) =>
        startTransition(async () => {
          await publicarPost(fd);
          formRef.current?.reset();
        })
      }
    >
      <div className="campo" style={{ marginBottom: 12 }}>
        <textarea
          name="texto"
          rows={3}
          placeholder="Compartilhe um avanço, uma dúvida ou uma descoberta…"
          required
          maxLength={3000}
        />
      </div>
      <button className="btn btn-mini" disabled={pending}>
        {pending ? "Publicando…" : "Publicar"}
      </button>
    </form>
  );
}
