"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";

type Props = {
  inicial?: string;
  placeholder?: string;
  desabilitado?: boolean;
  rotuloAria?: string;
  descritoPor?: string;
  aoMudar: (html: string) => void;
};

export default function EditorRico({
  inicial = "",
  placeholder,
  desabilitado = false,
  rotuloAria = "Conteúdo",
  descritoPor,
  aoMudar,
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: inicial,
    editable: !desabilitado,
    onUpdate: ({ editor }) => aoMudar(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "er-area",
        "data-placeholder": placeholder ?? "",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": rotuloAria,
        ...(descritoPor ? { "aria-describedby": descritoPor } : {}),
      },
    },
  });

  // Se a dúvida salva chegar depois do mount, atualiza o conteúdo uma vez.
  useEffect(() => {
    if (editor && inicial && editor.isEmpty) {
      editor.commands.setContent(inicial);
    }
  }, [inicial, editor]);

  useEffect(() => {
    editor?.setEditable(!desabilitado);
  }, [desabilitado, editor]);

  if (!editor) return <div className="er-area muted">Carregando editor…</div>;

  const b = (ativo: boolean) => `er-botao${ativo ? " ativo" : ""}`;

  return (
    <div className="editor-rico">
      <div className="er-toolbar" role="toolbar" aria-label="Formatação do texto">
        <button
          type="button"
          className={b(editor.isActive("paragraph"))}
          onClick={() => editor.chain().focus().setParagraph().run()}
          disabled={desabilitado}
          aria-label="Texto normal"
          aria-pressed={editor.isActive("paragraph")}
          title="Texto normal"
        >
          Texto
        </button>
        <button
          type="button"
          className={b(editor.isActive("heading", { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={desabilitado}
          aria-label="Título"
          aria-pressed={editor.isActive("heading", { level: 2 })}
          title="Título"
        >
          Título
        </button>
        <button
          type="button"
          className={b(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={desabilitado}
          aria-label="Negrito"
          aria-pressed={editor.isActive("bold")}
          title="Negrito"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={b(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={desabilitado}
          aria-label="Itálico"
          aria-pressed={editor.isActive("italic")}
          title="Itálico"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={b(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={desabilitado}
          aria-label="Lista com marcadores"
          aria-pressed={editor.isActive("bulletList")}
          title="Lista"
        >
          • lista
        </button>
        <button
          type="button"
          className={b(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={desabilitado}
          aria-label="Lista numerada"
          aria-pressed={editor.isActive("orderedList")}
          title="Lista numerada"
        >
          1. lista
        </button>
        <button
          type="button"
          className={b(editor.isActive("link"))}
          disabled={desabilitado}
          aria-label={editor.isActive("link") ? "Remover link" : "Adicionar link"}
          aria-pressed={editor.isActive("link")}
          onClick={() => {
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run();
              return;
            }
            const url = window.prompt("Endereço do link (https://…)");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          title="Link"
        >
          link
        </button>
        <button
          type="button"
          className={b(editor.isActive("blockquote"))}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={desabilitado}
          aria-label="Citação"
          aria-pressed={editor.isActive("blockquote")}
          title="Citação"
        >
          “ citação
        </button>
        <button
          type="button"
          className="er-botao"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={desabilitado || !editor.can().chain().focus().undo().run()}
          aria-label="Desfazer"
          title="Desfazer"
        >
          ↶
        </button>
        <button
          type="button"
          className="er-botao"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={desabilitado || !editor.can().chain().focus().redo().run()}
          aria-label="Refazer"
          title="Refazer"
        >
          ↷
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
