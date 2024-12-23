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
  filtrosAtuais: { cargo?: string; nivel?: string; banca?: string } = {};
  private questoesPrincipais: Record<number, number[]> = {
    1: [2],
    3: [4, 5],
    214: [215],
    217: [218],
    221: [222, 223, 224],
    227: [228],
    272: [273, 274, 275, 276, 277, 278, 279],
    280: [281],
  };

  constructor(
    private questoesService: QuestoesService,
    private historicoService: HistoricoService
  ) {
    this.historicoService
      .getHistoricoObservable()
      .subscribe((questoesRespondidas) => {
        console.log(
          'Histórico atualizado:',
          questoesRespondidas.size,
          'questões'
        );
      });
  }

  ngOnInit() {
    this.carregarQuestoes();
  }

  carregarQuestoes(cargo?: string, nivel?: string, banca?: string) {
    const questoesComImagensMap: Record<string, string> = {
      '226': 'figura1.png',
      '230': 'figura2.png',
    };

    this.questoesService
      .getQuestoes(cargo, nivel, banca)
      .pipe(
        map((questoes) => {
          const questoesComImagem = questoes.map((questao) => {
            const imagem = questoesComImagensMap[questao.id];
            if (imagem) {
              return {
                ...questao,
                imagem,
              };
            }
            return questao;
          });

          const filtros = {
            banca: banca?.trim(),
            cargo: cargo?.trim(),
            nivel: nivel?.trim(),
          };

          console.log('Filtros aplicados:', filtros);

          const questoesFiltradas = questoesComImagem.filter((questao) => {
            return Object.entries(filtros).every(([campo, valor]) => {
              return !valor || questao[campo as keyof typeof questao] === valor;
            });
          });

          if (questoesFiltradas.length === 0) {
            const filtrosAplicados = Object.entries(filtros)
              .filter(([_, valor]) => valor)
              .map(([campo, valor]) => ` para ${campo} "${valor}"`)
              .join('');

            this.mensagem = `Nenhuma questão encontrada${filtrosAplicados}.`;
            return [];
          }

          return questoesFiltradas;
        }),
        catchError((err: Error) => {
          console.error('Erro ao carregar questões:', err);
          this.mensagem = 'Ocorreu um erro ao buscar as questões.';
          return of([]);
        })
      )
      .subscribe(async (questoes) => {
        const todasRespondidas =
          await this.historicoService.verificarTodasRespondidas(
            questoes.length
          );
        if (todasRespondidas) {
          console.log('Histórico limpo - Iniciando novo ciclo de questões');
        }

        this.questoes =
          questoes.length > 0 ? this.sortearQuestoes(questoes, 10) : [];
      });
  }

  formatarEnunciado(enunciado: string): string {
    return enunciado.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  sortearQuestoes(questoes: Questao[], quantidade: number): Questao[] {
    const questoesRespondidas = this.historicoService.getQuestoesRespondidas();
    const questoesSorteadas: Questao[] = [];

    // Converter IDs de dependentes para números
    const todasDependentes = new Set(
      Object.values(this.questoesPrincipais).flat()
    );

    // Filtrar questões principais (não dependentes)
    const questoesDisponiveis = questoes.filter(
      (q) =>
        !questoesRespondidas.has(String(q.id)) &&
        !todasDependentes.has(Number(q.id))
    );

    while (
      questoesSorteadas.length < quantidade &&
      questoesDisponiveis.length > 0
    ) {
      const index = Math.floor(Math.random() * questoesDisponiveis.length);
      const questaoSorteada = questoesDisponiveis[index];

      // Usar ID como número para verificar dependentes
      const dependentes =
        this.questoesPrincipais[Number(questaoSorteada.id)] || [];
      const totalNecessario = 1 + dependentes.length;

      if (questoesSorteadas.length + totalNecessario <= quantidade) {
        questoesSorteadas.push(questaoSorteada);

        // Adicionar questões dependentes em ordem
        for (const depId of dependentes) {
          const questaoDependente = questoes.find(
            (q) => Number(q.id) === depId
          );
          if (questaoDependente) {
            questoesSorteadas.push(questaoDependente);
          }
        }
      }

      questoesDisponiveis.splice(index, 1);
    }

    return questoesSorteadas;
  }

  aplicarFiltros(filtros: { cargo?: string; nivel?: string; banca?: string }) {
    this.filtrosAtuais = filtros;
    this.carregarQuestoes(filtros.cargo, filtros.nivel, filtros.banca);
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

    Promise.all(
      this.questoes.map((questao) => {
        this.historicoService.adicionarQuestaoRespondida(questao.id);
      })
    ).then(() => {
      this.historicoService.verificarQuestoesRespondidas();
    });

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

    window.scrollTo({ top: 0, behavior: 'smooth' });
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

    this.historicoService.verificarQuestoesRespondidas();

    this.carregarQuestoes(
      this.filtrosAtuais.cargo,
      this.filtrosAtuais.nivel,
      this.filtrosAtuais.banca
    );

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
