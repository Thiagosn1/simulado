import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-filtro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './filtro.component.html',
  styleUrl: './filtro.component.css',
})
export class FiltroComponent {
  filtroForm: FormGroup;
  @Output() filtroAplicado = new EventEmitter<{
    cargo?: string;
    nivel?: string;
    banca?: string;
  }>();

  constructor(private fb: FormBuilder) {
    this.filtroForm = this.fb.group({
      cargo: [''],
      nivel: [''],
      banca: [''],
    });
  }

  aplicarFiltros() {
    const filtros = {
      cargo: this.filtroForm.get('cargo')?.value || '',
      nivel: this.filtroForm.get('nivel')?.value || '',
      banca: this.filtroForm.get('banca')?.value || '',
    };

    if (filtros.cargo) {
      filtros.cargo = this.formatCargo(filtros.cargo);
    }
    if (filtros.nivel) {
      filtros.nivel = this.formatNivel(filtros.nivel);
    }
    if (filtros.banca) {
      filtros.banca = this.formatBanca(filtros.banca);
    }

    console.log('Filtros antes de emitir:', filtros);
    this.filtroAplicado.emit(filtros);
  }

  private formatBanca(banca: string): string {
    const bancas: { [key: string]: string } = {
      funatec: 'FUNATEC',
      aroeira: 'Fundação Aroeira',
      ganzaroli: 'Ganzaroli Assessoria',
      verbena: 'Instituto Verbena/UFG',
      itame: 'Itame',
    };
    return bancas[banca.toLowerCase()] || banca;
  }

  private formatCargo(cargo: string): string {
    const cargos: { [key: string]: string } = {
      'assistente administrativo': 'Assistente Administrativo',
      'professor de informatica': 'Professor de Informática',
    };
    return cargos[cargo.toLowerCase()] || cargo;
  }

  private formatNivel(nivel: string): string {
    const niveis: { [key: string]: string } = {
      medio: 'Médio',
      superior: 'Superior',
    };

    return niveis[nivel] || nivel;
  }
}
