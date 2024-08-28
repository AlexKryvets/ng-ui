import {
    AfterContentInit,
    Component,
    ContentChildren,
    ElementRef,
    EventEmitter,
    HostBinding,
    Inject,
    Input,
    Output,
    QueryList,
} from '@angular/core';
import {SplitPanelSectionComponent} from './split-panel-section.component';
import {DOCUMENT} from '@angular/common';
import {SplitPanelType} from './split-panel-type';

export declare interface ISplitPanelBarResizeEventArgs {
    panelSection: SplitPanelSectionComponent;
    panelSectionSibling: SplitPanelSectionComponent;
}

@Component({
    selector: 'ts-ui-split-panel',
    templateUrl: './split-panel.component.html',
    styles: [],
})
export class SplitPanelComponent implements AfterContentInit {

    @ContentChildren(SplitPanelSectionComponent, {read: SplitPanelSectionComponent})
    public panelSections!: QueryList<SplitPanelSectionComponent>;

    @HostBinding('class.ts-ui-split-panel')
    public cssClass = 'ts-ui-split-panel';

    @HostBinding('style.overflow')
    public overflow = 'hidden';

    @HostBinding('style.display')
    public display = 'flex';

    @HostBinding('attr.aria-orientation')
    public get orientation() {
        return this.type === SplitPanelType.Horizontal ? 'horizontal' : 'vertical';
    }

    @Output()
    public resizeStart = new EventEmitter<ISplitPanelBarResizeEventArgs>();

    @Output()
    public resizing = new EventEmitter<ISplitPanelBarResizeEventArgs>();

    @Output()
    public resizeEnd = new EventEmitter<ISplitPanelBarResizeEventArgs>();

    private _type: SplitPanelType = SplitPanelType.Horizontal;

    private initialPaneSize!: number;

    private initialSiblingSize!: number;

    private panelSection!: SplitPanelSectionComponent;

    private panelSectionSibling!: SplitPanelSectionComponent;

    constructor(@Inject(DOCUMENT) public document: any, private elementRef: ElementRef) {
    }

    @Input()
    public collapsible = false;

    @Input()
    public get type() {
        return this._type;
    }

    public set type(value) {
        this._type = value;
        this.resetPaneSizes();
        this.panelSections?.notifyOnChanges();
    }

    @HostBinding('style.flex-direction')
    public get direction(): string {
        return this.type === SplitPanelType.Horizontal ? 'row' : 'column';
    }

    public ngAfterContentInit(): void {
        this.initPanes();
        this.panelSections.changes.subscribe(() => {
            this.initPanes();
        });
    }

    public onMoveStart(panelSection: SplitPanelSectionComponent) {
        const panelSections = this.panelSections.toArray();
        this.panelSection = panelSection;
        this.panelSectionSibling = panelSections[panelSections.indexOf(this.panelSection) + 1];

        const paneRect = this.panelSection.element.getBoundingClientRect();
        this.initialPaneSize = this.type === SplitPanelType.Horizontal ? paneRect.width : paneRect.height;

        const siblingRect = this.panelSectionSibling.element.getBoundingClientRect();
        this.initialSiblingSize = this.type === SplitPanelType.Horizontal ? siblingRect.width : siblingRect.height;
        const args: ISplitPanelBarResizeEventArgs = {panelSection: this.panelSection, panelSectionSibling: this.panelSectionSibling};
        this.resizeStart.emit(args);
    }

