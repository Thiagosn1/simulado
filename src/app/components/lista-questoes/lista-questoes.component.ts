import { Component, OnInit } from '@angular/core';
import { Questao } from '../../models/questao';
import { QuestoesService } from '../../services/questoes.service';
import { FiltroComponent } from '../filtro/filtro.component';
import { CommonModule } from '@angular/common';
import { catchError, map, of } from 'rxjs';
import { HistoricoService } from '../../services/historico.service';

type Resultado = {
  acertos: number;
  percentual: number;
  detalhes: Array<{
    respostaCorreta: number;
    respostaSelecionada: number | undefined;
  }>;
};

@Component({
  selector: 'app-lista-questoes',
  standalone: true,
  imports: [FiltroComponent, CommonModule],
  templateUrl: './lista-questoes.component.html',
  styleUrl: './lista-questoes.component.css',
})
export class ListaQuestoesComponent implements OnInit {
  questoes: Questao[] = [];
  alternativaSelecionada: { [key: string]: number | undefined } = {};
  resultado: Resultado | null = null;
  mensagem: string | null = null;
  filtrosAtuais: { cargo?: string; nivel?: string } = {};

  constructor(
    private questoesService: QuestoesService,
    private historicoService: HistoricoService
  ) {}

  ngOnInit() {
    this.carregarQuestoes();
  }

  carregarQuestoes(cargo?: string, nivel?: string) {
    this.questoesService
      .getQuestoes(cargo, nivel)
      .pipe(
        map((questoes) => {
          let questoesFiltradas = questoes;

          if (cargo) {
            questoesFiltradas = questoesFiltradas.filter(
              (q) => q.cargo === cargo
            );
          }

          if (nivel) {
            questoesFiltradas = questoesFiltradas.filter(
              (q) => q.nivel === nivel
            );
          }

          if (questoesFiltradas.length === 0) {
            if (cargo && nivel) {
              this.mensagem = `Nenhuma questão encontrada para o cargo "${cargo}" e nível "${nivel}".`;
            } else if (cargo) {
              this.mensagem = `Nenhuma questão encontrada para o cargo "${cargo}".`;
            } else if (nivel) {
              this.mensagem = `Nenhuma questão encontrada para o nível "${nivel}".`;
            }
            return [];
          }

          return questoesFiltradas.map((questao) => ({
            ...questao,
            enunciado: this.formatarEnunciado(questao.enunciado),
          }));
        }),
        catchError((error) => {
          this.mensagem = 'Ocorreu um erro ao buscar as questões.';
          return of([]);
        })
      )
      .subscribe((questoes) => {
        this.questoes =
          questoes.length > 0 ? this.sortearQuestoes(questoes, 10) : [];
      });
  }

