import { adminClient } from "@/lib/supabase/admin";
import { canAccessMemberArea } from "@/lib/auth";
import { assinarAnexosComunidade } from "@/lib/comunidade-feed";
import { limparRascunhosExpiradosComunidade } from "@/lib/comunidade-server";
import Composer from "./Composer";
import { AnexoNoFeed, htmlSeguro, quando, type AnexoPronto } from "./Feed";
import styles from "./comunidade.module.css";

export const dynamic = "force-dynamic";

const BUCKET = "comunidade-anexos";

type Publicacao = {
  id: number;
  autor: string;
  texto: string;
  conteudo_html: string | null;
  fixado: boolean;
  created_at: string;
};

export default async function ComunidadePage() {
  if (!(await canAccessMemberArea())) return null;

  const db = adminClient();
  await limparRascunhosExpiradosComunidade(db);
  const { data: postsData, error: postsError } = await db
    .from("posts")
    .select("id, autor, texto, conteudo_html, fixado, created_at")
    .eq("deletado", false)
    .eq("publicado", true)
    .order("fixado", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  const posts = (postsData ?? []) as Publicacao[];
  const ids = posts.map((post) => post.id);
  const { data: anexosData, error: anexosError } = ids.length
    ? await db
        .from("post_anexos")
        .select("id, post_id, file, nome_original, tipo, mime, bytes, status")
        .in("post_id", ids)
        .eq("status", "pronto")
        .order("criado_em", { ascending: true })
    : { data: [], error: null };

  const assinatura = await assinarAnexosComunidade(
    (anexosData ?? []) as Omit<AnexoPronto, "url" | "downloadUrl">[],
    (paths, expiresIn) => db.storage.from(BUCKET).createSignedUrls(paths, expiresIn),
  );

  const anexosPorPost = new Map<number, AnexoPronto[]>();
  for (const anexo of assinatura.anexos) {
    if (anexo.status !== "pronto") continue;
    const lista = anexosPorPost.get(anexo.post_id) ?? [];
    lista.push(anexo);
    anexosPorPost.set(anexo.post_id, lista);
  }

  const erroFeed = Boolean(postsError || anexosError);

  return (
    <main className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1>Comunidade</h1>
        <p>
          Compartilhe avanços, perguntas e materiais úteis. Tudo o que for publicado fica visível
          para os participantes da comunidade.
        </p>
      </header>

      <Composer />

      <div className={styles.feedCabecalho}>
        <h2>Conversas da comunidade</h2>
        {!erroFeed && (
          <span>{posts.length === 1 ? "1 publicação" : `${posts.length} publicações`}</span>
        )}
      </div>

      {assinatura.houveErro && !postsError && !anexosError && (
        <div className={styles.avisoFeed} role="alert">
          Alguns anexos não puderam ser carregados agora. Atualize a página para tentar novamente.
        </div>
      )}

      {erroFeed ? (
        <div className={styles.vazio} role="alert">
          <strong>Não foi possível carregar as conversas agora.</strong>
          Sua publicação continua segura no editor. Tente atualizar a página em instantes.
        </div>
      ) : posts.length === 0 ? (
        <div className={styles.vazio}>
          <strong>A conversa começa aqui.</strong>
          Compartilhe uma descoberta, uma dúvida ou um material com os participantes.
        </div>
      ) : (
        <section className={styles.feed} aria-label="Publicações da comunidade">
          {posts.map((post) => {
            const anexos = anexosPorPost.get(post.id) ?? [];
            return (
              <article className={styles.post} key={post.id}>
                <header className={styles.postCabecalho}>
                  <span className={styles.autor}>{post.autor}</span>
                  <time className={styles.quando} dateTime={post.created_at}>
                    {post.fixado ? "Fixada · " : ""}
                    {quando(post.created_at)}
                  </time>
                </header>

                {post.conteudo_html ? (
                  <div
                    className={styles.conteudo}
                    dangerouslySetInnerHTML={{
                      __html: htmlSeguro(post.conteudo_html),
                    }}
                  />
                ) : post.texto ? (
                  <p className={styles.conteudo}>{post.texto}</p>
                ) : null}

                {anexos.length > 0 && (
                  <div className={styles.anexosFeed} aria-label="Anexos da publicação">
                    {anexos.map((anexo) => (
                      <AnexoNoFeed anexo={anexo} key={anexo.id} />
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
