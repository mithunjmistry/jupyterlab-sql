import * as React from 'react';

import classNames from 'classnames';

import { IDisposable } from '@phosphor/disposable';

import { Signal, ISignal } from '@phosphor/signaling';

import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

export interface SchemaSummaryIModel extends IDisposable {
  navigateToDatabase: ISignal<this, string>;
}

export class SchemaSummaryModel extends VDomModel
  implements SchemaSummaryIModel {
  constructor(schemas: Array<string>) {
    super();
    this.schemas = schemas;
    this.onNavigateToDatabase = this.onNavigateToDatabase.bind(this);
  }

  get navigateToDatabase(): ISignal<this, string> {
    return this._navigateToDatabase;
  }

  onNavigateToDatabase(databaseName: string) {
    this._navigateToDatabase.emit(databaseName);
  }

  readonly schemas: Array<string>;
  private readonly _navigateToDatabase = new Signal<this, string>(this);
}

export class SchemaSummaryWidget extends VDomRenderer<SchemaSummaryModel> {
  constructor() {
    super();
    this.addClass('p-Sql-SchemaSummary-Container');
  }

  static withModel(model: SchemaSummaryModel): SchemaSummaryWidget {
    const tableList = new SchemaSummaryWidget();
    tableList.model = model;
    return tableList;
  }

  render() {
    if (!this.model) {
      return null;
    } else {
      const { schemas, onNavigateToDatabase } = this.model;
      return (
        <SchemaList
          schemaNames={schemas}
          onNavigateToDatabase={onNavigateToDatabase}
        />
      );
    }
  }
}

namespace SchemaList {
  export interface Props {
    schemaNames: Array<string>;
    onNavigateToDatabase: (schemaName: string) => void;
  }

  export interface State {
    selectedItem: number | null;
  }
}

class SchemaList extends React.Component<SchemaList.Props, SchemaList.State> {
  constructor(props: SchemaList.Props) {
    super(props);
    this.state = {
      selectedItem: null
    };
    this.onDatabaseItemClick = this.onDatabaseItemClick.bind(this);
  }

  onDatabaseItemClick(itemNumber: number) {
    this.setState({ selectedItem: itemNumber });
  }

  render() {
    const {
      schemaNames,
      onNavigateToDatabase
    } = this.props;
    const { selectedItem } = this.state;
    const schemaItems = schemaNames.map((schemaName, i) => (
        <SchemaListItem
          schemaName={schemaName}
          key={i}
          onClick={() => this.onDatabaseItemClick(i)}
          onDoubleClick={() => onNavigateToDatabase(schemaName)}
          selected={i === selectedItem}
        />
    ));
    return (
      <div className="p-Sql-TableList-container">
        <ul className="p-Sql-TableList-content">
          <ListHeader headerText="Databases" />
          {schemaItems}
        </ul>
      </div>
    );
  }
}

namespace SchemaListItem {
  export interface Props {
    schemaName: string;
    selected: boolean;
    onClick: () => void;
    onDoubleClick: () => void;
  }
}

class SchemaListItem extends React.Component<SchemaListItem.Props> {
  render() {
    const { schemaName, onClick, onDoubleClick, selected } = this.props;
    const classes = classNames('jp-DirListing-item', {
      'jp-mod-selected': selected
    });
    return (
      <li
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className={classes}
        title={schemaName}
      >
        <span className="jp-DirListing-itemIcon jp-MaterialIcon jp-SpreadsheetIcon" />
        <span className="jp-DirListing-itemText">{schemaName}</span>
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
