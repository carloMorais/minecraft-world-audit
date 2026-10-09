# Diretrizes e Preferências do Projeto

- **Idioma Padrão**: As respostas e a comunicação com o usuário devem ser sempre em **Português do Brasil (pt-BR)**. A interface (UI) e as descrições em código devem seguir o mesmo padrão de idioma para manter consistência.
- **Ecossistema Tecnológico**:
  - Interface desenvolvida utilizando **React**, **Vite** e ferramentas CSS nativas puras (`styles.css`).
  - Lógica embutida no frontend usando **Web Workers** processados localmente.
  - A parte Node.js do repositório foca ser **Zero dependências em tempo de execução** para a CLI e backend isolado.
- **Preferências de UI/UX e Data View (Identificadas no contexto de melhoria)**:
  - **Densidade Visual Reduzida:** Evitar listar blocos massivos e de forma monótona (evitar grids longas infinitas como BarLists antigas). Se puder, agrupe por dimensão/dados e use gráficos visuais mais elegantes (Exemplo: **PieCharts** nativos com pseudo-elementos usando *conic-gradient*, conforme já customizado).
  - **Scroll Suave e Escondido nas Abas (Tabs):** Onde houver rolagem horizontal (`overflow-x: auto`), **SEMPRE esconder a scrollbar nativa** usando `-ms-overflow-style: none`, `scrollbar-width: none` e `::-webkit-scrollbar { display: none; }`, mantendo uma experiência limpa estilo mobile através da propriedade `scroll-snap-type: x mandatory`.
  - **Uso de Accordions (`<details>`) e Agrupamentos Funcionais:** Interfaces que abrigam muitas abas e muitas escolhas para o usuário que não são prioritárias devem ser mantidas recolhidas dentro de tags nativas de `<details><summary>` com uma hierarquia limpa. (Vide os overlay de desempenho e redstone).
  - **Mapa como Foco Global da Aplicação:** O mapa (e a exploração do mundo) deve ser o recurso proeminente do app. Diminuir painéis sobrepondo a tela do mapa, favorecendo "chips / flutuantes de dimensão" (`map-floating-dim`) na interface de renderização de Canvas.
  - **Feedback do Usuário:** Sempre priorize fornecer feedbacks limpos a interações ou cargas. Para painéis densos, ou cargas que demoram, crie `Overlays de loading` transparentes para que o usuário não ache que "o site travou".
  - **Animações (UX fluída):** Telas grandes com conteúdo em blocos ou modal dialogs devem possuir as classes atreladas à animações leves como `fade-in`, `rise` e `pop-in` para garantir leveza no engajamento inicial da página.

*Para desenvolvedores colaborando (ou agentes LLM atuando): Sempre consulte este arquivo ao arquitetar e renderizar um novo componente.*
