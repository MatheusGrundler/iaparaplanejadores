type ChamadaSupabase = {
  url: string;
  chave: string;
};

export const chamadasSupabase: ChamadaSupabase[] = [];

export function limparChamadasSupabase() {
  chamadasSupabase.length = 0;
}

export function createServerClient(url: string, chave: string) {
  chamadasSupabase.push({ url, chave });

  return {
    auth: {
      getClaims: async () => ({ data: { claims: {} } }),
    },
  };
}
