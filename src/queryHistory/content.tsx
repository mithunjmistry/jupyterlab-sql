import * as React from 'react';

import { IDisposable } from '@phosphor/disposable';

import * as History from '../api/history';

import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

export interface QueryHistoryIModel extends IDisposable {
}

export class QueryHistoryModel extends VDomModel
  implements QueryHistoryIModel {
  constructor(queries: Array<History.QueryMetaData>) {
    super();
    this.queries = queries;
  }

  readonly queries: Array<History.QueryMetaData>;
}

export class QueryHistoryWidget extends VDomRenderer<QueryHistoryModel> {
  constructor() {
    super();
    this.addClass('p-Sql-DatabaseSummary-Container');
  }

  static withModel(model: QueryHistoryModel): QueryHistoryWidget {
    const queryList = new QueryHistoryWidget();
    queryList.model = model;
    return queryList;
  }

  render() {
    if (!this.model) {
      return null;
    } else {
      const {
        queries
      } = this.model;
      return (
        <div className="p-Sql-TableList-container">
          <ul className="p-Sql-TableList-content">
            <ListHeader headerText="Queries" />
            <QueryList queries={queries} />
          </ul>
        </div>
      );
    }
  }
}

namespace QueryList {
  export interface Props {
    queries: Array<History.QueryMetaData>;
  }

  export interface State {
    selectedItem: number | null;
  }
}

class QueryList extends React.Component<QueryList.Props, QueryList.State> {
  constructor(props: QueryList.Props) {
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
      queries
    } = this.props;
    const queryItems = queries.map((queryMetaData, i) => (
      <QueryHistoryListItem
        queryMetaData={queryMetaData}
        key={i}
      />
    ));
    return (
      <div>
        {queryItems}
      </div>
    );
  }
}

namespace QueryHistoryListItem {
  export interface Props {
    queryMetaData: History.QueryMetaData;
  }
}

class QueryHistoryListItem extends React.Component<QueryHistoryListItem.Props> {
  render() {
    const { queryMetaData } = this.props;
    const { query } = queryMetaData;
    return (
      <li
        title={query}
      >
        <span className="jp-DirListing-itemIcon jp-MaterialIcon jp-SpreadsheetIcon" />
        <span className="jp-DirListing-itemText">{query}</span>
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
