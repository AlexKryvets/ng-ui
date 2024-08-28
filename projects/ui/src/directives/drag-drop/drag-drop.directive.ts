import {
    Directive,
    ElementRef,
    EventEmitter,
    HostBinding,
    HostListener,
    Input,
    NgModule,
    NgZone,
    OnDestroy,
    OnInit,
    Output,
    Renderer2,
    ChangeDetectorRef,
    ViewContainerRef,
    AfterContentInit,
    TemplateRef,
    ContentChildren,
    QueryList, EmbeddedViewRef,
} from '@angular/core';
import {animationFrameScheduler, fromEvent, interval, Subject} from 'rxjs';
import {takeUntil, throttle} from 'rxjs/operators';
import {IDropStrategy, DefaultDropStrategy} from './drag-drop.strategy';

enum DragScrollDirection {
    UP,
    DOWN,
    LEFT,
    RIGHT,
}

export enum DragDirection {
    VERTICAL,
    HORIZONTAL,
    BOTH,
}

export interface IDragCustomEventDetails {
    startX: number;
    startY: number;
    pageX: number;
    pageY: number;
    owner: DragDirective;
    originalEvent: any;
}

export interface IBaseEventArgs {
    owner?: any;
}

export interface IDropBaseEventArgs extends IBaseEventArgs {

    originalEvent: any;

    owner: DropDirective;

    drag: DragDirective;

    dragData: any;

    startX: number;

    startY: number;

    pageX: number;

    pageY: number;

    offsetX: number;

    offsetY: number;
}

export interface IDropDroppedEventArgs extends IDropBaseEventArgs {
    cancel: boolean;
}

export interface IDragBaseEventArgs extends IBaseEventArgs {

    originalEvent: PointerEvent | MouseEvent | TouchEvent;

    owner: DragDirective;

    startX: number;

    startY: number;

    pageX: number;

    pageY: number;
}

export interface IDragStartEventArgs extends IDragBaseEventArgs {
    cancel: boolean;
}

export interface IDragMoveEventArgs extends IDragStartEventArgs {
    nextPageX: number;
    nextPageY: number;
}


export interface IDragGhostBaseEventArgs extends IBaseEventArgs {
    owner: DragDirective;
    ghostElement: any;
    cancel: boolean;
}

export interface IDragCustomTransitionArgs {
    duration?: number;
    timingFunction?: string;
    delay?: number;
}

export class DragLocation {
    public pageX: number;

    public pageY: number;

    constructor(private _pageX: any, private _pageY: any) {
        this.pageX = parseFloat(_pageX);
        this.pageY = parseFloat(_pageY);
    }
}

@Directive({
    selector: '[tsUiDragHandle]',
})
export class DragHandleDirective {

    @HostBinding('class.ts-ui-drag__handle')
    public baseClass = true;

    constructor(public element: ElementRef<any>) {}
}

@Directive({
    selector: '[tsUiDragIgnore]',
})
export class DragIgnoreDirective {

    @HostBinding('class.ts-ui-drag__ignore')
    public baseClass = true;

    constructor(public element: ElementRef<any>) {}
}

@Directive({
    selector: '[tsUiDrag]',
})
export class DragDirective implements AfterContentInit, OnDestroy {
    @Input('tsUiDrag')
    public set data(value: any) {
        this._data = value;
    }

    public get data(): any {
        return this._data;
    }

    @Input()
    public dragTolerance = 5;

    @Input()
    public dragDirection = DragDirection.BOTH;

    @Input()
    public dragChannel!: number | string | number[] | string[];

    @Input()
    public ghost = true;

    @Input()
    public ghostClass = '';


    @Input()
    public ghostTemplate!: TemplateRef<any>;

    @Input()
    public ghostHost!: HTMLElement;

    @Input()
    public scrollContainer: HTMLElement | null = null;

    @Output()
    public dragStart = new EventEmitter<IDragStartEventArgs>();

    @Output()
    public dragMove = new EventEmitter<IDragMoveEventArgs>();

    @Output()
    public dragEnd = new EventEmitter<IDragBaseEventArgs>();

    @Output()
    public dragClick = new EventEmitter<IDragBaseEventArgs>();

    @Output()
    public ghostCreate = new EventEmitter<IDragGhostBaseEventArgs>();

    @Output()
    public ghostDestroy = new EventEmitter<IDragGhostBaseEventArgs>();

    @Output()
    public transitioned = new EventEmitter<IDragBaseEventArgs>();


    @ContentChildren(DragHandleDirective, {descendants: true})
    public dragHandles!: QueryList<DragHandleDirective>;


    @ContentChildren(DragIgnoreDirective, {descendants: true})
    public dragIgnoredElems!: QueryList<DragIgnoreDirective>;


    @HostBinding('class.ts-ui-drag')
    public baseClass = true;


    @HostBinding('class.ts-ui-drag--select-disabled')
    public selectDisabled = false;

    public get location(): DragLocation {
        return new DragLocation(this.pageX, this.pageY);
    }

    public get originLocation(): DragLocation {
        return new DragLocation(this.baseOriginLeft, this.baseOriginTop);
    }


    public get pointerEventsEnabled() {
        return typeof PointerEvent !== 'undefined';
    }


    public get touchEventsEnabled() {
        return 'ontouchstart' in window;
    }


    public get pageX() {
        if (this.ghost && this.ghostElement) {
            return this.ghostLeft;
        }
        return this.baseLeft + this.windowScrollLeft;
    }


    public get pageY() {
        if (this.ghost && this.ghostElement) {
            return this.ghostTop;
        }
        return this.baseTop + this.windowScrollTop;
    }

    protected get baseLeft(): number {
        return this.element.nativeElement.getBoundingClientRect().left;
    }

    protected get baseTop(): number {
        return this.element.nativeElement.getBoundingClientRect().top;
    }

    protected get baseOriginLeft(): number {
        return this.baseLeft - this.getTransformX(this.element.nativeElement);
    }