  private formatarEnunciado(enunciado: string): string {
    enunciado = enunciado.replace(/\$\d+$/, '');

    enunciado = enunciado.replace(
      /(.*?(?:relacione as colunas a seguir|assinale a alternativa.*?:))((?:\s*\d-[^(].*?)+)((?:\s*\(\s*\).*?)+)$/is,
      (_, intro, numeracao, alternativas) => {
        const introFormatada = intro.trim();

        const numeracaoFormatada = numeracao
          .split(/(?=\d-)/)
          .filter(Boolean)
          .map((item: string) => item.trim())
          .join('\n');

        const alternativasFormatadas = alternativas
          .split(/(?=\(\s*\))/)
          .filter(Boolean)
          .map((alt: string) => alt.trim())
          .join('\n');

        return `${introFormatada}\n\n${numeracaoFormatada}\n\n${alternativasFormatadas}`;
      }
    );

    return enunciado;
  }

  private questaoReferenciaTexto(questao: Questao): boolean {
    const palavrasChave = [
      'Segundo o texto',
      'como base o texto',
      'texto acima',
      'Na música',
    ];

    return palavrasChave.some((palavra) =>
      questao.enunciado.toLowerCase().includes(palavra.toLowerCase())
    );
  }

  sortearQuestoes(questoes: Questao[], quantidade: number): Questao[] {
    const questoesDisponiveis = questoes.filter(
      (questao) => !this.questaoReferenciaTexto(questao)
    );

    const questoesRespondidas = this.historicoService.getQuestoesRespondidas();

    const questoesNaoRespondidas = questoesDisponiveis.filter(
      (q) => !questoesRespondidas.includes(q.id)
    );
    const questoesJaRespondidas = questoesDisponiveis.filter((q) =>
      questoesRespondidas.includes(q.id)
    );

    const questoesSorteadas: Questao[] = [];

    while (
      questoesSorteadas.length < quantidade &&
      questoesNaoRespondidas.length > 0
    ) {
      const indiceAleatorio = Math.floor(
        Math.random() * questoesNaoRespondidas.length
      );
      questoesSorteadas.push(
        questoesNaoRespondidas.splice(indiceAleatorio, 1)[0]
      );
    }

    while (
      questoesSorteadas.length < quantidade &&
      questoesJaRespondidas.length > 0
    ) {
      const indiceAleatorio = Math.floor(
        Math.random() * questoesJaRespondidas.length
      );
      questoesSorteadas.push(
        questoesJaRespondidas.splice(indiceAleatorio, 1)[0]
      );
    }

    return questoesSorteadas;
  }

  aplicarFiltros(filtros: { cargo?: string; nivel?: string }) {
    this.filtrosAtuais = filtros;
    this.carregarQuestoes(filtros.cargo, filtros.nivel);
  }

  selecionarAlternativa(questaoId: string, alternativaId: number) {
    this.alternativaSelecionada[questaoId] = alternativaId;
  }

  todasQuestoesRespondidas(): boolean {
    return this.questoes.every(
      (questao) => this.alternativaSelecionada[questao.id] !== undefined
    );
  }

  corrigirSimulado() {
    if (!this.todasQuestoesRespondidas()) {
      return;
    }

    this.questoes.forEach((questao) => {
      this.historicoService.adicionarQuestaoRespondida(questao.id);
    });

    let acertos = 0;
    const detalhes: Array<{
      respostaCorreta: number;
      respostaSelecionada: number | undefined;
    }> = [];

    this.questoes.forEach((questao) => {
      const respostaSelecionada = this.alternativaSelecionada[questao.id];
      if (respostaSelecionada === questao.resposta_correta) {
        acertos++;
      }
      detalhes.push({
        respostaCorreta: questao.resposta_correta,
        respostaSelecionada: respostaSelecionada,
      });
    });

    this.resultado = {
      acertos: acertos,
      percentual: Number(((acertos / this.questoes.length) * 100).toFixed(2)),
      detalhes: detalhes,
    };
  }

  obterClasseAlternativa(questaoId: string, alternativaId: number): string {
    if (!this.resultado) {
      return this.alternativaSelecionada[questaoId] === alternativaId
        ? 'selecionada'
        : '';
    }

    const questaoIndex = this.questoes.findIndex((q) => q.id === questaoId);
    const detalhe = this.resultado.detalhes[questaoIndex];

    if (!detalhe) {
      return '';
    }

    if (alternativaId === detalhe.respostaCorreta) {
      return 'correta';
    }

    if (
      alternativaId === detalhe.respostaSelecionada &&
      detalhe.respostaSelecionada !== detalhe.respostaCorreta
    ) {
      return 'incorreta';
    }

    return '';
  }

  obterTextoAlternativa(
    questao: Questao,
    alternativaId: number | undefined
  ): string {
    if (alternativaId === undefined) {
      return 'Nenhuma';
    }
    const alternativa = questao.alternativas.find(
      (a) => a.id === alternativaId
    );
    return alternativa ? alternativa.texto : '';
  }

  sortearNovasQuestoes() {
    this.resultado = null;
    this.alternativaSelecionada = {};
    this.carregarQuestoes(this.filtrosAtuais.cargo, this.filtrosAtuais.nivel);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
