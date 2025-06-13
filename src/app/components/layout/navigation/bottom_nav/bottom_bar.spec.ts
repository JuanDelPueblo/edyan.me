import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottomBar } from './bottom_bar';

describe('BottomBar', () => {
  let component: BottomBar;
  let fixture: ComponentFixture<BottomBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomBar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BottomBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
