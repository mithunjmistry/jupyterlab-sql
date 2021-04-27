import * as React from 'react';

import classNames from 'classnames';

import { IDisposable } from '@phosphor/disposable';

import { Signal, ISignal } from '@phosphor/signaling';

import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

export interface DatabaseSummaryIModel extends IDisposable {
  navigateToTable: ISignal<this, string>;
  navigateToCustomQuery: ISignal<this, void>;
  navigateToQueryHistory: ISignal<this, void>;
}

export class DatabaseSummaryModel extends VDomModel
  implements DatabaseSummaryIModel {
  constructor(tables: Array<string>, views: Array<string>) {
    super();
    this.tables = tables;
    this.views = views;
    this.onNavigateToTable = this.onNavigateToTable.bind(this);
    this.onNavigateToCustomQuery = this.onNavigateToCustomQuery.bind(this);
    this.onNavigateToQueryHistory = this.onNavigateToQueryHistory.bind(this);
  }

  get navigateToTable(): ISignal<this, string> {
    return this._navigateToTable;
  }

  get navigateToCustomQuery(): ISignal<this, void> {
    return this._navigateToCustomQuery;
  }

  get navigateToQueryHistory(): ISignal<this, void> {
    return this._navigateToQueryHistory;
  }

  onNavigateToTable(tableName: string) {
    this._navigateToTable.emit(tableName);
  }

  onNavigateToCustomQuery() {
    this._navigateToCustomQuery.emit(void 0);
  }

  onNavigateToQueryHistory() {
    this._navigateToQueryHistory.emit(void 0);
  }

  readonly tables: Array<string>;
  readonly views: Array<string>;
  private readonly _navigateToTable = new Signal<this, string>(this);
  private readonly _navigateToCustomQuery = new Signal<this, void>(this);
  private readonly _navigateToQueryHistory = new Signal<this, void>(this);
}

export class DatabaseSummaryWidget extends VDomRenderer<DatabaseSummaryModel> {
  constructor() {
    super();
    this.addClass('p-Sql-DatabaseSummary-Container');
  }

  static withModel(model: DatabaseSummaryModel): DatabaseSummaryWidget {
    const tableList = new DatabaseSummaryWidget();
    tableList.model = model;
    return tableList;
  }

  render() {
    if (!this.model) {
      return null;
    } else {
      const {
        tables,
        views,
        onNavigateToTable,
        onNavigateToCustomQuery,
        onNavigateToQueryHistory
      } = this.model;
      return (
        <TableList
          tableNames={tables}
          viewNames={views}
          onNavigateToTable={onNavigateToTable}
          onNavigateToCustomQuery={onNavigateToCustomQuery}
          onNavigateToQueryHistory={onNavigateToQueryHistory}
        />
      );
    }
  }
}

namespace TableList {
  export interface Props {
    tableNames: Array<string>;
    viewNames: Array<string>;
    onNavigateToTable: (tableName: string) => void;
    onNavigateToCustomQuery: () => void;
    onNavigateToQueryHistory: () => void;
  }

  export interface State {
    selectedItem: number | null;
  }
}

class TableList extends React.Component<TableList.Props, TableList.State> {
  constructor(props: TableList.Props) {
    super(props);
    this.state = {
      selectedItem: null
    };
    this.onTableItemClick = this.onTableItemClick.bind(this);
  }

  onTableItemClick(itemNumber: number) {
    this.setState({ selectedItem: itemNumber });
  }

  render() {
    const {
      tableNames,
      viewNames,
      onNavigateToTable,
      onNavigateToCustomQuery,
      onNavigateToQueryHistory
    } = this.props;
    const { selectedItem } = this.state;
    const tableItems = tableNames.map((tableName, i) => (
      <TableListItem
        tableName={tableName}
        key={i}
        onClick={() => this.onTableItemClick(i)}
        onDoubleClick={() => onNavigateToTable(tableName)}
        selected={i === selectedItem}
      />
    ));
    const viewItems = viewNames.map((viewName, i) => (
        <TableListItem
            tableName={viewName}
            key={tableItems.length + i}
            onClick={() => this.onTableItemClick(tableItems.length + i)}
            onDoubleClick={() => onNavigateToTable(viewName)}
            selected={tableItems.length + i === selectedItem}
        />
    ));
    return (
      <div className="p-Sql-TableList-container">
        <ul className="p-Sql-TableList-content">
          <ListHeader headerText="Actions" />
          <CustomQueryItem onClick={onNavigateToCustomQuery} />
          <QueryHistoryItem onClick={onNavigateToQueryHistory} />
          <ListHeader headerText="Tables" />
          {tableItems}
          {viewItems.length > 0 && (
              <div>
                <ListHeader headerText="Views" />
                {viewItems}
              </div>
          )}
        </ul>
      </div>
    );
  }
}

namespace TableListItem {
  export interface Props {
    tableName: string;
    selected: boolean;
    onClick: () => void;
    onDoubleClick: () => void;
  }
}

class TableListItem extends React.Component<TableListItem.Props> {
  render() {
    const { tableName, onClick, onDoubleClick, selected } = this.props;
    const classes = classNames('jp-DirListing-item', {
      'jp-mod-selected': selected
    });
    return (
      <li
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className={classes}
        title={tableName}
      >
        <span className="jp-DirListing-itemIcon jp-MaterialIcon jp-SpreadsheetIcon" />
        <span className="jp-DirListing-itemText">{tableName}</span>
      </li>
    );
  }
}

namespace CustomQueryItem {
  export interface Props {
    onClick: () => void;
  }
}

class CustomQueryItem extends React.Component<CustomQueryItem.Props> {
  render() {
    const { onClick } = this.props;
    return (
      <li
        onClick={onClick}
        className="jp-DirListing-item"
        title="Custom SQL query"
      >
        <span className="jp-DirListing-itemIcon jp-MaterialIcon jp-CodeConsoleIcon" />
        <span className="jp-DirListing-itemText">Custom SQL query</span>
      </li>
    );
  }
}

namespace QueryHistoryItem {
  export interface Props {
    onClick: () => void;
  }
}

class QueryHistoryItem extends React.Component<QueryHistoryItem.Props> {
  render() {
    const { onClick } = this.props;
    return (
        <li
            onClick={onClick}
            className="jp-DirListing-item"
            title="History"
        >
          <span className="jp-DirListing-itemIcon jp-MaterialIcon jp-CodeConsoleIcon" />
          <span className="jp-DirListing-itemText">History</span>
        </li>
    );
  }
}

namespace ListHeader {
  export interface Props {
    headerText: string;
  }
}

class ListHeader extends React.Component<ListHeader.Props> {
  render() {
    const { headerText } = this.props;
    return <li className="p-Sql-TableList-header">{headerText}</li>;
  }
}
