import {NgModule} from '@angular/core';
import {SplitPanelComponent} from './split-panel.component';
import {SplitPanelSectionComponent} from './split-panel-section.component';

@NgModule({
    declarations: [
        SplitPanelComponent,
        SplitPanelSectionComponent,
    ],
    imports: [
    ],
    exports: [
        SplitPanelComponent,
        SplitPanelSectionComponent,
    ],
})
export class SplitPanelModule { }
