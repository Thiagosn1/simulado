import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Questao } from '../../models/questao';
import { QuestoesService } from '../../services/questoes.service';
import { FiltroComponent } from '../filtro/filtro.component';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

  // Estatísticas
  totalQuestoesDisponiveis: number = 0;
  totalQuestoesRespondidas: number = 0;

  private questoesPrincipais: Record<number, number[]> = {
    1: [2],
    3: [4, 5],
    214: [215],
    217: [218],
    221: [222, 223, 224],
    227: [228],
    272: [273, 274, 275, 276, 277, 278, 279],
    280: [281],
    441: [442],
  };

  constructor(
    private questoesService: QuestoesService,
    private historicoService: HistoricoService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Carregar filtros salvos do localStorage (apenas no browser)
    if (isPlatformBrowser(this.platformId)) {
      const filtrosSalvos = localStorage.getItem('filtrosAtuais');
      if (filtrosSalvos) {
        this.filtrosAtuais = JSON.parse(filtrosSalvos);
        this.carregarQuestoes(
          this.filtrosAtuais.cargo,
          this.filtrosAtuais.nivel,
          this.filtrosAtuais.banca
        );
      } else {
        this.carregarQuestoes();
      }
    } else {
      this.carregarQuestoes();
    }
  }

  carregarQuestoes(cargo?: string, nivel?: string, banca?: string) {
    const questoesComImagensMap: Record<
      string,
      { imagem: string; legenda?: string }
    > = {
      '226': { imagem: 'figura1.png' },
      '230': { imagem: 'figura2.png' },
      '447': {
        imagem: 'figura3.png',
        legenda:
          'Disponível em: https://tirasarmandinho.tumblr.com/post/134547196389/um-novo-recuo-uma-boanotícia-na-sexta-são. Acesso em 10 de novembro de 2025.',
      },
    };

    this.questoesService
      .getQuestoes(cargo, nivel, banca)
      .pipe(
        map((questoes) => {
          const questoesComImagem = questoes.map((questao) => {
            const imagemConfig = questoesComImagensMap[questao.id];
            if (imagemConfig) {
              return {
                ...questao,
                imagem: imagemConfig.imagem,
                legendaImagem: imagemConfig.legenda,
              };
            }
            return questao;
          });

          const filtros = {
            banca: banca?.trim(),
            cargo: cargo?.trim(),
            nivel: nivel?.trim(),
          };

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
        if (questoes.length === 0) {
          this.questoes = [];
          this.totalQuestoesDisponiveis = 0;
          return;
        }

        // Atualizar o total de questões disponíveis com base no filtro atual
        this.totalQuestoesDisponiveis = questoes.length;

        const questoesRespondidas =
          this.historicoService.getQuestoesRespondidas();

        const todasDependentes = new Set(
          Object.values(this.questoesPrincipais).flat()
        );

        // Contar quantas questões do filtro atual já foram respondidas
        const questoesRespondidasNoFiltro = questoes.filter((q) => {
          const questaoIdString = String(q.id);
          const estaRespondida = questoesRespondidas.has(questaoIdString);
          return estaRespondida;
        });

        // Atualizar total de questões respondidas (do filtro atual)
        this.totalQuestoesRespondidas = questoesRespondidasNoFiltro.length;

        // Contar questões disponíveis não respondidas (excluindo dependentes)
        const questoesDisponiveisNaoRespondidas = questoes.filter(
          (q) =>
            !questoesRespondidas.has(String(q.id)) &&
            !todasDependentes.has(Number(q.id))
        );

        // Se não há questões não respondidas disponíveis, limpar histórico
        if (questoesDisponiveisNaoRespondidas.length === 0) {
          this.mensagem =
            'Parabéns! Você respondeu todas as questões disponíveis para este filtro. O histórico foi resetado!';
          this.historicoService.limparHistorico();
          // Recarregar as questões após limpar
          setTimeout(() => {
            this.mensagem = null;
            this.carregarQuestoes(cargo, nivel, banca);
          }, 3000);
          return;
        }

        this.questoes = this.sortearQuestoes(questoes, 10);
        console.log('=== QUESTÕES ATRIBUÍDAS A this.questoes ===');
        console.log('Total:', this.questoes.length);
        console.log(
          'IDs:',
          this.questoes.map((q) => q.id)
        );
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

    // Filtrar questões principais não respondidas (não dependentes)
    const questoesDisponiveis = questoes.filter(
      (q) =>
        !questoesRespondidas.has(String(q.id)) &&
        !todasDependentes.has(Number(q.id))
    );

    // Se não houver questões disponíveis, retornar vazio
    if (questoesDisponiveis.length === 0) {
      return [];
    }

    while (
      questoesSorteadas.length < quantidade &&
      questoesDisponiveis.length > 0
    ) {
      const index = Math.floor(Math.random() * questoesDisponiveis.length);
      const questaoSorteada = questoesDisponiveis[index];

      // Log quando sorteia a 272
      if (Number(questaoSorteada.id) === 272) {
        console.log('🎲 QUESTÃO 272 SORTEADA!');
        console.log(
          'Posição atual em questoesSorteadas:',
          questoesSorteadas.length
        );
      }

      // Usar ID como número para verificar dependentes
      const dependentes =
        this.questoesPrincipais[Number(questaoSorteada.id)] || [];

      // Verificar se TODAS as dependentes NÃO foram respondidas
      const todasDependentesDisponiveis = dependentes.every((depId) => {
        const questaoDep = questoes.find((q) => Number(q.id) === depId);
        return questaoDep && !questoesRespondidas.has(String(questaoDep.id));
      });

      // Se alguma dependente foi respondida, pular esta questão completamente
      if (dependentes.length > 0 && !todasDependentesDisponiveis) {
        questoesDisponiveis.splice(index, 1);
        continue;
      }

      const totalNecessario = 1 + dependentes.length;

      // Se ainda couber a questão principal + TODAS as dependentes, adicionar
      if (questoesSorteadas.length + totalNecessario <= quantidade) {
        questoesSorteadas.push(questaoSorteada);

        // Log para debug
        if (Number(questaoSorteada.id) === 272) {
          console.log('=== ADICIONANDO 272 ===');
          console.log('Dependentes esperadas:', dependentes);
          console.log('Total de questões no array completo:', questoes.length);
        }

        // Adicionar TODAS as questões dependentes
        for (const depId of dependentes) {
          const questaoDependente = questoes.find(
            (q) => Number(q.id) === depId
          );
          if (questaoDependente) {
            questoesSorteadas.push(questaoDependente);
            if (Number(questaoSorteada.id) === 272) {
              console.log('✓ Dependente adicionada:', questaoDependente.id);
            }
          } else {
            if (dependentes.includes(depId)) {
              console.error(
                '✗ Dependente NÃO ENCONTRADA no array de questões:',
                depId
              );
            }
          }
        }

        if (Number(questaoSorteada.id) === 272) {
          console.log('Total sorteado até agora:', questoesSorteadas.length);
          console.log(
            'IDs sorteados:',
            questoesSorteadas.map((q) => q.id)
          );
        }
        // Remove da lista de disponíveis
        questoesDisponiveis.splice(index, 1);
      } else {
        // Se não couber com as dependentes, remover da lista e tentar outra
        questoesDisponiveis.splice(index, 1);

        // Se não há mais questões disponíveis, parar o loop
        if (questoesDisponiveis.length === 0) {
          break;
        }
      }
    }

    return questoesSorteadas;
  }

  aplicarFiltros(filtros: { cargo?: string; nivel?: string; banca?: string }) {
    this.filtrosAtuais = filtros;
    // Salvar filtros no localStorage (apenas no browser)
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('filtrosAtuais', JSON.stringify(filtros));
    }
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

    // Adicionar questões ao histórico
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

    // Atualizar estatísticas após corrigir - usar setTimeout para aguardar o IndexedDB
    setTimeout(() => {
      const questoesRespondidas =
        this.historicoService.getQuestoesRespondidas();

      // Se há filtros ativos, contar apenas as respondidas no filtro
      if (
        this.filtrosAtuais.cargo ||
        this.filtrosAtuais.nivel ||
        this.filtrosAtuais.banca
      ) {
        // Recarregar questões para atualizar o contador
        this.questoesService
          .getQuestoes(
            this.filtrosAtuais.cargo,
            this.filtrosAtuais.nivel,
            this.filtrosAtuais.banca
          )
          .subscribe((questoes) => {
            const todasQuestoesFiltradas = questoes.filter((q) => {
              const filtros = {
                banca: this.filtrosAtuais.banca?.trim(),
                cargo: this.filtrosAtuais.cargo?.trim(),
                nivel: this.filtrosAtuais.nivel?.trim(),
              };
              return Object.entries(filtros).every(([campo, valor]) => {
                return !valor || q[campo as keyof typeof q] === valor;
              });
            });

            const questoesRespondidasNoFiltro = todasQuestoesFiltradas.filter(
              (q) => questoesRespondidas.has(String(q.id))
            );
            this.totalQuestoesRespondidas = questoesRespondidasNoFiltro.length;
          });
      } else {
        // Sem filtros, usar total geral
        this.totalQuestoesRespondidas = questoesRespondidas.size;
      }
    }, 100);
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
    this.mensagem = null;

    this.carregarQuestoes(
      this.filtrosAtuais.cargo,
      this.filtrosAtuais.nivel,
      this.filtrosAtuais.banca
    );

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetarHistoricoCompleto() {
    this.historicoService.limparHistorico();
    this.resultado = null;
    this.alternativaSelecionada = {};
    this.mensagem = 'Histórico resetado com sucesso!';

    // Atualizar estatísticas - será atualizado automaticamente pelo observable
    this.totalQuestoesRespondidas = 0;

    setTimeout(() => {
      this.mensagem = null;
      this.carregarQuestoes(
        this.filtrosAtuais.cargo,
        this.filtrosAtuais.nivel,
        this.filtrosAtuais.banca
      );
    }, 2000);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