    protected get baseOriginTop(): number {
        return this.baseTop - this.getTransformY(this.element.nativeElement);
    }

    protected set ghostLeft(pageX: number) {
        if (this.ghostElement) {
            const ghostMarginLeft = parseInt((document as any).defaultView.getComputedStyle(this.ghostElement)['margin-left'], 10);
            this.ghostElement.style.left = (pageX - ghostMarginLeft - this._ghostHostX) + 'px';
        }
    }

    protected get ghostLeft(): any {
        if (this.ghostElement) {
            return parseInt(this.ghostElement.style.left, 10) + this._ghostHostX;
        }
    }

    protected set ghostTop(pageY: number) {
        if (this.ghostElement) {
            const ghostMarginTop = parseInt((document as any).defaultView.getComputedStyle(this.ghostElement)['margin-top'], 10);
            this.ghostElement.style.top = (pageY - ghostMarginTop - this._ghostHostY) + 'px';
        }
    }

    protected get ghostTop(): any {
        if (this.ghostElement) {
            return parseInt(this.ghostElement.style.top, 10) + this._ghostHostY;
        }
    }

    protected get windowScrollTop() {
        return document.documentElement.scrollTop || window.scrollY;
    }

    protected get windowScrollLeft() {
        return document.documentElement.scrollLeft || window.scrollX;
    }

    protected get windowScrollHeight() {
        return document.documentElement.scrollHeight;
    }

    protected get windowScrollWidth() {
        return document.documentElement.scrollWidth;
    }


    public defaultReturnDuration = '0.5s';


    public ghostElement: any;


    public animInProgress = false;

    protected ghostContext: any = null;

    protected _startX = 0;

    protected _startY = 0;

    protected _lastX = 0;

    protected _lastY = 0;

    protected _dragStarted = false;

    protected _defaultOffsetX!: number;

    protected _defaultOffsetY!: number;

    protected _offsetX!: number;

    protected _offsetY!: number;

    protected _ghostStartX!: number;

    protected _ghostStartY!: number;

    protected _ghostHostX = 0;

    protected _ghostHostY = 0;

    protected _dynamicGhostRef: EmbeddedViewRef<any> | null = null;

    protected _pointerDownId = null;

    protected _clicked = false;

    protected _lastDropArea = null;

    protected _destroy = new Subject<boolean>();

    protected _removeOnDestroy = true;

    protected _data: any;

    protected _scrollContainer = null;

    protected _originalScrollContainerWidth = 0;

    protected _originalScrollContainerHeight = 0;

    protected _scrollContainerStep = 5;

    protected _scrollContainerStepMs = 10;

    protected _scrollContainerThreshold = 25;

    protected _containerScrollIntervalId: number | null = null;

    @Input()
    public set ghostOffsetX(value: any) {
        this._offsetX = parseInt(value, 10);
    }

    public get ghostOffsetX() {
        return this._offsetX !== undefined ? this._offsetX : this._defaultOffsetX;
    }

    @Input()
    public set ghostOffsetY(value: any) {
        this._offsetY = parseInt(value, 10);
    }

    public get ghostOffsetY() {
        return this._offsetY !== undefined ? this._offsetY : this._defaultOffsetY ;
    }

    constructor(
        public cdr: ChangeDetectorRef,
        public element: ElementRef,
        public viewContainer: ViewContainerRef,
        public zone: NgZone,
        public renderer: Renderer2,
    ) {
    }


    public ngAfterContentInit() {
        if (!this.dragHandles || !this.dragHandles.length ) {
            this.selectDisabled = true;
        }

        this.zone.runOutsideAngular(() => {
            const targetElements = this.dragHandles && this.dragHandles.length ?
                this.dragHandles.map((item) => item.element.nativeElement) : [this.element.nativeElement];
            targetElements.forEach((element) => {
                if (this.pointerEventsEnabled) {
                    fromEvent(element, 'pointerdown').pipe(takeUntil(this._destroy))
                        .subscribe((res) => this.onPointerDown(res));

                    fromEvent(element, 'pointermove').pipe(
                        throttle(() => interval(0, animationFrameScheduler)),
                        takeUntil(this._destroy),
                    ).subscribe((res) => this.onPointerMove(res));

                    fromEvent(element, 'pointerup').pipe(takeUntil(this._destroy))
                        .subscribe((res) => this.onPointerUp(res));

                    if (!this.ghost) {
                        fromEvent(element, 'lostpointercapture').pipe(takeUntil(this._destroy))
                            .subscribe((res) => this.onPointerLost(res));
                    }
                } else if (this.touchEventsEnabled) {
                    fromEvent(element, 'touchstart').pipe(takeUntil(this._destroy))
                        .subscribe((res) => this.onPointerDown(res));
                } else {
                    fromEvent(element, 'mousedown').pipe(takeUntil(this._destroy))
                        .subscribe((res) => this.onPointerDown(res));
                }
            });

            if (!this.pointerEventsEnabled && this.touchEventsEnabled) {
                fromEvent((document as any).defaultView, 'touchmove').pipe(
                    throttle(() => interval(0, animationFrameScheduler)),
                    takeUntil(this._destroy),
                ).subscribe((res) => this.onPointerMove(res));

                fromEvent((document as any).defaultView, 'touchend').pipe(takeUntil(this._destroy))
                    .subscribe((res) => this.onPointerUp(res));
            } else if (!this.pointerEventsEnabled) {
                fromEvent((document as any).defaultView, 'mousemove').pipe(
                    throttle(() => interval(0, animationFrameScheduler)),
                    takeUntil(this._destroy),
                ).subscribe((res) => this.onPointerMove(res));

                fromEvent((document as any).defaultView, 'mouseup').pipe(takeUntil(this._destroy))
                    .subscribe((res) => this.onPointerUp(res));
            }

            this.element.nativeElement.addEventListener('transitionend', (args: any) => {
                this.onTransitionEnd(args);
            });
        });

        this.element.nativeElement.style.transitionDuration = '0.0s';
    }


