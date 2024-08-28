import {Component, EventEmitter, HostBinding, HostListener, Input, Output, ViewEncapsulation} from '@angular/core';
import {SplitPanelSectionComponent} from './split-panel-section.component';
import {DragDirection, IDragMoveEventArgs, IDragStartEventArgs} from '../directives/drag-drop/drag-drop.directive';
import {SplitPanelType} from './split-panel-type';

export const SPLITTER_INTERACTION_KEYS = new Set('right down left up arrowright arrowdown arrowleft arrowup'.split(' '));

@Component({
    selector: 'ts-ui-split-panel-bar',
    templateUrl: './split-panel-bar.component.html',
    styleUrls: [
        './split-panel-bar.component.scss',
    ],
    encapsulation: ViewEncapsulation.None,
})
export class SplitPanelBarComponent {

    @HostBinding('class.ts-ui-split-panel-bar-host')
    public cssClass = 'ts-ui-split-panel-bar-host';

    @Input()
    public type: SplitPanelType = SplitPanelType.Horizontal;

    @Input()
    public collapsible!: boolean;

    @HostBinding('style.order')
    @Input()
    public order!: number;

    @HostBinding('attr.tabindex')
    public get tabindex() {
        return this.resizeDisallowed ? null : 0;
    }

    @HostBinding('attr.aria-orientation')
    public get orientation() {
        return this.type === SplitPanelType.Horizontal ? 'horizontal' : 'vertical';
    }

    public get cursor() {
        if (this.resizeDisallowed) {
            return '';
        }
        return this.type === SplitPanelType.Horizontal ? 'col-resize' : 'row-resize';
    }

    @Input()
    public panelSection!: SplitPanelSectionComponent;

    @Input()
    public siblings!: Array<SplitPanelSectionComponent>;

    @Output()
    public moveStart = new EventEmitter<SplitPanelSectionComponent>();

    @Output()
    public moving = new EventEmitter<number>();

    @Output()
    public movingEnd = new EventEmitter<number>();

    private startPoint!: number;

    public get prevButtonHidden() {
        return this.siblings[0].collapsed && !this.siblings[1].collapsed;
    }

    @HostListener('keydown', ['$event'])
    public keyEvent(event: KeyboardEvent) {
        const key = event.key.toLowerCase();
        const ctrl = event.ctrlKey;
        event.stopPropagation();
        if (SPLITTER_INTERACTION_KEYS.has(key)) {
            event.preventDefault();
        }
        switch (key) {
            case 'arrowup':
            case 'up':
                if (this.type === SplitPanelType.Vertical) {
                    if (ctrl) {
                        this.onCollapsing(false);
                        break;
                    }
                    if (!this.resizeDisallowed) {
                        event.preventDefault();
                        this.moveStart.emit(this.panelSection);
                        this.moving.emit(10);
                    }
                }
                break;
            case 'arrowdown':
            case 'down':
                if (this.type === SplitPanelType.Vertical) {
                    if (ctrl) {
                        this.onCollapsing(true);
                        break;
                    }
                    if (!this.resizeDisallowed) {
                        event.preventDefault();
                        this.moveStart.emit(this.panelSection);
                        this.moving.emit(-10);
                    }
                }
                break;
            case 'arrowleft':
            case 'left':
                if (this.type === SplitPanelType.Horizontal) {
                    if (ctrl) {
                        this.onCollapsing(false);
                        break;
                    }
                    if (!this.resizeDisallowed) {
                        event.preventDefault();
                        this.moveStart.emit(this.panelSection);
                        this.moving.emit(10);
                    }
                }
                break;
            case 'arrowright':
            case 'right':
                if (this.type === SplitPanelType.Horizontal) {
                    if (ctrl) {
                        this.onCollapsing(true);
                        break;
                    }
                    if (!this.resizeDisallowed) {
                        event.preventDefault();
                        this.moveStart.emit(this.panelSection);
                        this.moving.emit(-10);
                    }
                }
                break;
            default:
                break;
        }
    }

    public get dragDir() {
        return this.type === SplitPanelType.Horizontal ? DragDirection.VERTICAL : DragDirection.HORIZONTAL;
    }

    public get nextButtonHidden() {
        return this.siblings[1].collapsed && !this.siblings[0].collapsed;
    }


    public onDragStart(event: IDragStartEventArgs) {
        if (this.resizeDisallowed) {
            event.cancel = true;
            return;
        }
        this.startPoint = this.type === SplitPanelType.Horizontal ? event.pageX : event.pageY;
        this.moveStart.emit(this.panelSection);
    }

    public onDragMove(event: IDragMoveEventArgs) {
        const isHorizontal = this.type === SplitPanelType.Horizontal;
        const curr = isHorizontal ? event.pageX : event.pageY;
        const delta = this.startPoint - curr;
        if (delta !== 0) {
            this.moving.emit(delta);
            event.cancel = true;
            event.owner.element.nativeElement.style.transform = '';
        }
    }

    public onDragEnd(event: any) {
        const isHorizontal = this.type === SplitPanelType.Horizontal;
        const curr = isHorizontal ? event.pageX : event.pageY;
        const delta = this.startPoint - curr;
        if (delta !== 0) {
            this.movingEnd.emit(delta);
        }
    }

    protected get resizeDisallowed() {
        const relatedTabs = this.siblings;
        return !!relatedTabs.find(x => x.resizable === false || x.collapsed === true);
    }

    public onCollapsing(next: boolean) {
        const prevSibling = this.siblings[0];
        const nextSibling = this.siblings[1];
        let target;
        if (next) {
            target = prevSibling.collapsed ? prevSibling : nextSibling;
        } else {
            target = nextSibling.collapsed ? nextSibling : prevSibling;
        }
        target.toggle();
    }
}
