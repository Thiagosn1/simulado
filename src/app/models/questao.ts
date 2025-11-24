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
  imagemAntes?: boolean;
  alternativas: { id: number; texto: string }[];
  resposta_correta: number;
  justificativas?: { [key: string]: string };
}

export interface Alternativa {
  id: number;
  texto: string;
}