    public ngOnDestroy() {
        this._destroy.next(true);
        this._destroy.complete();

        if (this.ghost && this.ghostElement && this._removeOnDestroy) {
            this.ghostElement.parentNode?.removeChild(this.ghostElement);
            this.ghostElement = null;

            if (this._dynamicGhostRef) {
                this._dynamicGhostRef.destroy();
                this._dynamicGhostRef = null;
            }
        }

        if (this._containerScrollIntervalId) {
            clearInterval(this._containerScrollIntervalId);
            this._containerScrollIntervalId = null;
        }
    }

    public setLocation(newLocation: DragLocation) {
        if (this.ghost && this.ghostElement) {
            const offsetHostX = this.ghostHost ? this.ghostHostOffsetLeft(this.ghostHost) : 0;
            const offsetHostY = this.ghostHost ? this.ghostHostOffsetTop(this.ghostHost) : 0;
            this.ghostLeft = newLocation.pageX - offsetHostX + this.windowScrollLeft;
            this.ghostTop = newLocation.pageY - offsetHostY + this.windowScrollTop;
        } else if (!this.ghost) {
            const deltaX = newLocation.pageX - this.pageX;
            const deltaY = newLocation.pageY - this.pageY;
            const transformX = this.getTransformX(this.element.nativeElement);
            const transformY = this.getTransformY(this.element.nativeElement);
            this.setTransformXY(transformX + deltaX, transformY + deltaY);
        }

        this._startX = this.baseLeft;
        this._startY = this.baseTop;
    }

    public transitionToOrigin(customAnimArgs?: IDragCustomTransitionArgs, startLocation?: DragLocation) {
        if ((!!startLocation && startLocation.pageX === this.baseOriginLeft && startLocation.pageY === this.baseOriginLeft) ||
            (!startLocation && this.ghost && !this.ghostElement)) {
            return;
        }

        if (!!startLocation && startLocation.pageX !== this.pageX && startLocation.pageY !== this.pageY) {
            if (this.ghost && !this.ghostElement) {
                this._startX = startLocation.pageX;
                this._startY = startLocation.pageY;
                this._ghostStartX = this._startX;
                this._ghostStartY = this._startY;
                this.createGhost(this._startX, this._startY);
            }

            this.setLocation(startLocation);
        }

        this.animInProgress = true;
        setTimeout(() => {
            if (this.ghost) {
                this.ghostElement.style.transitionProperty = 'top, left';
                this.ghostElement.style.transitionDuration =
                    customAnimArgs && customAnimArgs.duration ? customAnimArgs.duration + 's' : this.defaultReturnDuration ;
                this.ghostElement.style.transitionTimingFunction =
                    customAnimArgs && customAnimArgs.timingFunction ? customAnimArgs.timingFunction : '';
                this.ghostElement.style.transitionDelay = customAnimArgs && customAnimArgs.delay ? customAnimArgs.delay + 's' : '';
                this.setLocation(new DragLocation(this.baseLeft, this.baseTop));
            } else if (!this.ghost) {
                this.element.nativeElement.style.transitionProperty = 'transform';
                this.element.nativeElement.style.transitionDuration =
                    customAnimArgs && customAnimArgs.duration ? customAnimArgs.duration + 's' : this.defaultReturnDuration ;
                this.element.nativeElement.style.transitionTimingFunction =
                    customAnimArgs && customAnimArgs.timingFunction ? customAnimArgs.timingFunction : '';
                this.element.nativeElement.style.transitionDelay = customAnimArgs && customAnimArgs.delay ? customAnimArgs.delay + 's' : '';
                this._startX = this.baseLeft;
                this._startY = this.baseTop;
                this.setTransformXY(0, 0);
            }
        }, 0);
    }

    public transitionTo(target: DragLocation | ElementRef, customAnimArgs?: IDragCustomTransitionArgs, startLocation?: DragLocation) {
        if (!!startLocation && this.ghost && !this.ghostElement) {
            this._startX = startLocation.pageX;
            this._startY = startLocation.pageY;
            this._ghostStartX = this._startX;
            this._ghostStartY = this._startY;
        } else if (!!startLocation && (!this.ghost || this.ghostElement)) {
            this.setLocation(startLocation);
        } else if (this.ghost && !this.ghostElement) {
            this._startX = this.baseLeft;
            this._startY = this.baseTop;
            this._ghostStartX = this._startX + this.windowScrollLeft;
            this._ghostStartY = this._startY + this.windowScrollTop;
        }

        if (this.ghost && !this.ghostElement) {
            this.createGhost(this._startX, this._startY);
        }

        this.animInProgress = true;
        setTimeout(() => {
            const movedElem = this.ghost ? this.ghostElement : this.element.nativeElement;
            movedElem.style.transitionProperty = this.ghost && this.ghostElement ? 'left, top' : 'transform';
            movedElem.style.transitionDuration =
                customAnimArgs && customAnimArgs.duration ? customAnimArgs.duration + 's' : this.defaultReturnDuration ;
            movedElem.style.transitionTimingFunction =
                customAnimArgs && customAnimArgs.timingFunction ? customAnimArgs.timingFunction : '';
            movedElem.style.transitionDelay = customAnimArgs && customAnimArgs.delay ? customAnimArgs.delay + 's' : '';

            if (target instanceof DragLocation) {
                this.setLocation(new DragLocation(target.pageX, target.pageY));
            } else {
                const targetRects = target.nativeElement.getBoundingClientRect();
                this.setLocation(new DragLocation(
                    targetRects.left -  this.windowScrollLeft,
                    targetRects.top - this.windowScrollTop,
                ));
            }
        }, 0);
    }

