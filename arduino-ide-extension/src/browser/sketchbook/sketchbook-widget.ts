import { injectable, postConstruct, inject } from 'inversify';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { MaybePromise } from '@theia/core/lib/common/types';
import { ViewContainer } from '@theia/core/lib/browser/view-container';
import { StatefulWidget } from '@theia/core/lib/browser/shell/shell-layout-restorer';
import { ApplicationShell } from '@theia/core/lib/browser/shell/application-shell';
import { BaseWidget, PanelLayout, Message, Widget } from '@theia/core/lib/browser/widgets/widget';
import { SketchWidgetFactory } from './sketch-widget';
import { SketchesService, Sketch } from '../../common/protocol';

@injectable()
export class SketchbookWidget extends BaseWidget implements StatefulWidget, ApplicationShell.TrackableWidgetProvider {

    static WIDGET_ID = 'sketchbook-widget';
    static WIDGET_LABEL = 'Sketchbook';

    @inject(SketchesService)
    protected readonly sketchesService: SketchesService;

    @inject(ViewContainer.Factory)
    protected readonly viewContainerFactory: ViewContainer.Factory;

    @inject(SketchWidgetFactory)
    protected readonly widgetFactory: SketchWidgetFactory;

    protected viewContainer: ViewContainer;
    protected readonly deferredContainer = new Deferred<HTMLElement>();

    protected toScroll: Widget;

    @postConstruct()
    protected init(): void {
        this.id = SketchbookWidget.WIDGET_ID;
        this.title.label = SketchbookWidget.WIDGET_LABEL;
        this.title.caption = SketchbookWidget.WIDGET_LABEL;
        this.title.closable = true;
        this.title.iconClass = 'fa fa-book';
        this.addClass('sketchbook-widget');

        const toolbar = new Widget();
        toolbar.title.caption = 'Toolbar';
        toolbar.title.label = 'Toolbar';
        toolbar.addClass('sketchbook-widget-toolbar');

        this.toScroll = new Widget();
        this.toScroll.title.caption = 'ToScroll';
        this.toScroll.title.label = 'ToScroll';
        this.toScroll.addClass('sketchbook-widget-to-scroll');

        this.viewContainer = this.viewContainerFactory({
            id: `${SketchbookWidget.WIDGET_ID}-view-container`
        });
        this.scrollOptions = {
            suppressScrollX: true,
            minScrollbarLength: 35
        };

        this.loadSketches();

        this.toDispose.push(
            this.viewContainer
        );

        const layout = this.layout = new PanelLayout();
        layout.addWidget(toolbar);
        layout.addWidget(this.toScroll);
        this.updateScrollBar();
        // layout.addWidget(this.viewContainer);
    }

    protected async loadSketches(sketches: MaybePromise<Sketch[]> = this.sketchesService.getSketches()): Promise<void> {
        for (const sketch of await sketches) {
            const widget = this.widgetFactory({ sketch });
            this.viewContainer.addWidget(widget, {
                canHide: false,
                initiallyCollapsed: true
            });
            this.updateScrollBar();
        }
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.deferredContainer.resolve(this.toScroll.node);
        this.updateScrollBar();
        // TODO: focus the desired HTMLElement
    }

    getTrackableWidgets(): Widget[] {
        return this.viewContainer.getTrackableWidgets();
    }

    storeState(): object {
        return this.viewContainer.storeState();
    }

    restoreState(oldState: ViewContainer.State): void {
        this.viewContainer.restoreState(oldState);
    }

    protected getScrollContainer(): MaybePromise<HTMLElement> {
        return this.deferredContainer.promise;
    }

    updateScrollBar(): void {
        if (this.scrollBar) {
            this.scrollBar.update();
        }
    }

}
