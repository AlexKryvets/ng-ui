import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {SplitPanelModule} from '@teamsoft/ui';
import {IgxSplitterModule} from 'igniteui-angular';

@NgModule({
    declarations: [
        AppComponent,
    ],
    imports: [
        BrowserModule,
        SplitPanelModule,
        IgxSplitterModule,
    ],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule { }
