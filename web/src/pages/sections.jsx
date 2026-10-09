// Pages made of tabs. Each tab is a former page body; the map views replaced the pages that showed places.
import { Search, Archive, PackageOpen, BookOpen, Map as MapIcon, Users, Coins, Shield, Boxes, Pickaxe, Trophy, Terminal, Gavel, ScrollText } from 'lucide-react';
import TabbedPage from '../components/TabbedPage.jsx';
import Items from './Items.jsx';
import Containers from './Containers.jsx';
import Storage from './Storage.jsx';
import Trades from './Trades.jsx';
import Players from './Players.jsx';
import Wealth from './Wealth.jsx';
import Gear from './Gear.jsx';
import Blocks from './Blocks.jsx';
import Mining from './Mining.jsx';
import Collections from './Collections.jsx';
import Advanced from './Advanced.jsx';
import { PaperMaps, WorldRecords, WorldConfig } from './WorldData.jsx';

const ITEM_TABS = [
  { id: 'search', label: 'Busca', icon: Search, el: Items, subtitle: 'Onde está cada item do mundo: inventários, ender chests, baús, shulkers dentro de baús, molduras, mobs e itens no chão.' },
  { id: 'containers', label: 'Baús e containers', icon: Archive, el: Containers, subtitle: 'Todo bloco que guarda itens, com o inventário aberto: baús, barris, shulkers, funis, fornalhas, molduras, atris, toca-discos…' },
  { id: 'storage', label: 'Organização', icon: PackageOpen, el: Storage, subtitle: 'Como estão os baús: quanto espaço sobra, itens espalhados por vários containers e pilhas que dá para juntar.' },
  { id: 'trades', label: 'Livros e trocas', icon: BookOpen, el: Trades, subtitle: 'Os livros encantados mais baratos à venda e o que os aldeões compram por esmeraldas.' },
  { id: 'maps', label: 'Mapas de papel', icon: MapIcon, el: PaperMaps, subtitle: 'Os mapas de papel desenhados neste mundo.' },
];
const PLAYER_TABS = [
  { id: 'inventory', label: 'Inventários', icon: Users, el: Players, subtitle: 'Tudo o que o mundo guarda de cada jogador: inventário, armadura, ender chest, vida, XP, spawn e morte.' },
  { id: 'wealth', label: 'Patrimônio', icon: Coins, el: Wealth, subtitle: 'Quanto vale o que cada jogador carrega e cada base guarda, convertido em diamantes para dar para comparar.' },
  { id: 'gear', label: 'Equipamento', icon: Shield, el: Gear, subtitle: 'Ferramentas e armaduras quase quebrando, equipamento bom sem Remendo ou Inquebrável e os livros encantados que existem no mundo.' },
];
const TERRAIN_TABS = [
  { id: 'blocks', label: 'Blocos', icon: Boxes, el: Blocks, subtitle: 'Contagem de cada bloco salvo no mundo, por dimensão, e busca de coordenadas. Os biomas estão no mapa.' },
  { id: 'ores', label: 'Minérios por altura', icon: Pickaxe, el: Mining, subtitle: 'Em que altura cada minério aparece neste mundo, contado bloco a bloco nos chunks já gerados.' },
];
const PROGRESS_TABS = [
  { id: 'collections', label: 'Coleções', icon: Trophy, el: Collections, subtitle: 'Conquistas e checklists do que o mundo já tem: discos, moldes, fragmentos, cabeças, cores, mobs domados e biomas visitados.' },
];
const ADVANCED_TABS = [
  { id: 'raw', label: 'Dados brutos', icon: Terminal, el: Advanced, subtitle: 'Exportação em JSON, índice do banco de dados e leitura direta de qualquer registro NBT.' },
  { id: 'config', label: 'Configuração', icon: Gavel, el: WorldConfig, subtitle: 'Regras do jogo, add-ons e experimentos ativados neste mundo.' },
  { id: 'records', label: 'Registros', icon: ScrollText, el: WorldRecords, subtitle: 'Registros globais: scoreboard (estatísticas de add-ons), estruturas salvas, eventos e o Ender Dragon.' },
];

export const ItemsPage = props => <TabbedPage page="items" title="Itens" tabs={ITEM_TABS} {...props} />;
export const PlayersPage = props => <TabbedPage page="players" title="Jogadores" tabs={PLAYER_TABS} {...props} />;
export const TerrainPage = props => <TabbedPage page="terrain" title="Terreno" tabs={TERRAIN_TABS} {...props} />;
export const ProgressPage = props => <TabbedPage page="progress" title="Progresso" tabs={PROGRESS_TABS} {...props} />;
export const AdvancedPage = props => <TabbedPage page="advanced" title="Avançado" tabs={ADVANCED_TABS} {...props} />;
