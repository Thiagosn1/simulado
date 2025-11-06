import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

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

  constructor(private fb: FormBuilder) {
    this.filtroForm = this.fb.group({
      cargo: [''],
      nivel: [''],
      banca: [''],
    });
  }

  ngOnInit() {
    // Carregar filtros salvos do localStorage
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
    }
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
}
