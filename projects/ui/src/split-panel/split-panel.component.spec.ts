import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SplitPanelComponent} from './split-panel.component';

describe('UiComponent', () => {
    let component: SplitPanelComponent;
    let fixture: ComponentFixture<SplitPanelComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ SplitPanelComponent ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(SplitPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