    public onPointerDown(event: any) {
        const ignoredElement = this.dragIgnoredElems.find(elem => elem.element.nativeElement === event.target);
        if (ignoredElement) {
            return;
        }

        this._clicked = true;
        this._pointerDownId = event.pointerId;

        const handleFound = this.dragHandles.find(handle => handle.element.nativeElement === event.currentTarget);
        const targetElement = handleFound ? handleFound.element.nativeElement : this.element.nativeElement;
        if (this.pointerEventsEnabled) {
            targetElement.setPointerCapture(this._pointerDownId);
        } else {
            targetElement.focus();
            event.preventDefault();
        }

        if (this.pointerEventsEnabled || !this.touchEventsEnabled) {
            this._startX = event.pageX;
            this._startY = event.pageY;
        } else if (this.touchEventsEnabled) {
            this._startX = event.touches[0].pageX;
            this._startY = event.touches[0].pageY;
        }

        this._defaultOffsetX = this.baseLeft - this._startX + this.windowScrollLeft;
        this._defaultOffsetY = this.baseTop - this._startY + this.windowScrollTop;
        this._ghostStartX = this._startX + this.ghostOffsetX;
        this._ghostStartY = this._startY + this.ghostOffsetY;
        this._lastX = this._startX;
        this._lastY = this._startY;
    }

    public onPointerMove(event: any) {
        if (this._clicked) {
            let pageX; let pageY;
            if (this.pointerEventsEnabled || !this.touchEventsEnabled) {
                pageX = event.pageX;
                pageY = event.pageY;
            } else if (this.touchEventsEnabled) {
                pageX = event.touches[0].pageX;
                pageY = event.touches[0].pageY;

                event.preventDefault();
            }

            const totalMovedX = pageX - this._startX;
            const totalMovedY = pageY - this._startY;
            if (!this._dragStarted &&
                (Math.abs(totalMovedX) > this.dragTolerance || Math.abs(totalMovedY) > this.dragTolerance)) {
                const dragStartArgs: IDragStartEventArgs = {
                    originalEvent: event,
                    owner: this,
                    startX: pageX - totalMovedX,
                    startY: pageY - totalMovedY,
                    pageX,
                    pageY,
                    cancel: false,
                };
                this.zone.run(() => {
                    this.dragStart.emit(dragStartArgs);
                });

                if (!dragStartArgs.cancel) {
                    this._dragStarted = true;
                    if (this.ghost) {
                        this.createGhost(pageX, pageY);
                    } else if (this._offsetX !== undefined || this._offsetY !== undefined) {
                        const transformX = (this._offsetX !== undefined ? this._offsetX - this._defaultOffsetX : 0) +
                            this.getTransformX(this.element.nativeElement);
                        const transformY = (this._offsetY !== undefined ? this._offsetY - this._defaultOffsetY : 0) +
                            this.getTransformY(this.element.nativeElement);
                        this.setTransformXY(transformX, transformY);
                    }
                } else {
                    return;
                }
            } else if (!this._dragStarted) {
                return;
            }

            const moveArgs: IDragMoveEventArgs = {
                originalEvent: event,
                owner: this,
                startX: this._startX,
                startY: this._startY,
                pageX: this._lastX,
                pageY: this._lastY,
                nextPageX: pageX,
                nextPageY: pageY,
                cancel: false,
            };
            this.dragMove.emit(moveArgs);

            const setPageX = moveArgs.nextPageX;
            const setPageY = moveArgs.nextPageY;
            if (!moveArgs.cancel) {
                this.onScrollContainer();

                if (this.ghost) {
                    const updatedTotalMovedX = this.dragDirection === DragDirection.VERTICAL ? 0 : setPageX - this._startX;
                    const updatedTotalMovedY = this.dragDirection === DragDirection.HORIZONTAL ? 0 : setPageY - this._startY;
                    this.ghostLeft = this._ghostStartX + updatedTotalMovedX;
                    this.ghostTop = this._ghostStartY + updatedTotalMovedY;
                } else {
                    const lastMovedX = this.dragDirection === DragDirection.VERTICAL ? 0 : setPageX - this._lastX;
                    const lastMovedY = this.dragDirection === DragDirection.HORIZONTAL ? 0 : setPageY - this._lastY;
                    const translateX = this.getTransformX(this.element.nativeElement) + lastMovedX;
                    const translateY = this.getTransformY(this.element.nativeElement) + lastMovedY;
                    this.setTransformXY(translateX, translateY);
                }
                this.dispatchDragEvents(pageX, pageY, event);
            }

            this._lastX = setPageX;
            this._lastY = setPageY;
        }
    }

    public onPointerUp(event: any) {
        if (!this._clicked) {
            return;
        }

        let pageX; let pageY;
        if (this.pointerEventsEnabled || !this.touchEventsEnabled) {
            pageX = event.pageX;
            pageY = event.pageY;
        } else if (this.touchEventsEnabled) {
            pageX = event.touches[0].pageX;
            pageY = event.touches[0].pageY;

            event.preventDefault();
        }

        const eventArgs: IDragBaseEventArgs = {
            originalEvent: event,
            owner: this,
            startX: this._startX,
            startY: this._startY,
            pageX,
            pageY,
        };
        this._pointerDownId = null;
        this._clicked = false;
        if (this._dragStarted) {
            if (this._lastDropArea && this._lastDropArea !== this.element.nativeElement ) {
                this.dispatchDropEvent(event.pageX, event.pageY, event);
            }

            this.zone.run(() => {
                this.dragEnd.emit(eventArgs);
            });

            if (!this.animInProgress) {
                this.onTransitionEnd(null);
            }
        } else {
            this.zone.run(() => {
                this.dragClick.emit(eventArgs);
            });
        }

        if (this._containerScrollIntervalId) {
            clearInterval(this._containerScrollIntervalId);
            this._containerScrollIntervalId = null;
        }
    }

