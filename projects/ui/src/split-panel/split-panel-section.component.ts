import {Component, HostBinding, Input, ElementRef, Output, EventEmitter} from '@angular/core';

@Component({
    selector: 'ts-ui-split-panel-section',
    templateUrl: './split-panel-section.component.html',
})
export class SplitPanelSectionComponent {
    private _minSize!: string;

    private _maxSize!: string;

    @HostBinding('style.display')
    public display = 'flex';

    @Input()
    public get minSize(): string {
        return this._minSize;
    }

    public set minSize(value: string) {
        this._minSize = value;
        if (this.owner) {
            this.owner.panelSections.notifyOnChanges();
        }
    }

    @Input()
    public get maxSize(): string {
        return this._maxSize;
    }

    public set maxSize(value: string) {
        this._maxSize = value;
        if (this.owner) {
            this.owner.panelSections.notifyOnChanges();
        }
    }

    @Input()
    public resizable = true;

    @Output()
    public collapsedChange = new EventEmitter<boolean>();

    @HostBinding('style.order')
    public order!: number;

    @HostBinding('style.overflow')
    public overflow = 'auto';

    @HostBinding('style.min-width')
    public minWidth = '0';

    @HostBinding('style.max-width')
    public maxWidth = '100%';

    @HostBinding('style.min-height')
    public minHeight = '0';

    @HostBinding('style.max-height')
    public maxHeight = '100%';

    public owner: any;

    @Input()
    public get size() {
        return this._size;
    }

    public set size(value) {
        this._size = value;
        this.el.nativeElement.style.flex = this.flex;
    }

    public get isPercentageSize() {
        return this.size === 'auto' || this.size.indexOf('%') !== -1;
    }

    public get dragSize() {
        return this._dragSize;
    }

    public set dragSize(val) {
        this._dragSize = val;
        this.el.nativeElement.style.flex = this.flex;
    }

    public get element(): any {
        return this.el.nativeElement;
    }

    @HostBinding('style.flex')
    public get flex() {
        const isAuto = this.size === 'auto' && !this.dragSize;
        const grow = !isAuto ? 0 : 1;
        const size = this.dragSize || this.size;
        return `${grow} ${grow} ${size}`;
    }

    @Input()
    public set collapsed(value) {
        if (this.owner) {
            this._getSiblings().forEach(sibling => {
                sibling.size = 'auto';
                sibling.dragSize = null;
            });
        }
        this._collapsed = value;
        this.display = this._collapsed ? 'none' : 'flex';
        this.collapsedChange.emit(this._collapsed);
    }

    public get collapsed() {
        return this._collapsed;
    }

    private _size = 'auto';

    private _dragSize: any;

    private _collapsed = false;


    constructor(private el: ElementRef) {
    }

    public toggle() {
        this.collapsed = !this.collapsed;
    }

    private _getSiblings() {
        const panelSections = this.owner.panelSections.toArray();
        const index = panelSections.indexOf(this);
        const siblings = [];
        if (index !== 0) {
            siblings.push(panelSections[index - 1]);
        }
        if (index !== panelSections.length - 1) {
            siblings.push(panelSections[index + 1]);
        }
        return siblings;
    }
}
