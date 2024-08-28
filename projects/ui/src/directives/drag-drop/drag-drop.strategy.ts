import {Renderer2} from '@angular/core';
import {DragDirective, DropDirective} from './drag-drop.directive';


export interface IDropStrategy {
    dropAction: (drag: DragDirective, drop: DropDirective, atIndex: number) => void;
}

export class DefaultDropStrategy implements IDropStrategy {
    public dropAction() { }
}

export class AppendDropStrategy implements IDropStrategy {
    constructor(private _renderer: Renderer2) { }

    public dropAction(drag: DragDirective, drop: DropDirective) {
        const dragElement = drag.element.nativeElement;
        const dropAreaElement = drop.element.nativeElement;
        this._renderer.removeChild(dragElement.parentNode, dragElement);
        this._renderer.appendChild(dropAreaElement, dragElement);
    }
}

export class PrependDropStrategy implements IDropStrategy {
    constructor(private _renderer: Renderer2) { }

    public dropAction(drag: DragDirective, drop: DropDirective) {
        const dragElement = drag.element.nativeElement;
        const dropAreaElement = drop.element.nativeElement;
        this._renderer.removeChild(dragElement.parentNode, dragElement);
        if (dropAreaElement.children.length) {
            this._renderer.insertBefore(dropAreaElement, dragElement, dropAreaElement.children[0]);
        } else {
            this._renderer.appendChild(dropAreaElement, dragElement);
        }
    }
}

export class IgxInsertDropStrategy implements IDropStrategy {
    constructor(private _renderer: Renderer2) { }

    public dropAction(drag: DragDirective, drop: DropDirective, atIndex: number) {
        if (drag.element.nativeElement.parentElement === drop.element.nativeElement && atIndex === -1) {
            return;
        }

        const dragElement = drag.element.nativeElement;
        const dropAreaElement = drop.element.nativeElement;
        this._renderer.removeChild(dragElement.parentNode, dragElement);
        if (atIndex !== -1 && dropAreaElement.children.length > atIndex) {
            this._renderer.insertBefore(dropAreaElement, dragElement, dropAreaElement.children[atIndex]);
        } else {
            this._renderer.appendChild(dropAreaElement, dragElement);
        }
    }
}
