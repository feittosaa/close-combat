import type { StringSpec } from './organicBook';

export const grisStrings: readonly StringSpec[] = [
  { command: '1,1', name: 'Fio · toque', role: 'link' },
  { command: '1,1,2', name: 'Fio · alçar', role: 'launcher' },
  { command: '1,1,1+2', name: 'Fio · fechar', role: 'damage' },
  { command: '2,1', name: 'Dobra · corte', role: 'link' },
  { command: '2,1,1+2', name: 'Dobra · alçar', role: 'launcher' },
  { command: '3,2', name: 'Bainha · corte', role: 'link' },
  { command: '3,2,3+4', name: 'Bainha · alçar', role: 'launcher' },
  { command: '4,1', name: 'Arco · corte', role: 'link' },
  { command: '4,1,1+2', name: 'Arco · alçar', role: 'launcher' },
  { command: '1+2,2', name: 'Coroa · corte', role: 'link' },
  { command: '1+2,2,3+4', name: 'Coroa · alçar', role: 'launcher' },
  { command: '3+4,1', name: 'Trama · rebater', role: 'extender' },
  { command: '3+4,1,2', name: 'Trama · transportar', role: 'carry' },
  { command: '2,4', name: 'Dobra · recolher', role: 'stance' },
];
