import { TestBed } from '@angular/core/testing';

import { QuestoesService } from './questoes.service';

describe('QuestoesService', () => {
  let service: QuestoesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuestoesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
