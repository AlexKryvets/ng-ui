import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {ResizableModule} from '@teamsoft/resizable';

@NgModule({
    declarations: [
        AppComponent,
    ],
    imports: [
        BrowserModule,
        ResizableModule,
    ],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule { }
