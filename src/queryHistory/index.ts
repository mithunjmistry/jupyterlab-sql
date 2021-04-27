import { Widget } from '@phosphor/widgets';

import { ISignal, Signal } from '@phosphor/signaling';

import { DisposableSet } from '@phosphor/disposable';

import { Toolbar } from '@jupyterlab/apputils';

import * as Api from '../api';

import { JupyterLabSqlPage, PageName } from '../page';

import { proxyFor } from '../services';

import { QueryHistoryToolbar } from './toolbar';

import {QueryHistoryModel, QueryHistoryWidget} from "./content";

import {PreWidget, SingletonPanel} from "../components";

namespace QueryHistoryPage {
  export interface IOptions {
    connectionUrl: string;
  }
}

export class QueryHistoryPage implements JupyterLabSqlPage {
  constructor(options: QueryHistoryPage.IOptions) {
    this._onRefresh = this._onRefresh.bind(this);
    this._content = new Content(options);
    this._toolbar = new QueryHistoryToolbar(options.connectionUrl);
    this._backButtonClicked = proxyFor(this._toolbar.backButtonClicked, this);
    this._disposables = DisposableSet.from([this._content, this._toolbar]);

    this._onRefresh();
  }

  get toolbar(): Toolbar {
    return this._toolbar;
  }

  get content(): Widget {
    return this._content;
  }

  get backButtonClicked(): ISignal<this, void> {
    return this._backButtonClicked;
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

  readonly pageName = PageName.QueryHistory;
  private readonly _content: Content;
  private readonly _toolbar: QueryHistoryToolbar;
  private readonly _disposables: DisposableSet;
  private readonly _backButtonClicked: Signal<this, void>;
}

class Content extends SingletonPanel {
  constructor(options: QueryHistoryPage.IOptions) {
    super();
    this._connectionUrl = options.connectionUrl;
  }

  async refresh(): Promise<void> {
    const response = await Api.getQueryHistory(this._connectionUrl);
    this._setResponse(response);
  }

  private _setResponse(response: Api.QueryHistoryResponseModel.Type) {
    Api.QueryHistoryResponseModel.match(response, (queries => {
      const model = new QueryHistoryModel(queries);
      this.widget = QueryHistoryWidget.withModel(model);
    }),
        () => {},
        ({ message }) => {
          this.widget = new PreWidget(message);
    })
  }

  private readonly _connectionUrl: string;
}
