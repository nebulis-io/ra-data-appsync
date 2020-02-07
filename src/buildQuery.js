import { GET_LIST, GET_ONE, CREATE, UPDATE, DELETE } from 'ra-core';
import gql from 'graphql-tag';

const getReferenceTable = (resourceName) => {
    return {
        GET_ONE: `get${resourceName}`,
        GET_LIST: `list${resourceName}s`,
        CREATE: `create${resourceName}`,
        UPDATE: `update${resourceName}`,
        DELETE: `delete${resourceName}`
    };
}

const prepareVariables = (fetchType) => {
    return {
        GET_ONE: params => params,
        GET_LIST: params => {
            return {
                filter: null,
                limit: null,
                nextToken: null
            }
        },
        CREATE: params => {
            const {...newParams} = params.data
            return {
                input: newParams
            }
        },
        UPDATE: params => {
            const {__typename, ...input} = params.data
            return {
                input
            }
        },
        DELETE: params => {
            const {previousData, ...input} = params
            return {
                input
            }
        },
    }[fetchType]
}

const makeResponseParser = (fetchType) => {
    return {
        GET_ONE: response => response.data,
        CREATE: response => response.data,
        UPDATE: response => response.data,
        DELETE: response => response.data,
        GET_LIST: response => {
            return {
                data: response.data.data.items,
                total: response.data.data.items.length
            }
        },
    }[fetchType]
}

const buildField = (introspectionResults, field) => {
    if (field.__typename == "__Type") {
        const type = introspectionResults.types.find(o => o.name == field.name);
        let result = ""
        for (const field of type.fields) {
            result += buildField(introspectionResults, field)
        }
        return result
    } else if ((field.type.name == null && field.type.ofType.kind == "SCALAR") || (field.type.kind == "SCALAR")) {
        return field.name + ",\n"
    } else if (field.type.name == null) {
        return field.name + "{\n" + buildField(introspectionResults, field.type.ofType) + "}\n"
    }
}

const buildQueryFields = (introspectionResults, query) => {
    const type = introspectionResults.types.find(o => o.name == query.type.name);
    let result = ""
    for (const field of type.fields) {
      result += buildField(introspectionResults, field)
    }
    return result
};

const buildArgs = query => {
    const args = query.args;
    let queryVariables = "";
    let queryParameters = "";
    for (const arg of args) {
        queryVariables += `$${arg.name}: ${arg.type.name ? arg.type.name : arg.type.ofType.name}${arg.type.kind == "NON_NULL" ? "!" : ""},`
        queryParameters += `${arg.name}: $${arg.name},`
    }
    return {
        queryVariables,
        queryParameters
    }
};

const getQuery = (introspectionResults, fetchType, resourceName) => {
    return introspectionResults.queries.find(
        r => r.name == getReferenceTable(resourceName)[fetchType]
    );
}

const buildQuery = introspection => (raFetchType, resourceName, params) => {

    const queryType = {
      GET_ONE: 'query',
      GET_LIST: 'query',
      CREATE: 'mutation',
      UPDATE: 'mutation',
      DELETE: 'mutation'
    }

    const query = getQuery(introspection, raFetchType, resourceName);

    return {
      query: gql`${queryType[raFetchType]} ${getReferenceTable(resourceName)[raFetchType]}(${buildArgs(query).queryVariables}) {
        data: ${getReferenceTable(resourceName)[raFetchType]}(${buildArgs(query).queryParameters}) {
          ${buildQueryFields(introspection, query)}
        }
      }`,
      variables: prepareVariables(raFetchType)(params),
      parseResponse: makeResponseParser(raFetchType)
    }
};

export default buildQuery;