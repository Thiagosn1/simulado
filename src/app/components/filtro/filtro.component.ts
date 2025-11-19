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

  // Flag para mostrar/ocultar botão de resetar
  temFiltrosAtivos = false;

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
          this.filtroForm.patchValue(filtros);
          this.atualizarOpcoesDisponiveis();
          this.verificarFiltrosAtivos();
        }
      }
    });

    // Observar mudanças nos filtros para atualizar opções disponíveis
    this.filtroForm.valueChanges.subscribe(() => {
      this.atualizarOpcoesDisponiveis();
      this.verificarFiltrosAtivos();
    });
  }

  aplicarFiltros() {
    const valores = this.filtroForm.value as FiltroValues;
    this.filtroAplicado.emit(valores);
  }

  resetarFiltros() {
    // Resetar o formulário
    this.filtroForm.reset({
      cargo: '',
      nivel: '',
      banca: '',
    });

    // Limpar localStorage (apenas no browser)
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('filtrosAtuais');
    }

    // Aplicar filtros vazios (mostra todas as questões)
    this.aplicarFiltros();
  }

  private verificarFiltrosAtivos() {
    const valores = this.filtroForm.value as FiltroValues;
    this.temFiltrosAtivos = !!(valores.banca || valores.cargo || valores.nivel);
  }

  private atualizarOpcoesDisponiveis() {
    const valores = this.filtroForm.value as FiltroValues;

    // Extrair valores únicos e ordenar
    const bancasSet = new Set<string>();
    const cargosSet = new Set<string>();
    const niveisSet = new Set<string>();

    // Para cada tipo de filtro, considerar os outros filtros selecionados
    this.todasQuestoes.forEach((q) => {
      // Adicionar BANCA se atende os outros filtros (cargo/nível)
      const atendeCargoFiltro = !valores.cargo || q.cargo === valores.cargo;
      const atendeNivelFiltro = !valores.nivel || q.nivel === valores.nivel;

      if (atendeCargoFiltro && atendeNivelFiltro && q.banca) {
        bancasSet.add(q.banca);
      }

      // Adicionar CARGO se atende os outros filtros (banca/nível)
      const atendeBancaFiltro = !valores.banca || q.banca === valores.banca;
      const atendeNivelFiltro2 = !valores.nivel || q.nivel === valores.nivel;

      if (atendeBancaFiltro && atendeNivelFiltro2 && q.cargo) {
        cargosSet.add(q.cargo);
      }

      // Adicionar NÍVEL se atende os outros filtros (banca/cargo)
      const atendeBancaFiltro2 = !valores.banca || q.banca === valores.banca;
      const atendeCargoFiltro2 = !valores.cargo || q.cargo === valores.cargo;

      if (atendeBancaFiltro2 && atendeCargoFiltro2 && q.nivel) {
        niveisSet.add(q.nivel);
      }
    });

    this.bancasDisponiveis = Array.from(bancasSet).sort();
    this.cargosDisponiveis = Array.from(cargosSet).sort();
    this.niveisDisponiveis = Array.from(niveisSet).sort();
  }
}
