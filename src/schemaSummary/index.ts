import { Widget } from '@lumino/widgets';

import { ISignal, Signal } from '@lumino/signaling';

import { DisposableSet } from '@lumino/disposable';

import { Toolbar } from '@jupyterlab/apputils';

import { PreWidget, SingletonPanel } from '../components';

import * as Api from '../api';

import { proxyFor } from '../services';

import { JupyterLabSqlPage, PageName } from '../page';

import { SchemaSummaryToolbar } from './toolbar';

import {
  SchemaSummaryIModel,
  SchemaSummaryModel,
  SchemaSummaryWidget
} from './content';

namespace SchemaSummaryPage {
  export interface IOptions {
    connectionUrl: string;
  }
}

export class SchemaSummaryPage implements JupyterLabSqlPage {
  constructor(options: SchemaSummaryPage.IOptions) {
    this._onRefresh = this._onRefresh.bind(this);
    this._content = new Content(options);
    this._toolbar = new SchemaSummaryToolbar(options.connectionUrl);
    this._navigateBack = proxyFor(this._toolbar.backButtonClicked, this);
    this._toolbar.refreshButtonClicked.connect(this._onRefresh);
    this._navigateToDatabase = proxyFor(this._content.navigateToDatabase, this);
    this._disposables = DisposableSet.from([this._content, this._toolbar]);

    this._onRefresh();
  }

  get content(): Widget {
    return this._content;
  }

  get toolbar(): Toolbar {
    return this._toolbar;
  }

  get navigateBack(): ISignal<this, void> {
    return this._navigateBack;
  }

  get navigateToDatabase(): ISignal<this, string> {
    return this._navigateToDatabase;
  }

  get isDisposed() {
    return this._disposables.isDisposed;
  }

  dispose() {
    return this._disposables.dispose();
  }

  private async _onRefresh(): Promise<void> {
    this._toolbar.setLoading(true);
    await this._content.refresh();
    this._toolbar.setLoading(false);
  }

  readonly pageName: PageName = PageName.SchemaSummary;
  private readonly _disposables: DisposableSet;
  private readonly _toolbar: SchemaSummaryToolbar;
  private readonly _content: Content;
  private readonly _navigateBack: Signal<this, void>;
  private readonly _navigateToDatabase: Signal<this, string>;
}

class Content extends SingletonPanel {
  constructor(options: SchemaSummaryPage.IOptions) {
    super();
    this._connectionUrl = options.connectionUrl;
  }

  get navigateToDatabase(): ISignal<this, string> {
    return this._navigateToDatabase;
  }

  async refresh(): Promise<void> {
    const response = await Api.getSchemaStructure(this._connectionUrl);
    this._setResponse(response);
  }

  dispose(): void {
    this._disposeWidgets();
    super.dispose();
  }

  private _setResponse(response: Api.SchemaStructureResponse.Type) {
    this._disposeWidgets();
    Api.SchemaStructureResponse.match(
      response,
      ({ schemas }) => {
        const model = new SchemaSummaryModel([...schemas]);
        this.widget = SchemaSummaryWidget.withModel(model);
        model.navigateToDatabase.connect((_, databaseName) => {
          this._navigateToDatabase.emit(databaseName);
        });
        this._schemaSummaryModel = model;
      },
      ({ message }) => {
        this.widget = new PreWidget(message);
      }
    );
  }

  private _disposeWidgets(): void {
    if (this._schemaSummaryModel) {
      Signal.disconnectBetween(this._schemaSummaryModel, this);
      this._schemaSummaryModel.dispose();
    }
  }

  private readonly _connectionUrl: string;
  private _schemaSummaryModel: SchemaSummaryIModel | null;
  private readonly _navigateToDatabase: Signal<this, string> = new Signal<
    this,
    string
  >(this);
}
