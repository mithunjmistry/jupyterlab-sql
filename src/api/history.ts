import { Server } from './server';

export async function getQueryHistory(
  connectionUrl: string
): Promise<QueryHistoryResponseModel.Type> {

  // const record: Record<string, string> = {'connectionUrl': `${connectionUrl}`};
  const request: RequestInit = {
    method: 'GET'
  };
  const response = await Server.makeRequest(`/jupyterlab-sql/history?connectionUrl=${encodeURIComponent(connectionUrl)}`, request);
  if (!response.ok) {
    return Private.createErrorResponse(response.status);
  }
  const data = await response.json();
  const validatedData = Private.validateBody(data);
  return validatedData;
}

export interface QueryMetaData {
  id: number;
  ts: number;
  query: string;
  connectionUrl: string;
}

export namespace QueryHistoryResponseModel {
  export type Type = ErrorResponse | SuccessResponse;

  interface ErrorResponse {
    responseType: 'error';
    responseData: ErrorResponseData;
  }

  interface SuccessResponse {
    responseType: 'success';
    responseData: SuccessResponseData;
  }

  interface ErrorResponseData {
    message: string;
  }

  type SuccessResponseData =
    | {
        hasRows: false;
      }
    | {
        hasRows: true;
        queries: Array<QueryMetaData>;
      };

  export function createError(message: string): ErrorResponse {
    return {
      responseType: 'error',
      responseData: {
        message
      }
    };
  }

  export function createNotFoundError(): ErrorResponse {
    const errorMessage =
      'Failed to reach server endpoints. ' +
      'Is the server extension installed correctly?';
    return createError(errorMessage);
  }

  export function match<U>(
    response: Type,
    onSuccessWithRows: (queries: Array<QueryMetaData>) => U,
    onSuccessNoRows: () => U,
    onError: (_: ErrorResponseData) => U
  ): U {
    if (response.responseType === 'error') {
      return onError(response.responseData);
    } else if (response.responseType === 'success') {
      const responseData = response.responseData;
      if (responseData.hasRows) {
        const { queries } = responseData;
        return onSuccessWithRows(queries);
      } else {
        return onSuccessNoRows();
      }
    }
  }
}

namespace Private {
  export function createErrorResponse(
    responseStatus: number
  ): QueryHistoryResponseModel.Type {
    if (responseStatus === 404) {
      return QueryHistoryResponseModel.createNotFoundError();
    } else {
      const errorMessage = 'Unexpected response status from server';
      return QueryHistoryResponseModel.createError(errorMessage);
    }
  }

  export function validateBody(responseBody: any): QueryHistoryResponseModel.Type {
    return responseBody;
  }
}
