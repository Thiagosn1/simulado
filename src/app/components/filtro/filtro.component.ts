import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  EventEmitter,
  Inject,
  OnInit,
  Output,
  PLATFORM_ID,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { QuestoesService } from '../../services/questoes.service';
import { Questao } from '../../models/questao';

type FiltroValues = {
  cargo: string;
  nivel: string;
  banca: string;
};

type Mapeamentos = {
  banca: { [key: string]: string };
  cargo: { [key: string]: string };
  nivel: { [key: string]: string };
};

const MAPEAMENTOS: Mapeamentos = {
  banca: {
    funatec: 'FUNATEC',
    aroeira: 'Fundação Aroeira',
    ganzaroli: 'Ganzaroli Assessoria',
    verbena: 'Instituto Verbena/UFG',
    itame: 'ITAME',
    reis: 'Reis & Reis',
    'nao informada': 'Não informada',
  },
  cargo: {
    'assistente administrativo': 'Assistente Administrativo',
    'professor de informatica': 'Professor de Informática',
    'tecnico em informatica': 'Técnico em Informática',
    'secretario auxiliar': 'Secretário Auxiliar',
  },
  nivel: {
    fundamental: 'Fundamental',
    medio: 'Médio',
    superior: 'Superior',
  },
};

@Component({
  selector: 'app-filtro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './filtro.component.html',
  styleUrl: './filtro.component.css',
})
export class FiltroComponent implements OnInit {
  filtroForm: FormGroup;
  @Output() filtroAplicado = new EventEmitter<Partial<FiltroValues>>();

  // Listas dinâmicas de opções disponíveis
  bancasDisponiveis: string[] = [];
  cargosDisponiveis: string[] = [];
  niveisDisponiveis: string[] = [];

  // Todas as questões para filtrar
  private todasQuestoes: Questao[] = [];

  constructor(
    private fb: FormBuilder,
    private questoesService: QuestoesService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.filtroForm = this.fb.group({
      cargo: [''],
      nivel: [''],
      banca: [''],
    });
  }

  ngOnInit() {
    // Carregar todas as questões para obter as opções disponíveis
    this.questoesService.getQuestoes().subscribe((questoes) => {
      this.todasQuestoes = questoes;
      this.atualizarOpcoesDisponiveis();

      // Carregar filtros salvos do localStorage (apenas no browser)
      if (isPlatformBrowser(this.platformId)) {
        const filtrosSalvos = localStorage.getItem('filtrosAtuais');
        if (filtrosSalvos) {
          const filtros = JSON.parse(filtrosSalvos);

          // Converter os valores formatados de volta para as chaves do select
          const filtrosParaForm = {
            cargo: this.obterChavePorValor('cargo', filtros.cargo || ''),
            nivel: this.obterChavePorValor('nivel', filtros.nivel || ''),
            banca: this.obterChavePorValor('banca', filtros.banca || ''),
          };

          this.filtroForm.patchValue(filtrosParaForm);
          this.atualizarOpcoesDisponiveis();
        }
      }
    });

    // Observar mudanças nos filtros para atualizar opções disponíveis
    this.filtroForm.valueChanges.subscribe(() => {
      this.atualizarOpcoesDisponiveis();
    });
  }

  private obterChavePorValor(tipo: keyof Mapeamentos, valor: string): string {
    if (!valor) return '';

    const mapeamento = MAPEAMENTOS[tipo];
    const entrada = Object.entries(mapeamento).find(([_, v]) => v === valor);
    return entrada ? entrada[0] : '';
  }

  aplicarFiltros() {
    const valores = this.filtroForm.value as FiltroValues;

    const filtrosFormatados = Object.entries(valores).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: value ? this.formatarValor(key as keyof Mapeamentos, value) : '',
      }),
      {} as Partial<FiltroValues>
    );

    this.filtroAplicado.emit(filtrosFormatados);
  }

  private formatarValor(tipo: keyof Mapeamentos, valor: string): string {
    const mapeamento = MAPEAMENTOS[tipo];
    const chave = valor.toLowerCase();
    return mapeamento[chave] || valor;
  }

  private atualizarOpcoesDisponiveis() {
    const valores = this.filtroForm.value as FiltroValues;

    // Extrair valores únicos e ordenar
    const bancasSet = new Set<string>();
    const cargosSet = new Set<string>();
    const niveisSet = new Set<string>();

    // Para cada tipo de filtro, considerar os outros filtros selecionados
    this.todasQuestoes.forEach((q) => {
      // Adicionar BANCA se: não tem banca selecionada E atende os outros filtros (cargo/nível)
      if (!valores.banca) {
        const atendeCargoFiltro =
          !valores.cargo ||
          q.cargo === this.formatarValor('cargo', valores.cargo);
        const atendeNivelFiltro =
          !valores.nivel ||
          q.nivel === this.formatarValor('nivel', valores.nivel);

        if (atendeCargoFiltro && atendeNivelFiltro && q.banca) {
          bancasSet.add(q.banca);
        }
      }

      // Adicionar CARGO se: não tem cargo selecionado E atende os outros filtros (banca/nível)
      if (!valores.cargo) {
        const atendeBancaFiltro =
          !valores.banca ||
          q.banca === this.formatarValor('banca', valores.banca);
        const atendeNivelFiltro =
          !valores.nivel ||
          q.nivel === this.formatarValor('nivel', valores.nivel);

        if (atendeBancaFiltro && atendeNivelFiltro && q.cargo) {
          cargosSet.add(q.cargo);
        }
      }

      // Adicionar NÍVEL se: não tem nível selecionado E atende os outros filtros (banca/cargo)
      if (!valores.nivel) {
        const atendeBancaFiltro =
          !valores.banca ||
          q.banca === this.formatarValor('banca', valores.banca);
        const atendeCargoFiltro =
          !valores.cargo ||
          q.cargo === this.formatarValor('cargo', valores.cargo);

        if (atendeBancaFiltro && atendeCargoFiltro && q.nivel) {
          niveisSet.add(q.nivel);
        }
      }
    });

    this.bancasDisponiveis = Array.from(bancasSet).sort();
    this.cargosDisponiveis = Array.from(cargosSet).sort();
    this.niveisDisponiveis = Array.from(niveisSet).sort();
  }

  // Converter valor formatado de volta para a chave do select
  obterChaveSelect(tipo: keyof Mapeamentos, valorFormatado: string): string {
    if (!valorFormatado) return '';
    const mapeamento = MAPEAMENTOS[tipo];
    const entrada = Object.entries(mapeamento).find(
      ([_, v]) => v === valorFormatado
    );
    return entrada ? entrada[0] : '';
  }
}
