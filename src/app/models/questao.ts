import { SafeHtml } from "@angular/platform-browser";

export interface Questao {
  id: string;
  cargo: string;
  nivel: string;
  prova: string;
  enunciado: string | SafeHtml;
  alternativas: { id: number; texto: string }[];
  resposta_correta: number;
}

export interface Alternativa {
  id: number;
  texto: string;
}
