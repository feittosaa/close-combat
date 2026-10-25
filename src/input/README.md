# Entradas

`KeyboardInput` converte teclas remapeadas para direções relativas e quatro botões abstratos, com limpeza e espera de soltura após reset. `controlSettings` valida conflitos e persiste layouts; `CommandBuffer` guarda histórico e `CommandParser` fornece reconhecimento genérico por bordas.

O livro atual só registra quatro comandos simples; não há acordes, sequências ou execução precisa no Shoto. Entradas durante ataques/stun são descartadas pela simulação. `InputHistory` é separado do reconhecimento e registra mudanças para inspeção; a notação da interface não altera regras.

Raiz de regras: [base.md](../../base.md).
