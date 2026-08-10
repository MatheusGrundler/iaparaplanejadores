"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";

type Props = {
  inicial?: string;
  placeholder?: string;
  aoMudar: (html: string) => void;
};

export default function EditorRico({ inicial = "", placeholder, aoMudar }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: inicial,
    onUpdate: ({ editor }) => aoMudar(editor.getHTML()),
    editorProps: {
      attributes: { class: "er-area", "data-placeholder": placeholder ?? "" },
    },
  });

  // Se a dúvida salva chegar depois do mount, atualiza o conteúdo uma vez.
  useEffect(() => {
    if (editor && inicial && editor.isEmpty) {
      editor.commands.setContent(inicial);
    }
  }, [inicial, editor]);

  if (!editor) return <div className="er-area muted">Carregando editor…</div>;

  const b = (ativo: boolean) => `er-botao${ativo ? " ativo" : ""}`;

  return (
    <div className="editor-rico">
      <div className="er-toolbar">
        <button
          type="button"
          className={b(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrito"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={b(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Itálico"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={b(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista"
        >
          • lista
        </button>
        <button
          type="button"
          className={b(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
        >
          1. lista
        </button>
        <button
          type="button"
          className={b(editor.isActive("link"))}
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
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
