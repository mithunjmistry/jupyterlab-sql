import { Server } from './server';

export async function getSchemaStructure(
  connectionUrl: string
): Promise<SchemaStructureResponse.Type> {
  const request: RequestInit = {
    method: 'POST',
    body: JSON.stringify({ connectionUrl })
  };
  const response = await Server.makeRequest(
    '/jupyterlab-sql/schema',
    request
  );
  if (!response.ok) {
    return Private.createErrorResponse(response.status);
  }
  const data = await response.json();
  return data;
}

export interface SchemaObjects {
  schemas: Array<string>;
}

export namespace SchemaStructureResponse {
  export type Type = ErrorResponse | SuccessResponse;

  interface ErrorResponse {
    responseType: 'error';
    responseData: ErrorResponseData;
  }

  interface SuccessResponse {
    responseType: 'success';
    responseData: SuccessResponseData;
  }

  type SuccessResponseData = {
    schemas: Array<string>;
  };

  type ErrorResponseData = {
    message: string;
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
    onSuccess: (_: SchemaObjects) => U,
    onError: (_: ErrorResponseData) => U
  ) {
    if (response.responseType === 'error') {
      return onError(response.responseData);
    } else if (response.responseType === 'success') {
      const { responseData } = response;
      const schemas = responseData.schemas;
      const schemaObjects: SchemaObjects = {
        schemas
      };
      return onSuccess(schemaObjects);
    }
  }
}

namespace Private {
  export function createErrorResponse(
    responseStatus: number
  ): SchemaStructureResponse.Type {
    if (responseStatus === 404) {
      return SchemaStructureResponse.createNotFoundError();
    } else {
      const errorMessage = 'Unexpected response status from server';
      return SchemaStructureResponse.createError(errorMessage);
    }
  }
}