    public onPointerLost(event: any) {
        if (!this._clicked) {
            return;
        }

        const eventArgs = {
            originalEvent: event,
            owner: this,
            startX: this._startX,
            startY: this._startY,
            pageX: event.pageX,
            pageY: event.pageY,
        };
        this._pointerDownId = null;
        this._clicked = false;
        if (this._dragStarted) {
            this.zone.run(() => {
                this.dragEnd.emit(eventArgs);
            });
            if (!this.animInProgress) {
                this.onTransitionEnd(null);
            }
        }
    }


    public onTransitionEnd(event: any) {
        if ((!this._dragStarted && !this.animInProgress) || this._clicked) {
            return;
        }

        if (this.ghost && this.ghostElement) {
            this._ghostStartX = this.baseLeft + this.windowScrollLeft;
            this._ghostStartY = this.baseTop + this.windowScrollTop;

            const ghostDestroyArgs: IDragGhostBaseEventArgs = {
                owner: this,
                ghostElement: this.ghostElement,
                cancel: false,
            };
            this.ghostDestroy.emit(ghostDestroyArgs);
            if (ghostDestroyArgs.cancel) {
                return;
            }
            this.ghostElement.parentNode.removeChild(this.ghostElement);
            this.ghostElement = null;
            if (this._dynamicGhostRef) {
                this._dynamicGhostRef.destroy();
                this._dynamicGhostRef = null;
            }
        } else if (!this.ghost) {
            this.element.nativeElement.style.transitionProperty = '';
            this.element.nativeElement.style.transitionDuration = '0.0s';
            this.element.nativeElement.style.transitionTimingFunction = '';
            this.element.nativeElement.style.transitionDelay = '';
        }
        this.animInProgress = false;
        this._dragStarted = false;

        this.zone.run(() => {
            this.transitioned.emit({
                originalEvent: event,
                owner: this,
                startX: this._startX,
                startY: this._startY,
                pageX: this._startX,
                pageY: this._startY,
            });
        });
    }

    protected createGhost(pageX: number, pageY: number, node: any = null) {
        if (!this.ghost) {
            return;
        }

        if (this.ghostTemplate) {
            this._dynamicGhostRef = this.viewContainer.createEmbeddedView(this.ghostTemplate, this.ghostContext);
            this.ghostElement = this._dynamicGhostRef.rootNodes[0];
        } else {
            this.ghostElement = node ? node.cloneNode(true) : this.element.nativeElement.cloneNode(true);
        }

        const totalMovedX = pageX - this._startX;
        const totalMovedY = pageY - this._startY;
        this._ghostHostX = this.ghostHost ? this.ghostHostOffsetLeft(this.ghostHost) : 0;
        this._ghostHostY = this.ghostHost ? this.ghostHostOffsetTop(this.ghostHost) : 0;

        this.ghostElement.style.transitionDuration = '0.0s';
        this.ghostElement.style.position = 'absolute';


        if (this.ghostClass) {
            this.renderer.addClass(this.ghostElement, this.ghostClass);
        }

        const createEventArgs = {
            owner: this,
            ghostElement: this.ghostElement,
            cancel: false,
        };
        this.ghostCreate.emit(createEventArgs);
        if (createEventArgs.cancel) {
            this.ghostElement = null;
            if (this.ghostTemplate && this._dynamicGhostRef) {
                this._dynamicGhostRef.destroy();
            }
            return;
        }

        if (this.ghostHost) {
            this.ghostHost.appendChild(this.ghostElement);
        } else {
            document.body.appendChild(this.ghostElement);
        }

        const ghostMarginLeft = parseInt((document as any).defaultView.getComputedStyle(this.ghostElement)['margin-left'], 10);
        const ghostMarginTop = parseInt((document as any).defaultView.getComputedStyle(this.ghostElement)['margin-top'], 10);
        this.ghostElement.style.left = (this._ghostStartX - ghostMarginLeft + totalMovedX - this._ghostHostX) + 'px';
        this.ghostElement.style.top = (this._ghostStartY - ghostMarginTop + totalMovedY - this._ghostHostY) + 'px';

        if (this.pointerEventsEnabled) {
            if (this._pointerDownId !== null) {
                this.ghostElement.setPointerCapture(this._pointerDownId);
            }
            this.ghostElement.addEventListener('pointermove', (args: any) => {
                this.onPointerMove(args);
            });
            this.ghostElement.addEventListener('pointerup', (args: any) => {
                this.onPointerUp(args);
            });
            this.ghostElement.addEventListener('lostpointercapture', (args: any) => {
                this.onPointerLost(args);
            });
        }

        this.ghostElement.addEventListener('transitionend', (args: any) => {
            this.onTransitionEnd(args);
        });

        this.cdr.detectChanges();
    }

    protected dispatchDragEvents(pageX: number, pageY: number, originalEvent: any) {
        let topDropArea;
        const customEventArgs: IDragCustomEventDetails = {
            startX: this._startX,
            startY: this._startY,
            pageX,
            pageY,
            owner: this,
            originalEvent,
        };

        const elementsFromPoint = this.getElementsAtPoint(pageX, pageY);
        let targetElements: any[] = [];
        for (const elFromPoint of elementsFromPoint) {
            if (!!elFromPoint?.shadowRoot) {
                targetElements = targetElements.concat(this.getFromShadowRoot(elFromPoint, pageX, pageY, elementsFromPoint));
            } else if (targetElements.indexOf(elFromPoint) === -1) {
                targetElements.push(elFromPoint);
            }
        }

        for (const element of targetElements) {
            if (element.getAttribute('droppable') === 'true' &&
            element !== this.ghostElement && element !== this.element.nativeElement) {
                topDropArea = element;
                break;
            }
        }

        if (topDropArea &&
            (!this._lastDropArea || (this._lastDropArea && this._lastDropArea !== topDropArea))) {
            if (this._lastDropArea) {
                this.dispatchEvent(this._lastDropArea, 'tsUiDragLeave', customEventArgs);
            }

            this._lastDropArea = topDropArea;
            this.dispatchEvent(this._lastDropArea, 'tsUiDragEnter', customEventArgs);
        } else if (!topDropArea && this._lastDropArea) {
            this.dispatchEvent(this._lastDropArea, 'tsUiDragLeave', customEventArgs);
            this._lastDropArea = null;
            return;
        }

        if (topDropArea) {
            this.dispatchEvent(topDropArea, 'tsUiDragOver', customEventArgs);
        }
    }

