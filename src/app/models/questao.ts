import { SafeHtml } from '@angular/platform-browser';

export interface Questao {
  id: number;
  cargo: string;
  nivel: string;
  prova: string;
  banca: string;
  enunciado: string;
  enunciadoAntes?: string;
  enunciadoDepois?: string;
  imagem?: string;
  legendaImagem?: string;
  alternativas: { id: number; texto: string }[];
  resposta_correta: number;
}

export interface Alternativa {
  id: number;
  texto: string;
}
