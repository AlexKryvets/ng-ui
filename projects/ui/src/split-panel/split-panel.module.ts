import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SplitPanelComponent} from './split-panel.component';
import {SplitPanelSectionComponent} from './split-panel-section.component';
import {SplitPanelBarComponent} from './split-panel-bar.component';
import {DragDropModule} from '../directives/drag-drop/drag-drop.directive';

@NgModule({
    declarations: [
        SplitPanelComponent,
        SplitPanelSectionComponent,
        SplitPanelBarComponent,
    ],
    imports: [
        CommonModule,
        DragDropModule,
    ],
    exports: [
        SplitPanelComponent,
        SplitPanelSectionComponent,
    ],
})
export class SplitPanelModule { }
