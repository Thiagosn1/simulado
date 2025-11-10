import { SafeHtml } from '@angular/platform-browser';

export interface Questao {
  id: string;
  cargo: string;
  nivel: string;
  prova: string;
  banca: string;
  enunciado: string;
  imagem?: string;
  legendaImagem?: string;
  alternativas: { id: number; texto: string }[];
  resposta_correta: number;
}

export interface Alternativa {
  id: number;
  texto: string;
}