    protected getFromShadowRoot(elem: Element, pageX: number, pageY: number, parentDomElems: Element[]) {
        const elementsFromPoint = elem.shadowRoot?.elementsFromPoint(pageX, pageY);
        const shadowElements = elementsFromPoint?.filter(cur => parentDomElems.indexOf(cur) === -1) || [];
        let res: any[] = [];
        for (const elFromPoint of shadowElements) {
            if (!!elFromPoint?.shadowRoot && elFromPoint.shadowRoot !== elem.shadowRoot) {
                res = res.concat(this.getFromShadowRoot(elFromPoint, pageX, pageY, elementsFromPoint || []));
            }
            res.push(elFromPoint);
        }
        return res;
    }

    protected dispatchDropEvent(pageX: number, pageY: number, originalEvent: any) {
        const eventArgs: IDragCustomEventDetails = {
            startX: this._startX,
            startY: this._startY,
            pageX,
            pageY,
            owner: this,
            originalEvent,
        };

        this.dispatchEvent(this._lastDropArea, 'tsUiDrop', eventArgs);
        this.dispatchEvent(this._lastDropArea, 'tsUiDragLeave', eventArgs);
        this._lastDropArea = null;
    }


    public getElementsAtPoint(pageX: number, pageY: number) {
        const viewPortX = pageX - window.pageXOffset;
        const viewPortY = pageY - window.pageYOffset;
        if ((document as any).msElementsFromPoint) {
            const elements = (document as any).msElementsFromPoint(viewPortX, viewPortY);
            return elements === null ? [] : elements;
        } else {
            return document.elementsFromPoint(viewPortX, viewPortY);
        }
    }


    protected dispatchEvent(target: any, eventName: string, eventArgs: IDragCustomEventDetails) {
        const dragLeaveEvent = document.createEvent('CustomEvent');
        dragLeaveEvent.initCustomEvent(eventName, false, false, eventArgs);
        target.dispatchEvent(dragLeaveEvent);
    }

    protected getTransformX(elem: HTMLElement) {
        let posX = 0;
        if (elem.style.transform) {
            const matrix = elem.style.transform;
            const values = matrix ? matrix.match(/-?[\d\.]+/g) : undefined;
            posX = values ? Number(values[ 1 ]) : 0;
        }

        return posX;
    }

    protected getTransformY(elem: HTMLElement) {
        let posY = 0;
        if (elem.style.transform) {
            const matrix = elem.style.transform;
            const values = matrix ? matrix.match(/-?[\d\.]+/g) : undefined;
            posY = values ? Number(values[ 2 ]) : 0;
        }

        return posY;
    }

