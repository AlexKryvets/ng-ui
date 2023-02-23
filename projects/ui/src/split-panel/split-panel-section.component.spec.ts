import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SplitPanelSectionComponent} from './split-panel-section.component';

describe('UiComponent', () => {
    let component: SplitPanelSectionComponent;
    let fixture: ComponentFixture<SplitPanelSectionComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ SplitPanelSectionComponent ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(SplitPanelSectionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
