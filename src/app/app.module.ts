import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {SplitPanelModule} from '@teamsoft/ui';

@NgModule({
    declarations: [
        AppComponent,
    ],
    imports: [
        BrowserModule,
        SplitPanelModule,
    ],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule { }
