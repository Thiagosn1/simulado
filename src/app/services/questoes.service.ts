import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Questao } from '../models/questao';

@Injectable({
  providedIn: 'root',
})
export class QuestoesService {
  private apiUrl = 'https://banco-questoes-api.onrender.com/api/questoes';

  constructor(private http: HttpClient) {}

  getQuestoes(
    cargo?: string,
    nivel?: string,
    banca?: string
  ): Observable<Questao[]> {
    let params = new HttpParams();

    if (cargo) params = params.set('cargo', cargo);
    if (nivel) params = params.set('nivel', nivel);
    if (banca) params = params.set('banca', banca);

    // Adicionar timestamp para evitar cache
    params = params.set('_t', Date.now().toString());

    return this.http.get<Questao[]>(this.apiUrl, {
      params,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  }
}