    public onMoving(delta: number) {
        const min = parseInt(this.panelSection.minSize, 10) || 0;
        const max = parseInt(this.panelSection.maxSize, 10) || this.initialPaneSize + this.initialSiblingSize;
        const minSibling = parseInt(this.panelSectionSibling.minSize, 10) || 0;
        const maxSibling = parseInt(this.panelSectionSibling.maxSize, 10) || this.initialPaneSize + this.initialSiblingSize;

        const paneSize = this.initialPaneSize - delta;
        const siblingSize = this.initialSiblingSize + delta;
        if (paneSize < min || paneSize > max || siblingSize < minSibling || siblingSize > maxSibling) {
            return;
        }
        this.panelSection.dragSize = paneSize + 'px';
        this.panelSectionSibling.dragSize = siblingSize + 'px';

        const args: ISplitPanelBarResizeEventArgs = {panelSection: this.panelSection, panelSectionSibling: this.panelSectionSibling};
        this.resizing.emit(args);
    }

    public onMoveEnd(delta: number) {
        const min = parseInt(this.panelSection.minSize, 10) || 0;
        const max = parseInt(this.panelSection.maxSize, 10) || this.initialPaneSize + this.initialSiblingSize;
        const minSibling = parseInt(this.panelSectionSibling.minSize, 10) || 0;
        const maxSibling = parseInt(this.panelSectionSibling.maxSize, 10) || this.initialPaneSize + this.initialSiblingSize;

        const paneSize = this.initialPaneSize - delta;
        const siblingSize = this.initialSiblingSize + delta;

        if (paneSize < min || paneSize > max || siblingSize < minSibling || siblingSize > maxSibling) {
            return;
        }
        if (this.panelSection.isPercentageSize) {
            const totalSize = this.getTotalSize();
            const percentPaneSize = (paneSize / totalSize) * 100;
            this.panelSection.size = percentPaneSize + '%';
        } else {
            this.panelSection.size = paneSize + 'px';
        }

        if (this.panelSectionSibling.isPercentageSize) {
            const totalSize = this.getTotalSize();
            const percentSiblingPaneSize = (siblingSize / totalSize) * 100;
            this.panelSectionSibling.size = percentSiblingPaneSize + '%';
        } else {
            this.panelSectionSibling.size = siblingSize + 'px';
        }
        this.panelSection.dragSize = null;
        this.panelSectionSibling.dragSize = null;

        const args: ISplitPanelBarResizeEventArgs = {panelSection: this.panelSection, panelSectionSibling: this.panelSectionSibling};
        this.resizeEnd.emit(args);
    }

    public getPanelSectionSiblingsByOrder(order: number, barIndex: number): Array<SplitPanelSectionComponent> {
        const panelSections = this.panelSections.toArray();
        const prevPane = panelSections[order - barIndex - 1];
        const nextPane = panelSections[order - barIndex];
        const siblings = [prevPane, nextPane];
        return siblings;
    }

    private getTotalSize() {
        const computed = this.document.defaultView.getComputedStyle(this.elementRef.nativeElement);
        const totalSize = this.type === SplitPanelType.Horizontal ? computed.getPropertyValue('width') : computed.getPropertyValue('height');
        return parseFloat(totalSize);
    }

    private initPanes() {
        this.panelSections.forEach(panelSection => {
            panelSection.owner = this;
            if (this.type === SplitPanelType.Horizontal) {
                panelSection.minWidth = panelSection.minSize ?? '0';
                panelSection.maxWidth = panelSection.maxSize ?? '100%';
            } else {
                panelSection.minHeight = panelSection.minSize ?? '0';
                panelSection.maxHeight = panelSection.maxSize ?? '100%';
            }
        });
        this.assignFlexOrder();
        if (this.panelSections.filter(x => x.collapsed).length > 0) {
            this.resetPaneSizes();
        }
    }

    private resetPaneSizes() {
        if (this.panelSections) {
            this.panelSections.forEach(x => {
                x.size = 'auto';
                x.minWidth = '0';
                x.maxWidth = '100%';
                x.minHeight = '0';
                x.maxHeight = '100%';
            });
        }
    }

    private assignFlexOrder() {
        let k = 0;
        this.panelSections.forEach((panelSection: SplitPanelSectionComponent) => {
            panelSection.order = k;
            k += 2;
        });
    }
}
