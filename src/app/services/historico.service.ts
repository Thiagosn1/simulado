import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

interface QuestaoRespondida {
  id: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class HistoricoService {
  private readonly DB_NAME = 'SimuladoDB';
  private readonly STORE_NAME = 'questoesRespondidas';
  private readonly DB_VERSION = 1;
  private db?: IDBDatabase;
  private historico$ = new BehaviorSubject<Set<string>>(new Set());

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.initDB();
    } else {
      console.warn(
        'IndexedDB não disponível - usando armazenamento em memória'
      );
    }
  }

  private async initDB(): Promise<void> {
    if (!window.indexedDB) {
      console.warn('IndexedDB não suportado - usando armazenamento em memória');
      return;
    }

    try {
      const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Erro ao abrir o banco:', request.error);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.carregarQuestoes();
      };
    } catch (error) {
      console.error('Erro ao inicializar IndexedDB:', error);
    }
  }

  private carregarQuestoes(): void {
    if (!this.db) return;

    const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Garantir que todos os IDs sejam strings
      const questoes = new Set(request.result.map((item) => String(item.id)));
      this.historico$.next(questoes);
      console.log('Questões carregadas do IndexedDB:', Array.from(questoes));
    };

    request.onerror = () => {
      console.error('Erro ao carregar questões:', request.error);
    };
  }

  getQuestoesRespondidas(): Set<string> {
    return new Set(this.historico$.value);
  }

  adicionarQuestaoRespondida(questaoId: string | number): void {
    // Garantir que sempre seja string
    const idString = String(questaoId);

    if (!this.db || !idString) {
      console.warn('Banco não inicializado ou ID inválido');
      return;
    }

    const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);

    const questao: QuestaoRespondida = {
      id: idString,
      timestamp: Date.now(),
    };

    const request = store.put(questao);

    request.onsuccess = () => {
      const questoes = new Set(this.historico$.value);
      questoes.add(idString);
      this.historico$.next(questoes);
      console.log(`Questão ${idString} adicionada ao histórico`);
    };

    request.onerror = () => {
      console.error('Erro ao adicionar questão:', request.error);
    };
  }

  limparHistorico(): void {
    if (!this.db) return;

    const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      this.historico$.next(new Set());
      console.log('Histórico limpo com sucesso');
    };

    request.onerror = () => {
      console.error('Erro ao limpar histórico:', request.error);
    };
  }

  getHistoricoObservable(): Observable<Set<string>> {
    return this.historico$.asObservable();
  }

  verificarQuestoesRespondidas(): void {
    if (!this.db) {
      console.log('Banco de dados não inicializado');
      return;
    }

    const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const questoes = request.result;
      console.log('Total de questões armazenadas:', questoes.length);
      console.log(
        'Questões:',
        questoes.map((q) => ({
          id: q.id,
          respondidaEm: new Date(q.timestamp).toLocaleString(),
        }))
      );
    };

    request.onerror = () => {
      console.error('Erro ao verificar questões:', request.error);
    };
  }

  async verificarTodasRespondidas(totalQuestoes: number): Promise<boolean> {
    if (!this.db) {
      console.warn('Banco de dados não inicializado');
      return false;
    }

    try {
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const questoesUnicas = new Set(request.result.map((q) => q.id));
          if (questoesUnicas.size >= totalQuestoes) {
            this.limparHistorico();
            console.log(
              'Todas as questões foram respondidas - Histórico limpo automaticamente'
            );
            resolve(true);
          } else {
            resolve(false);
          }
        };

        request.onerror = () => {
          console.error('Erro ao verificar total de questões:', request.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('Erro ao verificar questões respondidas:', error);
      return false;
    }
  }
}
