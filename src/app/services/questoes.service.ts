import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Questao } from '../models/questao';

@Injectable({
  providedIn: 'root',
})
export class QuestoesService {
  //private apiUrl = 'https://ff80f4e6-9b4e-4924-b8bc-8afa9cd87dd5-00-3499r2ob8iwxn.picard.replit.dev/api/questoes';
  private apiUrl = 'https://banco-questoes-api.onrender.com/api/questoes';

  constructor(private http: HttpClient) {}

  getQuestoes(cargo?: string, nivel?: string): Observable<Questao[]> {
    let params = new HttpParams();

    if (cargo) {
      params = params.set('cargo', cargo);
    }
    if (nivel) {
      params = params.set('nivel', nivel);
    }

    return this.http.get<Questao[]>(this.apiUrl, { params });
  }
}
