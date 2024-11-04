import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HistoricoService {
  private readonly STORAGE_KEY = 'questoes_respondidas';
  private readonly MAX_HISTORICO = 20;

  getQuestoesRespondidas(): string[] {
    const historico = localStorage.getItem(this.STORAGE_KEY);
    return historico ? JSON.parse(historico) : [];
  }

  adicionarQuestaoRespondida(questaoId: string) {
    const historico = this.getQuestoesRespondidas();
    if (!historico.includes(questaoId)) {
      historico.push(questaoId);
      if (historico.length > this.MAX_HISTORICO) {
        historico.shift();
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(historico));
    }
  }

  limparHistorico() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
