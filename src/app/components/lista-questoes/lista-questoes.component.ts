import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Questao } from '../../models/questao';
import { QuestoesService } from '../../services/questoes.service';
import { FiltroComponent } from '../filtro/filtro.component';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
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
  imports: [FiltroComponent, CommonModule, MatTooltipModule],
  templateUrl: './lista-questoes.component.html',
  styleUrl: './lista-questoes.component.css',
})
export class ListaQuestoesComponent implements OnInit {
  questoes: Questao[] = [];
  alternativaSelecionada: { [key: number]: number | undefined } = {};
  resultado: Resultado | null = null;
  mensagem: string | null = null;
  tipoMensagem: 'sucesso' | 'erro' | 'info' | null = null;
  filtrosAtuais: { cargo?: string; nivel?: string; banca?: string } = {};
  carregando: boolean = false;

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
    272: [273],
    433: [434],
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

      // Keep-alive: fazer requisição a cada 10 minutos para manter servidor ativo
      setInterval(() => {
        this.questoesService.getQuestoes().subscribe({
          next: () => console.log('Keep-alive: servidor mantido ativo'),
          error: () => console.warn('Keep-alive: falha ao pingar servidor'),
        });
      }, 10 * 60 * 1000); // 10 minutos em milissegundos
    } else {
      this.carregarQuestoes();
    }
  }

  carregarQuestoes(cargo?: string, nivel?: string, banca?: string) {
    this.carregando = true;
    this.questoes = []; // Limpar questões ao iniciar carregamento
    this.mensagem = null;
    this.tipoMensagem = null;
    this.totalQuestoesDisponiveis = 0; // Resetar estatísticas
    this.totalQuestoesRespondidas = 0; // Resetar estatísticas
    const questoesComImagensMap: Record<
      number,
      {
        imagem: string;
        legenda?: string;
        dividirEnunciado?: boolean;
        enunciadoAntes?: string;
        enunciadoDepois?: string;
        imagemAntes?: boolean;
      }
    > = {
      226: { imagem: 'figura1.png' },
      230: { imagem: 'figura2.png' },
      447: {
        imagem: 'figura3.png',
        legenda:
          'Disponível em: https://tirasarmandinho.tumblr.com/post/134547196389/um-novo-recuo-uma-boanotícia-na-sexta-são. Acesso em 10 de novembro de 2025.',
      },
      590: {
        imagem: 'figura4.png',
        enunciadoAntes: 'Leia a charge a seguir.',
        enunciadoDepois:
          'O gênero textual charge é marcado pelo caráter humorístico e crítico. Na charge acima, a crítica é construída com base na polissemia de um',
      },
      605: {
        imagem: 'figura5.png',
        enunciadoAntes: 'Observe a tabela a seguir.',
        enunciadoDepois:
          'A série histórica acima refere-se à precipitação média, em mm, durante o ano em Anápolis. A mediana dessas precipitações é igual a',
      },
      630: {
        imagem: 'figura6.png',
        enunciadoAntes: 'Observe a imagem a seguir.',
        enunciadoDepois:
          'A capacidade das unidades administrativas de antever os perigos que se apresentarão nas suas atividades e se preparar previamente para enfrentá-los, diminuindo as incertezas, denomina-se',
      },
      643: {
        imagem: 'figura7.png',
        imagemAntes: true,
      },
      644: {
        imagem: 'figura7.png',
        imagemAntes: true,
      },
      674: {
        imagem: 'figura8.png',
        imagemAntes: true,
      },
      675: {
        imagem: 'figura8.png',
        imagemAntes: true,
      },
      738: {
        imagem: 'figura9.png',
        enunciadoAntes: 'Observe a figura a seguir.',
        enunciadoDepois:
          'A imagem refere-se a conceitos que, além de, nesse contexto, terem sido aplicados ao atendimento ao cidadão, são relacionados à administração. A imagem acima sintetiza respectivamente:',
      },
      742: {
        imagem: 'figura10.png',
        enunciadoAntes: 'Leia a charge a seguir.',
        enunciadoDepois:
          'De acordo com a norma gramatical culta, qual frase foi adaptada adequadamente a partir das frases da charge acima?',
      },
      744: {
        imagem: 'figura11.png',
        enunciadoAntes: 'Leia o texto a seguir.',
        enunciadoDepois:
          'As variações linguísticas procuram estabelecer uma comunicação em relação a um contexto. Proporcionam relacionar maneiras de como os indivíduos apresentam formas em utilizar essa mesma língua no seu dia a dia. Como é classificada a variação linguística presente no texto supramencionado?',
      },
      768: {
        imagem: 'figura12.png',
        enunciadoAntes: 'Leia a tirinha a seguir.',
        enunciadoDepois:
          'No contexto da tirinha, o termo “ter pena” é considerado:',
      },
    };

    this.questoesService
      .getQuestoes(cargo, nivel, banca)
      .pipe(
        map((questoes) => {
          const questoesComImagem = questoes.map((questao) => {
            const imagemConfig = questoesComImagensMap[questao.id];
            if (imagemConfig) {
              const questaoComImagem: any = {
                ...questao,
                imagem: imagemConfig.imagem,
                legendaImagem: imagemConfig.legenda,
                imagemAntes: imagemConfig.imagemAntes,
              };

              // Se enunciadoAntes e enunciadoDepois estão definidos, usar eles
              if (imagemConfig.enunciadoAntes && imagemConfig.enunciadoDepois) {
                questaoComImagem.enunciadoAntes = imagemConfig.enunciadoAntes;
                questaoComImagem.enunciadoDepois = imagemConfig.enunciadoDepois;
              } else if (imagemConfig.dividirEnunciado) {
                // Se precisar dividir o enunciado (imagem no meio)
                const partesEnunciado = questao.enunciado.split('\n\n');
                if (partesEnunciado.length >= 2) {
                  questaoComImagem.enunciadoAntes = partesEnunciado[0];
                  questaoComImagem.enunciadoDepois = partesEnunciado
                    .slice(1)
                    .join('\n\n');
                }
              }

              return questaoComImagem;
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
            this.tipoMensagem = 'info';
            return [];
          }

          return questoesFiltradas;
        }),
        catchError((err: Error) => {
          console.error('Erro ao carregar questões:', err);
          this.mensagem = 'Ocorreu um erro ao buscar as questões.';
          this.tipoMensagem = 'erro';
          this.carregando = false;
          return of([]);
        })
      )
      .subscribe(async (questoes) => {
        if (questoes.length === 0) {
          this.questoes = [];
          this.totalQuestoesDisponiveis = 0;
          this.carregando = false;
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
          const estaRespondida = questoesRespondidas.has(q.id);
          return estaRespondida;
        });

        // Atualizar total de questões respondidas (do filtro atual)
        this.totalQuestoesRespondidas = questoesRespondidasNoFiltro.length;

        // Contar questões disponíveis não respondidas (excluindo dependentes)
        const questoesDisponiveisNaoRespondidas = questoes.filter(
          (q) =>
            !questoesRespondidas.has(q.id) &&
            !todasDependentes.has(Number(q.id))
        );

        // Se não há questões não respondidas disponíveis, limpar histórico
        if (questoesDisponiveisNaoRespondidas.length === 0) {
          this.mensagem =
            'Parabéns! Você respondeu todas as questões disponíveis para este filtro. O histórico foi resetado!';
          this.tipoMensagem = 'sucesso';
          this.historicoService.limparHistorico();
          // Recarregar as questões após limpar
          setTimeout(() => {
            this.mensagem = null;
            this.tipoMensagem = null;
            this.carregarQuestoes(cargo, nivel, banca);
          }, 3000);
          return;
        }

        this.questoes = this.sortearQuestoes(questoes, 10);
        this.carregando = false;
      });
  }

  formatarEnunciado(enunciado: string, questaoId?: number): string {
    let textoFormatado = enunciado;

    // Formatar frações para questão 601
    if (questaoId === 601) {
      textoFormatado = textoFormatado.replace(
        /(\d+)\n(\d+)/g,
        '<sup>$1</sup>/<sub>$2</sub>'
      );
    }

    // Aplicar formatação de negrito para outros casos
    textoFormatado = textoFormatado.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    return textoFormatado;
  }

  formatarAlternativa(texto: string, questaoId?: number): string {
    let textoFormatado = texto;

    // Formatar frações para questão 601
    if (questaoId === 601) {
      textoFormatado = textoFormatado.replace(
        /(\d+)\n(\d+)/g,
        '<sup>$1</sup>/<sub>$2</sub>'
      );
    }

    return textoFormatado;
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
        !questoesRespondidas.has(q.id) && !todasDependentes.has(Number(q.id))
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

      // Usar ID como número para verificar dependentes
      const dependentes =
        this.questoesPrincipais[Number(questaoSorteada.id)] || [];

      // Verificar se TODAS as dependentes NÃO foram respondidas
      const todasDependentesDisponiveis = dependentes.every((depId) => {
        const questaoDep = questoes.find((q) => Number(q.id) === depId);
        return questaoDep && !questoesRespondidas.has(questaoDep.id);
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

        // Adicionar TODAS as questões dependentes
        for (const depId of dependentes) {
          const questaoDependente = questoes.find(
            (q) => Number(q.id) === depId
          );
          if (questaoDependente) {
            questoesSorteadas.push(questaoDependente);
          }
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

  selecionarAlternativa(questaoId: number, alternativaId: number) {
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
              (q) => questoesRespondidas.has(q.id)
            );
            this.totalQuestoesRespondidas = questoesRespondidasNoFiltro.length;
          });
      } else {
        // Sem filtros, usar total geral
        this.totalQuestoesRespondidas = questoesRespondidas.size;
      }
    }, 100);
  }

  obterClasseAlternativa(questaoId: number, alternativaId: number): string {
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
    this.tipoMensagem = null;

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
    this.tipoMensagem = 'sucesso';

    // Atualizar estatísticas - será atualizado automaticamente pelo observable
    this.totalQuestoesRespondidas = 0;

    setTimeout(() => {
      this.mensagem = null;
      this.tipoMensagem = null;
      this.carregarQuestoes(
        this.filtrosAtuais.cargo,
        this.filtrosAtuais.nivel,
        this.filtrosAtuais.banca
      );
    }, 2000);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
