import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ListaQuestoesComponent } from './components/lista-questoes/lista-questoes.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ListaQuestoesComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'banco-questoes';
}