    protected setTransformXY(x: number, y: number) {
        this.element.nativeElement.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0px)';
    }

    protected ghostHostOffsetLeft(ghostHost: any) {
        const ghostPosition = (document as any).defaultView.getComputedStyle(ghostHost).getPropertyValue('position');
        if (ghostPosition === 'static' && ghostHost.offsetParent && ghostHost.offsetParent === document.body) {
            return 0;
        } else if (ghostPosition === 'static' && ghostHost.offsetParent) {
            return ghostHost.offsetParent.getBoundingClientRect().left - this.windowScrollLeft;
        }
        return ghostHost.getBoundingClientRect().left - this.windowScrollLeft;
    }

    protected ghostHostOffsetTop(ghostHost: any) {
        const ghostPosition = (document as any).defaultView.getComputedStyle(ghostHost).getPropertyValue('position');
        if (ghostPosition === 'static' && ghostHost.offsetParent && ghostHost.offsetParent === document.body) {
            return 0;
        } else if (ghostPosition === 'static' && ghostHost.offsetParent) {
            return ghostHost.offsetParent.getBoundingClientRect().top - this.windowScrollTop;
        }
        return ghostHost.getBoundingClientRect().top - this.windowScrollTop;
    }

    protected getContainerScrollDirection() {
        const containerBounds = this.scrollContainer ?  this.scrollContainer.getBoundingClientRect() : {} as DOMRect;
        const scrolledX = !this.scrollContainer ? this.windowScrollLeft > 0 : this.scrollContainer.scrollLeft > 0;
        const scrolledY = !this.scrollContainer ? this.windowScrollTop > 0 : this.scrollContainer.scrollTop > 0;
        const topBorder = (!this.scrollContainer ? 0 : containerBounds.top) + this.windowScrollTop + this._scrollContainerThreshold;
        const elementHeight = this.ghost && this.ghostElement ? this.ghostElement.offsetHeight : this.element.nativeElement.offsetHeight;
        const bottomBorder = (!this.scrollContainer ? window.innerHeight : containerBounds.bottom ) +
            this.windowScrollTop - this._scrollContainerThreshold  - elementHeight;
        const leftBorder = (!this.scrollContainer ? 0 : containerBounds.left) + this.windowScrollLeft + this._scrollContainerThreshold;
        const elementWidth = this.ghost && this.ghostElement ? this.ghostElement.offsetWidth :  this.element.nativeElement.offsetWidth;
        const rightBorder = (!this.scrollContainer ? window.innerWidth : containerBounds.right) +
            this.windowScrollLeft - this._scrollContainerThreshold - elementWidth;

        if (this.pageY <= topBorder && scrolledY) {
            return DragScrollDirection.UP;
        } else if (this.pageY > bottomBorder) {
            return DragScrollDirection.DOWN;
        } else if (this.pageX < leftBorder && scrolledX) {
            return DragScrollDirection.LEFT;
        } else if (this.pageX > rightBorder) {
            return DragScrollDirection.RIGHT;
        }
        return null;
    }

    protected onScrollContainerStep(scrollDir: DragScrollDirection) {
        animationFrameScheduler.schedule(() => {

            let xDir = scrollDir == DragScrollDirection.LEFT ? -1 : (scrollDir == DragScrollDirection.RIGHT ? 1 : 0);
            let yDir = scrollDir == DragScrollDirection.UP ? -1 : (scrollDir == DragScrollDirection.DOWN ? 1 : 0);
            if (!this.scrollContainer) {
                const maxScrollX = this._originalScrollContainerWidth - document.documentElement.clientWidth;
                const maxScrollY = this._originalScrollContainerHeight - document.documentElement.clientHeight;
                xDir = (this.windowScrollLeft <= 0 && xDir < 0) || (this.windowScrollLeft >= maxScrollX && xDir > 0) ? 0 : xDir;
                yDir = (this.windowScrollTop <= 0 && yDir < 0) || (this.windowScrollTop >= maxScrollY && yDir > 0) ? 0 : yDir;
            } else {
                const maxScrollX = this._originalScrollContainerWidth - this.scrollContainer.clientWidth;
                const maxScrollY = this._originalScrollContainerHeight - this.scrollContainer.clientHeight;
                xDir = (this.scrollContainer.scrollLeft <= 0 && xDir < 0) || (this.scrollContainer.scrollLeft >= maxScrollX && xDir > 0) ? 0 : xDir;
                yDir = (this.scrollContainer.scrollTop <= 0 && yDir < 0) || (this.scrollContainer.scrollTop >= maxScrollY && yDir > 0) ? 0 : yDir;
            }

            const scrollByX = xDir * this._scrollContainerStep;
            const scrollByY = yDir * this._scrollContainerStep;

            if (!this.scrollContainer) {
                window.scrollBy(scrollByX, scrollByY);
            } else {
                this.scrollContainer.scrollLeft += scrollByX;
                this.scrollContainer.scrollTop += scrollByY;
            }

            if (this.ghost && !this.scrollContainer)  {
                this.ghostLeft += scrollByX;
                this.ghostTop += scrollByY;
            } else if (!this.ghost) {
                const translateX = this.getTransformX(this.element.nativeElement) + scrollByX;
                const translateY = this.getTransformY(this.element.nativeElement) + scrollByY;
                this.setTransformXY(translateX, translateY);
                if (!this.scrollContainer) {
                    this._lastX += scrollByX;
                    this._lastY += scrollByY;
                }
            }
        });
    }

    protected onScrollContainer() {
        const scrollDir = this.getContainerScrollDirection();
        if (scrollDir !== null && scrollDir !== undefined && !this._containerScrollIntervalId) {
            this._originalScrollContainerWidth = this.scrollContainer ? this.scrollContainer.scrollWidth : this.windowScrollWidth;
            this._originalScrollContainerHeight = this.scrollContainer ? this.scrollContainer.scrollHeight : this.windowScrollHeight;

            this._containerScrollIntervalId = window.setInterval(() => this.onScrollContainerStep(scrollDir), this._scrollContainerStepMs);
        } else if ((scrollDir === null || scrollDir === undefined) && this._containerScrollIntervalId) {
            clearInterval(this._containerScrollIntervalId);
            this._containerScrollIntervalId = null;
        }
    }
}

@Directive({
    exportAs: 'drop',
    selector: '[tsUiDrop]',
})
export class DropDirective implements OnInit, OnDestroy {
    @Input('tsUiDrop')
    public set data(v: any) {
        this._data = v;
    }

    public get data(): any {
        return this._data;
    }

    @Input()
    public dropChannel!: number | string | number[] | string[];

    @Input()
    public set dropStrategy(classRef: any) {
        this._dropStrategy = new classRef(this._renderer);
    }

    public get dropStrategy() {
        return this._dropStrategy;
    }

    @Output()
    public enter = new EventEmitter<IDropBaseEventArgs>();

    @Output()
    public over = new EventEmitter<IDropBaseEventArgs>();

    @Output()
    public leave = new EventEmitter<IDropBaseEventArgs>();

    @Output()
    public dropped = new EventEmitter<IDropDroppedEventArgs>();


    @HostBinding('attr.droppable')
    public droppable = true;


    @HostBinding('class.dragOver')
    public dragover = false;


    protected _destroy = new Subject<boolean>();

    protected _dropStrategy: IDropStrategy;

    private _data: any;

    constructor(public element: ElementRef, private _renderer: Renderer2, private _zone: NgZone) {
        this._dropStrategy = new DefaultDropStrategy();
    }


    @HostListener('tsUiDrop', ['$event'])
    public onDragDrop(event: CustomEvent<IDragCustomEventDetails>) {
        if (!this.isDragLinked(event.detail.owner)) {
            return;
        }

        const elementPosX = this.element.nativeElement.getBoundingClientRect().left + this.getWindowScrollLeft();
        const elementPosY = this.element.nativeElement.getBoundingClientRect().top + this.getWindowScrollTop();
        const offsetX = event.detail.pageX - elementPosX;
        const offsetY = event.detail.pageY - elementPosY;
        const args: IDropDroppedEventArgs = {
            owner: this,
            originalEvent: event.detail.originalEvent,
            drag: event.detail.owner,
            dragData: event.detail.owner.data,
            startX: event.detail.startX,
            startY: event.detail.startY,
            pageX: event.detail.pageX,
            pageY: event.detail.pageY,
            offsetX,
            offsetY,
            cancel: false,
        };
        this._zone.run(() => {
            this.dropped.emit(args);
        });

        if (this._dropStrategy && !args.cancel) {
            const elementsAtPoint = event.detail.owner.getElementsAtPoint(event.detail.pageX, event.detail.pageY);
            const insertIndex = this.getInsertIndexAt(event.detail.owner, elementsAtPoint);
            this._dropStrategy.dropAction(event.detail.owner, this, insertIndex);
        }
    }


