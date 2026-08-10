const styles = new Proxy<Record<string, string>>(
  {},
  {
    get: (_alvo, propriedade) => String(propriedade),
  },
);

export default styles;
