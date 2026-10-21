# Fluidez, corrida e leitura do treino

A revisão reduz a recuperação provisória do elétrico de Ayla de 24 para 18F no contato, conservando 24F no vazio. O gancho normal passa a 21F no contato. O elétrico avança 12 unidades e o gancho normal 10, permitindo aproximar o segundo golpe também na distância inicial 96 do treino. O elétrico preserva +5F no primeiro contato bloqueado, ajustando o blockstun de forma coerente com seu segundo frame ativo. Os demais golpes conservam seus tempos próprios; não há cancelamento universal nem aceleração por FPS.

A fonte [TekkenDocs](https://tekkendocs.com/t8/kazuya) informa i11–12 e +5 no bloqueio para o elétrico, mas o snapshot usado não publica sua recuperação. Os 18F são uma adaptação autoral 2D para esta entrega, não um dado certificado de Tekken. O segundo comando completo pode ser preparado nos últimos 8F; executa ao terminar a recuperação anterior. Pressionar muito cedo expira, segurar não repete. Gris, Tester e Dummy passam a ter hurtboxes individuais de juggle (88×90, 90×86 e 96×82), sem reutilizar o volume vertical de salto; Ayla já possuía seu volume de 86×80. As reações desenhadas para esses volumes continuam provisórias. Dois elétricos consecutivos contra os quatro alvos foram testados por entradas normais, no mesmo juggle, sem forçar contato nem ignorar recuperação. Rotas que seguem com chutes médios podem exigir esperar a descida do alvo; os replays preservam todos os contatos e adicionam 6F de espera depois do elétrico nessas rotas.

O ascendente deixou de usar a animação de investida horizontal. Os clipes `electric-uppercut` e `wind-uppercut` combinam poses existentes de preparo agachado e soco direito em pé, com recuperação voltando à guarda. Ainda falta produzir o ascendente e eletricidade próprios; a fila de arte foi atualizada.

## Corrida e enquadramento

F,F seguido de avanço mantido conclui o dash de 12F e entra em corrida. Soltar, inverter, agachar, saltar, defender, atacar ou ficar sem controle cancela a corrida; retomar avanço não retoma corrida antiga. Backdash permanece independente. Velocidades: Ayla 5,8, Gris 5,4, Tester 5,4, Dummy 4,9 unidades/frame. Cada personagem tem seu clipe `run`, provisoriamente derivado do avanço acelerado.

A câmera aproxima até 1,55× de perto, preservando os lutadores no enquadramento quando se afastam. O mundo inteiro é ampliado, incluindo caixas e projéteis; não se aumenta só o desenho deixando a colisão para trás. Uma câmera separada mantém HUD e painéis no mesmo tamanho. A simulação, o alcance e a vida não são modificados pelo zoom.

## Teclas, cores e histórico

O catálogo traduz a notação na apresentação: `f,n,d,df:2` aparece como `→,•,↓,↘:K` no padrão P1. Busca aceita tanto o comando interno quanto sua apresentação. Os quatro botões usam azul, rosa, verde e amarelo; o mesmo padrão vale para o painel e histórico. P2 mostra suas próprias teclas, não as de P1. IDs, snapshots, referências e comandos de backend permanecem em 1–4.

Configurações no menu e Controles no pause permitem remapear direções e ataques. Salvar aplica e persiste no navegador; Esc descarta uma alteração não salva. Teclas duplicadas entre os dois jogadores e atalhos reservados são recusados com explicação. Quando o armazenamento está indisponível, a configuração continua válida na sessão. O menu fixo de navegação e atalhos de treino permanecem reservados.

O histórico guarda 24 mudanças e apresenta as 10 últimas com frame inicial e duração lógica. Registra direções físicas conforme o facing de cada entrada, acordes e solturas, inclusive neutro longo, sem apagar a tentativa anterior a cada 30F. Pause conserva o histórico, reset limpa. Esse registro não executa combos nem interfere no parser.

## Verificação

320 testes: replays de combos anteriores, dois elétricos preparados na recuperação, comando prematuro que expira, +5 no bloqueio, corrida/interrupções, persistência/leitura do teclado e rótulos, conflitos, histórico e enquadramento. Build e diff aprovados. Evidências visuais em `docs/evidence/fluidez/`; CI remota e integração são verificadas no PR da branch `codex/feature-fluidez-corrida-treino`.