    public ngOnInit() {
        this._zone.runOutsideAngular(() => {
            fromEvent(this.element.nativeElement, 'tsUiDragEnter').pipe(takeUntil(this._destroy))
                .subscribe((res) => this.onDragEnter(res as CustomEvent<IDragCustomEventDetails>));

            fromEvent(this.element.nativeElement, 'tsUiDragLeave').pipe(takeUntil(this._destroy))
                .subscribe((res) => this.onDragLeave(res as CustomEvent<IDragCustomEventDetails>));
            fromEvent(this.element.nativeElement, 'tsUiDragOver').pipe(takeUntil(this._destroy))
                .subscribe((res) => this.onDragOver(res as CustomEvent<IDragCustomEventDetails>));
        });
    }


    public ngOnDestroy() {
        this._destroy.next(true);
        this._destroy.complete();
    }


    public onDragOver(event: CustomEvent<IDragCustomEventDetails>) {
        const elementPosX = this.element.nativeElement.getBoundingClientRect().left + this.getWindowScrollLeft();
        const elementPosY = this.element.nativeElement.getBoundingClientRect().top + this.getWindowScrollTop();
        const offsetX = event.detail.pageX - elementPosX;
        const offsetY = event.detail.pageY - elementPosY;
        const eventArgs: IDropBaseEventArgs = {
            originalEvent: event.detail.originalEvent,
            owner: this,
            drag: event.detail.owner,
            dragData: event.detail.owner.data,
            startX: event.detail.startX,
            startY: event.detail.startY,
            pageX: event.detail.pageX,
            pageY: event.detail.pageY,
            offsetX,
            offsetY,
        };

        this.over.emit(eventArgs);
    }


    public onDragEnter(event: CustomEvent<IDragCustomEventDetails>) {
        if (!this.isDragLinked(event.detail.owner)) {
            return;
        }

        this.dragover = true;
        const elementPosX = this.element.nativeElement.getBoundingClientRect().left + this.getWindowScrollLeft();
        const elementPosY = this.element.nativeElement.getBoundingClientRect().top + this.getWindowScrollTop();
        const offsetX = event.detail.pageX - elementPosX;
        const offsetY = event.detail.pageY - elementPosY;
        const eventArgs: IDropBaseEventArgs = {
            originalEvent: event.detail.originalEvent,
            owner: this,
            drag: event.detail.owner,
            dragData: event.detail.owner.data,
            startX: event.detail.startX,
            startY: event.detail.startY,
            pageX: event.detail.pageX,
            pageY: event.detail.pageY,
            offsetX,
            offsetY,
        };
        this._zone.run(() => {
            this.enter.emit(eventArgs);
        });
    }


    public onDragLeave(event: CustomEvent<IDragCustomEventDetails>) {
        if (!this.isDragLinked(event.detail.owner)) {
            return;
        }

        this.dragover = false;
        const elementPosX = this.element.nativeElement.getBoundingClientRect().left + this.getWindowScrollLeft();
        const elementPosY = this.element.nativeElement.getBoundingClientRect().top + this.getWindowScrollTop();
        const offsetX = event.detail.pageX - elementPosX;
        const offsetY = event.detail.pageY - elementPosY;
        const eventArgs: IDropBaseEventArgs = {
            originalEvent: event.detail.originalEvent,
            owner: this,
            drag: event.detail.owner,
            dragData: event.detail.owner.data,
            startX: event.detail.startX,
            startY: event.detail.startY,
            pageX: event.detail.pageX,
            pageY: event.detail.pageY,
            offsetX,
            offsetY,
        };
        this._zone.run(() => {
            this.leave.emit(eventArgs);
        });
    }

    protected getWindowScrollTop() {
        return window.scrollY ? window.scrollY : (window.pageYOffset ? window.pageYOffset : 0);
    }

    protected getWindowScrollLeft() {
        return window.scrollX ? window.scrollX : (window.pageXOffset ? window.pageXOffset : 0);
    }

    protected isDragLinked(drag: DragDirective): boolean {
        const dragLinkArray = drag.dragChannel instanceof Array;
        const dropLinkArray = this.dropChannel instanceof Array;

        if (!dragLinkArray && !dropLinkArray) {
            return this.dropChannel === drag.dragChannel;
        } else if (!dragLinkArray && dropLinkArray) {
            const dropLinks = this.dropChannel as any [];
            for (const link of dropLinks) {
                if (link === drag.dragChannel) {
                    return true;
                }
            }
        } else if (dragLinkArray && !dropLinkArray) {
            const dragLinks = drag.dragChannel as any [];
            for (const link of dragLinks) {
                if (link === this.dropChannel) {
                    return true;
                }
            }
        } else {
            const dragLinks = drag.dragChannel as any [];
            const dropLinks = this.dropChannel as any [];
            for (const draglink of dragLinks) {
                for (const droplink of dropLinks) {
                    if (draglink === droplink) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    protected getInsertIndexAt(draggedDir: DragDirective, elementsAtPoint: any[]): number {
        let insertIndex = -1;
        const dropChildren = Array.prototype.slice.call(this.element.nativeElement.children);
        if (!dropChildren.length) {
            return insertIndex;
        }

        let i = 0;
        let childUnder = null;
        while (!childUnder && i < elementsAtPoint.length) {
            if (elementsAtPoint[i].parentElement === this.element.nativeElement) {
                childUnder = elementsAtPoint[i];
            }
            i++;
        }

        const draggedElemIndex = dropChildren.indexOf(draggedDir.element.nativeElement);
        insertIndex = dropChildren.indexOf(childUnder);
        if (draggedElemIndex !== -1 && draggedElemIndex < insertIndex) {
            insertIndex++;
        }

        return insertIndex;
    }
}


@NgModule({
    declarations: [DragDirective, DropDirective, DragHandleDirective, DragIgnoreDirective],
    exports: [DragDirective, DropDirective, DragHandleDirective, DragIgnoreDirective],
})
export class DragDropModule { }
