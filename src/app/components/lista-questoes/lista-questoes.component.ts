import { Component, OnInit } from '@angular/core';
import { Questao } from '../../models/questao';
import { QuestoesService } from '../../services/questoes.service';
import { FiltroComponent } from '../filtro/filtro.component';
import { CommonModule } from '@angular/common';
import { catchError, map, of } from 'rxjs';
import { HistoricoService } from '../../services/historico.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
  percentualMinimo = 80;
  private questoesPrincipais: Record<string, string[]> = {
    '1': ['2'],
    '3': ['4', '5'],
    '214': ['215'],
    '217': ['218'],
  };

  constructor(
    private questoesService: QuestoesService,
    private historicoService: HistoricoService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.carregarQuestoes();
  }

  carregarQuestoes(cargo?: string, nivel?: string, banca?: string) {
    this.questoesService
      .getQuestoes(cargo, nivel, banca)
      .pipe(
        map((questoes) => {
          console.log('Questões recebidas:', questoes);
          console.log('Filtros aplicados:', { cargo, nivel, banca });

          let questoesFiltradas = questoes;

          // Só aplica o filtro se o valor não estiver vazio
          if (banca && banca.trim() !== '') {
            console.log('Filtrando por banca:', banca);
            questoesFiltradas = questoesFiltradas.filter((q) => {
              console.log('Comparando:', q.banca, banca);
              return q.banca === banca;
            });
          }

          if (cargo && cargo.trim() !== '') {
            console.log('Filtrando por cargo:', cargo);
            questoesFiltradas = questoesFiltradas.filter(
              (q) => q.cargo === cargo
            );
          }

          if (nivel && nivel.trim() !== '') {
            console.log('Filtrando por nível:', nivel);
            questoesFiltradas = questoesFiltradas.filter(
              (q) => q.nivel === nivel
            );
          }

          console.log('Questões após filtro:', questoesFiltradas);

          if (questoesFiltradas.length === 0) {
            let mensagem = 'Nenhuma questão encontrada';
            if (banca) mensagem += ` para a banca "${banca}"`;
            if (cargo) mensagem += ` para o cargo "${cargo}"`;
            if (nivel) mensagem += ` de nível "${nivel}"`;
            this.mensagem = mensagem + '.';
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
      .subscribe((questoes) => {
        this.questoes =
          questoes.length > 0 ? this.sortearQuestoes(questoes, 10) : [];
      });
  }

  private formatarEnunciado(enunciado: string): SafeHtml {
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

        return `${introFormatada}\n${numeracaoFormatada}\n${alternativasFormatadas}`;
      }
    );

    enunciado = this.formatarNegrito(enunciado);
    enunciado = this.formatarTabela(enunciado);

    return this.sanitizer.bypassSecurityTrustHtml(enunciado);
  }

  private formatarNegrito(texto: string): string {
    return texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  private formatarTabela(texto: string): string {
    const linhas = texto.split('\n');
    let tabelaAtual: string[][] = [];
    let resultado = '';
    let dentroTabela = false;

    for (let linha of linhas) {
      if (linha.includes('|')) {
        if (!dentroTabela) {
          dentroTabela = true;
          tabelaAtual = [];
        }
        const colunas = linha
          .split('|')
          .map((col) => col.trim())
          .filter((col) => col);

        tabelaAtual.push(colunas);
      } else {
        if (dentroTabela) {
          resultado += this.construirTabelaHTML(tabelaAtual);
          dentroTabela = false;
          tabelaAtual = [];
        }
        resultado += linha + '\n';
      }
    }

    if (dentroTabela) {
      resultado += this.construirTabelaHTML(tabelaAtual);
    }

    return resultado;
  }

  private construirTabelaHTML(linhas: string[][]): string {
    if (linhas.length === 0) return '';

    let html = '<table class="questao-tabela">';

    html += '<thead><tr>';
    for (let celula of linhas[0]) {
      html += `<th>${celula}</th>`;
    }
    html += '</tr></thead>';

    html += '<tbody>';
    for (let i = 1; i < linhas.length; i++) {
      if (linhas[i].length === 0) continue;

      html += '<tr>';
      for (let celula of linhas[i]) {
        if (celula === '-------------' || celula === '------------') continue;
        html += `<td>${celula}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';

    return html;
  }

  sortearQuestoes(questoes: Questao[], quantidade: number): Questao[] {
    const questoesRespondidas = this.historicoService.getQuestoesRespondidas();
    const totalQuestoes = questoes.length;
    const questoesUnicas = new Set(questoesRespondidas);
    const percentualRespondido = (questoesUnicas.size / totalQuestoes) * 100;

    const todasDependentes = new Set(
      Object.values(this.questoesPrincipais).flat()
    );

    const questoesPrincipais = questoes.filter(
      (q) => !todasDependentes.has(q.id)
    );
    const questoesSorteadas: Questao[] = [];

    const adicionarQuestaoEDependentes = (questao: Questao) => {
      questoesSorteadas.push(questao);

      const dependentes = this.questoesPrincipais[questao.id];
      if (dependentes) {
        for (const depId of dependentes) {
          const questaoDependente = questoes.find((q) => q.id === depId);
          if (questaoDependente) {
            questoesSorteadas.push(questaoDependente);
          }
        }
      }
    };

    if (percentualRespondido < this.percentualMinimo) {
      const naoRespondidas = [...questoesPrincipais].filter(
        (q) => !questoesRespondidas.includes(q.id)
      );

      while (
        questoesSorteadas.length < quantidade &&
        naoRespondidas.length > 0
      ) {
        const idx = Math.floor(Math.random() * naoRespondidas.length);
        const questao = naoRespondidas.splice(idx, 1)[0];
        adicionarQuestaoEDependentes(questao);
      }
    } else {
      const disponiveis = [...questoesPrincipais];
      while (questoesSorteadas.length < quantidade && disponiveis.length > 0) {
        const idx = Math.floor(Math.random() * disponiveis.length);
        const questao = disponiveis.splice(idx, 1)[0];
        adicionarQuestaoEDependentes(questao);
      }
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
    this.carregarQuestoes(this.filtrosAtuais.cargo, this.filtrosAtuais.nivel);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
