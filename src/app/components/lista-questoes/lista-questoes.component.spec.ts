import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaQuestoesComponent } from './lista-questoes.component';

describe('ListaQuestoesComponent', () => {
  let component: ListaQuestoesComponent;
  let fixture: ComponentFixture<ListaQuestoesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaQuestoesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ListaQuestoesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
