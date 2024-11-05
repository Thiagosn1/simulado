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
  }>();

  constructor(private fb: FormBuilder) {
    this.filtroForm = this.fb.group({
      cargo: [''],
      nivel: [''],
    });
  }

  aplicarFiltros() {
    const filtros = {
      cargo: this.filtroForm.get('cargo')?.value || '',
      nivel: this.filtroForm.get('nivel')?.value || '',
    };

    if (filtros.cargo) {
      filtros.cargo = this.formatCargo(filtros.cargo);
    }
    if (filtros.nivel) {
      filtros.nivel = this.formatNivel(filtros.nivel);
    }

    this.filtroAplicado.emit(filtros);
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
