# Combate

Resolver contatos com geometria e dados do motor. Coletar contatos simultâneos antes de aplicar efeitos para evitar viés de ordem entre jogadores. Defesa, dano, recuperação e vantagem devem refletir regras explícitas, sem decisões escondidas na renderização.

IA e ferramentas usam entradas legais e os mesmos resolvedores das partidas. Eventos de contato devem ser consumíveis sem reaplicar dano. Mecânicas não definidas precisam de especificação e cobertura antes de implementação; seus detalhes ficam na pipeline.
