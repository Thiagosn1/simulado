import { Component } from '@angular/core';
import { ListaQuestoesComponent } from './components/lista-questoes/lista-questoes.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ListaQuestoesComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'banco-questoes';
}
